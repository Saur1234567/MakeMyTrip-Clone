import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, Lock, CreditCard, AlertCircle, ChevronRight,
  Shield, Calendar, Users, Building2,
  Smartphone, Wallet, Landmark, Tag, X, Check, Gift, Loader2
} from 'lucide-react'
import { format } from 'date-fns'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import {
  useGetBookingDetailQuery,
  useValidateCouponMutation,
  useGetAvailableCouponsQuery,
  CouponValidateResponse,
} from '@/store/api/bookingApi'
import axiosInstance from '@/lib/axios'
import {
  PaymentMethod,
  StripeCardForm, UpiForm, WalletForm, NetBankingForm, CodForm,
} from './PaymentComponents'

// ─── Stripe ───────────────────────────────────────────────────────────────────
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '')

// ─── Payment Method Tabs Config ───────────────────────────────────────────────
const PAYMENT_TABS: { id: PaymentMethod; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'card',       label: 'Card',        icon: <CreditCard size={18} />,  color: 'blue'   },
  { id: 'upi',        label: 'UPI',         icon: <Smartphone size={18} />,  color: 'purple' },
  { id: 'wallet',     label: 'Wallet',      icon: <Wallet size={18} />,      color: 'green'  },
  { id: 'netbanking', label: 'Net Banking', icon: <Landmark size={18} />,    color: 'indigo' },
  { id: 'cod',        label: 'Pay Later',   icon: <Clock size={18} />,       color: 'amber'  },
]

const TAB_ACTIVE_CLASSES: Record<string, string> = {
  blue:   'border-blue-500   bg-blue-50   text-blue-700',
  purple: 'border-purple-500 bg-purple-50 text-purple-700',
  green:  'border-green-500  bg-green-50  text-green-700',
  indigo: 'border-indigo-500 bg-indigo-50 text-indigo-700',
  amber:  'border-amber-500  bg-amber-50  text-amber-700',
}

// ─── Scope badge ──────────────────────────────────────────────────────────────
function ScopeBadge({ scope, city, roomType }: { scope?: string; city?: string; roomType?: string }) {
  if (!scope || scope === 'UNIVERSAL') return null
  const labels: Record<string, string> = {
    HOTEL: '🏨 Hotel exclusive',
    CITY: `📍 ${city || 'City'} only`,
    ROOM_TYPE: `🛏 ${roomType || 'Room type'} only`,
  }
  return (
    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
      {labels[scope] || scope}
    </span>
  )
}

// ─── Countdown Timer ──────────────────────────────────────────────────────────
function CountdownTimer({ expiresAt, onExpire }: { expiresAt: string; onExpire: () => void }) {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const calc = () => Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
    setSeconds(calc())
    const iv = setInterval(() => {
      const r = calc()
      setSeconds(r)
      if (r === 0) { clearInterval(iv); onExpire() }
    }, 1000)
    return () => clearInterval(iv)
  }, [expiresAt, onExpire])
  const mins = Math.floor(seconds / 60), secs = seconds % 60
  if (seconds === 0) return null
  const urgent = seconds < 120
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold ${urgent ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
      <Clock size={14} />
      <span className="font-black tabular-nums">{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</span>
    </div>
  )
}

// ─── Main Inner Component (needs Stripe context) ──────────────────────────────
function PaymentPageInner() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const bookingRef = searchParams.get('bookingRef') || searchParams.get('ref') || ''

  // ── Booking data ──
  const { data: bookingResp, isLoading: bookingLoading, isError: bookingError } =
    useGetBookingDetailQuery(bookingRef, { skip: !bookingRef })
  const booking = bookingResp?.data

  // ── Client secret ──
  // BookingResponse already carries paymentIntentClientSecret when a Payment row exists.
  // If it's absent (first visit), we call POST /create-intent to create one.
  const [clientSecret, setClientSecret] = useState('')
  const [csLoading, setCsLoading] = useState(false)
  const [csError, setCsError] = useState('')

  useEffect(() => {
    if (!bookingRef || !booking) return

    // 1. Use the secret already embedded in the booking response
    const embedded = (booking as any).paymentIntentClientSecret
    if (embedded) {
      setClientSecret(embedded)
      return
    }

    // 2. Otherwise create a new payment intent
    setCsLoading(true); setCsError('')
    axiosInstance.post('/api/v1/payments/create-intent', { bookingRef })
      .then(r => setClientSecret(r.data?.data?.clientSecret || r.data?.clientSecret || ''))
      .catch(e => setCsError(e?.response?.data?.message || 'Could not load payment session.'))
      .finally(() => setCsLoading(false))
  }, [bookingRef, booking])

  // ── Payment method ──
  const [method, setMethod] = useState<PaymentMethod>('card')
  const [selectedBank, setSelectedBank] = useState<string | null>(null)
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null)
  const [selectedUpiApp, setSelectedUpiApp] = useState<string | null>(null)

  const switchMethod = (m: PaymentMethod) => {
    setMethod(m)
    setSelectedBank(null); setSelectedWallet(null); setSelectedUpiApp(null)
    removeCoupon()
  }

  // ── Available coupons from backend ──
  const { data: availableCouponsResp, isLoading: couponsLoading } =
    useGetAvailableCouponsQuery(bookingRef, { skip: !bookingRef })
  const availableCoupons: CouponValidateResponse[] = availableCouponsResp?.data ?? []

  // ── Coupon — server-validated ──
  const [couponInput, setCouponInput] = useState('')
  const [couponError, setCouponError] = useState('')
  const [showCoupons, setShowCoupons] = useState(false)
  const [serverCoupon, setServerCoupon] = useState<CouponValidateResponse | null>(null)
  const [validateCoupon, { isLoading: validating }] = useValidateCouponMutation()

  const totalAmount: number = booking?.totalAmount ?? 0
  const discountAmount: number = serverCoupon ? Math.round(serverCoupon.discountAmount) : 0
  const finalAmount: number = serverCoupon ? Math.round(serverCoupon.finalAmount) : totalAmount

  const applyCoupon = useCallback(async (code: string) => {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return
    setCouponError('')
    try {
      const result = await validateCoupon({
        code: trimmed,
        bookingRef,
        paymentMethod: method,
        hotelId: booking?.hotelId ? String(booking.hotelId) : undefined,
        city: booking?.hotelCity || undefined,
        roomType: booking?.roomTypeName || undefined,
        selectedBank: selectedBank || undefined,
        selectedWallet: selectedWallet || undefined,
        selectedUpiApp: selectedUpiApp || undefined,
      }).unwrap()
      setServerCoupon(result.data)
      setCouponInput(trimmed)
      setShowCoupons(false)
    } catch (err: any) {
      const msg = err?.data?.message || err?.data?.error || 'Invalid or inapplicable coupon code.'
      setCouponError(msg)
      setServerCoupon(null)
    }
  }, [bookingRef, method, booking, selectedBank, selectedWallet, selectedUpiApp, validateCoupon])

  const removeCoupon = () => {
    setServerCoupon(null); setCouponInput(''); setCouponError('')
  }

  // ── Non-Stripe payment confirm ──
  const handleNonStripeSuccess = useCallback(async () => {
    try {
      await axiosInstance.post('/api/v1/payments/confirm', {
        bookingRef,
        paymentIntentId: null,
        couponCode: serverCoupon?.code || undefined,
      })
    } catch (e) { console.warn('Backend confirm failed:', e) }
    navigate(`/booking/confirmation?bookingRef=${bookingRef}`)
  }, [bookingRef, serverCoupon, navigate])

  // ── Stripe success ──
  const handleStripeSuccess = useCallback(() => {
    navigate(`/booking/confirmation?bookingRef=${bookingRef}`)
  }, [bookingRef, navigate])

  const handleExpire = useCallback(() => navigate('/'), [navigate])

  // ── Loading / Error states ──
  if (!bookingRef) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">No booking reference</h2>
          <p className="text-gray-500 mb-4">Please start a new booking.</p>
          <button onClick={() => navigate('/')} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors">Go Home</button>
        </div>
      </div>
    )
  }

  if (bookingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Loading payment details...</p>
        </div>
      </div>
    )
  }

  if (bookingError || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Booking not found</h2>
          <p className="text-gray-500 mb-4">We couldn't load your booking details.</p>
          <button onClick={() => navigate('/')} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors">Go Home</button>
        </div>
      </div>
    )
  }

  const nights = booking.checkIn && booking.checkOut
    ? Math.max(1, Math.round((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / 86400000))
    : 1

  const activeTab = PAYMENT_TABS.find(t => t.id === method)!

  return (
    <>
      <Helmet>
        <title>Complete Payment — MakeMyCrip</title>
      </Helmet>

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 transition-colors">
              <ChevronRight size={20} className="rotate-180" />
            </button>
            <div>
              <h1 className="font-black text-gray-900 text-base leading-tight">Complete Payment</h1>
              <p className="text-xs text-gray-400">{bookingRef}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {booking.paymentExpiresAt && (
              <CountdownTimer expiresAt={booking.paymentExpiresAt} onExpire={handleExpire} />
            )}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500">
              <Lock size={12} className="text-green-500" />
              <span>256-bit SSL</span>
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="max-w-6xl mx-auto px-4 pb-3">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="flex items-center gap-1 text-green-600 font-semibold"><Check size={12} /> Search</span>
            <div className="flex-1 h-px bg-green-200" />
            <span className="flex items-center gap-1 text-green-600 font-semibold"><Check size={12} /> Details</span>
            <div className="flex-1 h-px bg-green-200" />
            <span className="flex items-center gap-1 text-blue-600 font-bold"><span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">3</span> Payment</span>
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-gray-300">Confirmation</span>
          </div>
        </div>
      </div>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 py-6">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* ══════════════════════════════════════════════════════════════
                LEFT COLUMN — Payment Methods + Coupons
            ══════════════════════════════════════════════════════════════ */}
            <div className="lg:col-span-3 space-y-4">

              {/* ── Payment Method Tabs ── */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <h2 className="font-black text-gray-900 text-base">Choose Payment Method</h2>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-5 gap-2 mb-5">
                    {PAYMENT_TABS.map(tab => {
                      const isActive = method === tab.id
                      const activeClass = isActive ? TAB_ACTIVE_CLASSES[tab.color] : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                      return (
                        <button key={tab.id} onClick={() => switchMethod(tab.id)}
                          className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl border-2 transition-all font-semibold text-xs ${activeClass}`}>
                          {tab.icon}
                          <span className="leading-tight text-center">{tab.label}</span>
                        </button>
                      )
                    })}
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div key={method}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.2 }}>
                      {method === 'card' && (
                        <StripeCardForm
                          bookingRef={bookingRef}
                          finalAmount={finalAmount}
                          clientSecret={clientSecret}
                          couponCode={serverCoupon?.code || ''}
                          onSuccess={handleStripeSuccess}
                        />
                      )}
                      {method === 'upi' && (
                        <UpiForm
                          finalAmount={finalAmount}
                          onAppSelect={app => { setSelectedUpiApp(app); if (serverCoupon) removeCoupon() }}
                          onSuccess={handleNonStripeSuccess}
                        />
                      )}
                      {method === 'wallet' && (
                        <WalletForm
                          finalAmount={finalAmount}
                          onWalletSelect={w => { setSelectedWallet(w); if (serverCoupon) removeCoupon() }}
                          onSuccess={handleNonStripeSuccess}
                        />
                      )}
                      {method === 'netbanking' && (
                        <NetBankingForm
                          finalAmount={finalAmount}
                          onBankSelect={b => { setSelectedBank(b); if (serverCoupon) removeCoupon() }}
                          onSuccess={handleNonStripeSuccess}
                        />
                      )}
                      {method === 'cod' && (
                        <CodForm
                          finalAmount={finalAmount}
                          onSuccess={handleNonStripeSuccess}
                        />
                      )}
                    </motion.div>
                  </AnimatePresence>

                  {csError && (
                    <div className="mt-3 flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm">
                      <AlertCircle size={16} /> {csError}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Coupon Section ── */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag size={16} className="text-blue-600" />
                    <h2 className="font-black text-gray-900 text-base">Coupons & Offers</h2>
                    {availableCoupons.length > 0 && !couponsLoading && (
                      <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {availableCoupons.length}
                      </span>
                    )}
                  </div>
                  <button onClick={() => setShowCoupons(v => !v)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                    <Gift size={14} />
                    {showCoupons ? 'Hide offers' : 'View available offers'}
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  {/* Coupon input or applied coupon */}
                  {!serverCoupon ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError('') }}
                        onKeyDown={e => e.key === 'Enter' && applyCoupon(couponInput)}
                        placeholder="Enter coupon code"
                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-mono font-semibold uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:font-normal placeholder:normal-case"
                      />
                      <button onClick={() => applyCoupon(couponInput)}
                        disabled={!couponInput.trim() || validating}
                        className="px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-xl transition-all text-sm min-w-[80px] flex items-center justify-center">
                        {validating ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Apply'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Check size={16} className="text-green-600 shrink-0" />
                        <span className="font-black font-mono text-green-800">{serverCoupon.code}</span>
                        <span className="text-sm text-green-700">— {serverCoupon.label}</span>
                        <ScopeBadge scope={serverCoupon.scope} city={booking.hotelCity} roomType={booking.roomTypeName} />
                      </div>
                      <button onClick={removeCoupon} className="text-gray-400 hover:text-red-500 transition-colors ml-2 shrink-0">
                        <X size={16} />
                      </button>
                    </div>
                  )}

                  {/* Feedback messages */}
                  <AnimatePresence>
                    {couponError && (
                      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-2.5 text-sm">
                        <AlertCircle size={14} /> {couponError}
                      </motion.div>
                    )}
                    {serverCoupon && (
                      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 rounded-xl px-4 py-2.5 text-sm font-semibold">
                        <Check size={14} /> 🎉 {serverCoupon.label} applied! You save ₹{discountAmount.toLocaleString('en-IN')}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Available coupons list from backend */}
                  <AnimatePresence>
                    {showCoupons && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden">
                        <div className="pt-2 space-y-2">
                          {couponsLoading ? (
                            <div className="flex items-center justify-center py-6 gap-2 text-gray-400 text-sm">
                              <Loader2 size={16} className="animate-spin" />
                              Loading available offers...
                            </div>
                          ) : availableCoupons.length === 0 ? (
                            <div className="text-center py-4 text-sm text-gray-400">
                              No special offers available for this booking right now.
                            </div>
                          ) : (
                            <>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                {availableCoupons.length} offer{availableCoupons.length !== 1 ? 's' : ''} available for your booking
                              </p>
                              {availableCoupons.map(c => (
                                <div key={c.code} className="flex items-start justify-between p-3 rounded-xl border border-gray-200 bg-gray-50 gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                      <span className="font-black text-sm font-mono bg-white border border-dashed border-gray-300 px-2 py-0.5 rounded text-gray-800">
                                        {c.code}
                                      </span>
                                      <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                                        {c.label}
                                      </span>
                                      <ScopeBadge scope={c.scope} city={booking.hotelCity} roomType={booking.roomTypeName} />
                                    </div>
                                    <p className="text-xs text-gray-500 truncate">{c.description}</p>
                                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                                      {c.minBookingAmount != null && (
                                        <span className="text-xs text-gray-400">Min ₹{Number(c.minBookingAmount).toLocaleString('en-IN')}</span>
                                      )}
                                      {c.applicablePaymentMethods && c.applicablePaymentMethods !== 'all' && (
                                        <span className="text-xs text-gray-400 capitalize">
                                          {c.applicablePaymentMethods.replace(/,/g, ' / ')} only
                                        </span>
                                      )}
                                      <span className="text-xs font-semibold text-blue-700">
                                        Save ₹{Math.round(c.discountAmount).toLocaleString('en-IN')}
                                      </span>
                                    </div>
                                  </div>
                                  <button onClick={() => applyCoupon(c.code)} disabled={validating}
                                    className="shrink-0 text-xs font-bold text-blue-600 hover:text-blue-800 border border-blue-300 hover:border-blue-500 px-3 py-1.5 rounded-lg transition-all bg-white hover:bg-blue-50 disabled:opacity-50">
                                    APPLY
                                  </button>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* ── Trust Badges ── */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: <Shield size={18} className="text-green-600" />, title: '100% Secure', sub: 'SSL encrypted' },
                  { icon: <Lock size={18} className="text-blue-600" />, title: 'Safe Payments', sub: 'PCI DSS compliant' },
                  { icon: <Check size={18} className="text-purple-600" />, title: 'Instant Confirm', sub: 'Real-time booking' },
                ].map(b => (
                  <div key={b.title} className="bg-white rounded-xl border border-gray-100 p-3 flex flex-col items-center text-center gap-1.5 shadow-sm">
                    {b.icon}
                    <span className="text-xs font-bold text-gray-800">{b.title}</span>
                    <span className="text-xs text-gray-400">{b.sub}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                RIGHT COLUMN — Order Summary
            ══════════════════════════════════════════════════════════════ */}
            <div className="lg:col-span-2 space-y-4">

              {/* ── Booking Summary Card ── */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                      <Building2 size={20} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-base leading-tight truncate">{booking.hotelName}</h3>
                      <p className="text-blue-100 text-xs mt-0.5 truncate">{booking.roomTypeName}</p>
                      {booking.hotelCity && (
                        <p className="text-blue-200 text-xs mt-0.5">📍 {booking.hotelCity}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                        <Calendar size={12} /> Check-in
                      </div>
                      <div className="font-bold text-gray-900 text-sm">
                        {booking.checkIn ? format(new Date(booking.checkIn), 'dd MMM yyyy') : '—'}
                      </div>
                      <div className="text-xs text-gray-400">After 2:00 PM</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                        <Calendar size={12} /> Check-out
                      </div>
                      <div className="font-bold text-gray-900 text-sm">
                        {booking.checkOut ? format(new Date(booking.checkOut), 'dd MMM yyyy') : '—'}
                      </div>
                      <div className="text-xs text-gray-400">Before 12:00 PM</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2.5">
                    <Users size={14} className="text-gray-400" />
                    <span>{booking.adults} adult{booking.adults !== 1 ? 's' : ''}{booking.children ? `, ${booking.children} child${booking.children !== 1 ? 'ren' : ''}` : ''}</span>
                    <span className="mx-1 text-gray-300">·</span>
                    <span className="font-semibold text-blue-700">{nights} night{nights !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>

              {/* ── Price Breakdown ── */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-black text-gray-900 text-base">Price Breakdown</h3>
                </div>
                <div className="p-4 space-y-2.5">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Room charges ({nights} night{nights !== 1 ? 's' : ''})</span>
                    <span className="font-semibold">₹{(booking.baseAmount ?? totalAmount).toLocaleString('en-IN')}</span>
                  </div>
                  {booking.addOns && booking.addOns.length > 0 && booking.addOns.map((ao: any) => {
                    const price = Number(ao.totalPrice ?? ao.unitPrice ?? 0)
                    if (price <= 0) return null
                    const label = String(ao.addOnType ?? ao.type ?? '').replace(/_/g, ' ')
                    return (
                      <div key={ao.id ?? ao.addOnType ?? ao.type} className="flex justify-between text-sm text-gray-600">
                        <span className="capitalize">{label.toLowerCase()}</span>
                        <span className="font-semibold">₹{price.toLocaleString('en-IN')}</span>
                      </div>
                    )
                  })}
                  {booking.taxAmount != null && Number(booking.taxAmount) > 0 && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Taxes &amp; fees</span>
                      <span className="font-semibold">₹{Number(booking.taxAmount).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {booking.convenienceFee != null && Number(booking.convenienceFee) > 0 && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Convenience fee</span>
                      <span className="font-semibold">₹{Number(booking.convenienceFee).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600 font-semibold">
                      <span className="flex items-center gap-1"><Tag size={12} /> Coupon ({serverCoupon?.code})</span>
                      <span>−₹{discountAmount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="border-t border-dashed border-gray-200 pt-2.5 mt-1">
                    <div className="flex justify-between items-center">
                      <span className="font-black text-gray-900 text-base">Total Payable</span>
                      <div className="text-right">
                        {discountAmount > 0 && (
                          <div className="text-xs text-gray-400 line-through">₹{totalAmount.toLocaleString('en-IN')}</div>
                        )}
                        <div className="font-black text-xl text-blue-700">₹{finalAmount.toLocaleString('en-IN')}</div>
                      </div>
                    </div>
                    {discountAmount > 0 && (
                      <div className="mt-1.5 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 text-xs text-green-700 font-semibold text-center">
                        🎉 You're saving ₹{discountAmount.toLocaleString('en-IN')} on this booking!
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Booking Ref ── */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Booking Reference</span>
                  <span className="font-black font-mono text-gray-900 tracking-wide">{bookingRef}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-500">Payment Method</span>
                  <span className="font-semibold text-gray-700 capitalize flex items-center gap-1.5">
                    {activeTab.icon}
                    {activeTab.label}
                  </span>
                </div>
              </div>

              {/* ── Cancellation Policy ── */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800 space-y-1">
                <p className="font-bold text-sm">Cancellation Policy</p>
                <p>Free cancellation up to 24 hours before check-in. After that, 1 night charge applies.</p>
              </div>
            </div>
            {/* end right column */}

          </div>
        </div>
      </div>
    </>
  )
}

// ─── Exported Page (wraps with Stripe Elements) ───────────────────────────────
export default function BookingPaymentPage() {
  return (
    <Elements stripe={stripePromise}>
      <PaymentPageInner />
    </Elements>
  )
}
