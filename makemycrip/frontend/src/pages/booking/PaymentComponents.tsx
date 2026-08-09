// Payment sub-components for BookingPaymentPage
// NOTE: All coupon discount logic has been moved to the backend.
// The frontend only displays the discountAmount returned by POST /api/v1/coupons/validate.
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, AlertCircle, Smartphone, Wallet, Check, X, Info } from 'lucide-react'
import {
  CardNumberElement, CardExpiryElement, CardCvcElement,
  useStripe, useElements,
} from '@stripe/react-stripe-js'
import axiosInstance from '@/lib/axios'

// ─── Types ────────────────────────────────────────────────────────────────────
export type PaymentMethod = 'card' | 'upi' | 'wallet' | 'netbanking' | 'cod'

// ─── Stripe Card Form ─────────────────────────────────────────────────────────
const STRIPE_STYLE = {
  style: {
    base: { fontSize: '15px', fontFamily: '"Inter", sans-serif', color: '#111827', '::placeholder': { color: '#9CA3AF' } },
    invalid: { color: '#EF4444' },
  },
}

// ─── Card Preview ─────────────────────────────────────────────────────────────
export function CardPreview({ name, focused }: { name: string; focused: string | null }) {
  const isFlipped = focused === 'cvc'
  return (
    <div className="relative w-full h-40 mb-4" style={{ perspective: '1000px' }}>
      <motion.div className="relative w-full h-full"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.5, type: 'spring', stiffness: 80 }}
        style={{ transformStyle: 'preserve-3d' }}>
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 p-5 shadow-2xl text-white"
          style={{ backfaceVisibility: 'hidden' }}>
          <div className="flex justify-between items-start mb-5">
            <div className="w-9 h-6 bg-yellow-300 rounded-sm opacity-90" />
            <div className="flex gap-1">
              <div className="w-6 h-6 rounded-full bg-red-500 opacity-80" />
              <div className="w-6 h-6 rounded-full bg-yellow-400 opacity-80 -ml-2" />
            </div>
          </div>
          <div className={`font-mono text-base tracking-widest mb-4 transition-colors ${focused === 'number' ? 'text-yellow-300' : 'text-white/90'}`}>
            •••• •••• •••• ••••
          </div>
          <div className="flex justify-between items-end">
            <div>
              <div className="text-xs opacity-50 mb-0.5">Card Holder</div>
              <div className={`text-sm font-semibold uppercase tracking-wide truncate max-w-[160px] transition-colors ${focused === 'name' ? 'text-yellow-300' : 'text-white'}`}>
                {name || 'YOUR NAME'}
              </div>
            </div>
            <div>
              <div className="text-xs opacity-50 mb-0.5">Expires</div>
              <div className={`text-sm font-semibold transition-colors ${focused === 'expiry' ? 'text-yellow-300' : 'text-white'}`}>MM/YY</div>
            </div>
          </div>
        </div>
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 shadow-2xl"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
          <div className="w-full h-10 bg-black/40 mt-6" />
          <div className="px-5 mt-4">
            <div className="text-xs text-white/60 mb-1">CVV</div>
            <div className="bg-white/20 rounded px-3 py-2 font-mono text-yellow-300 tracking-widest text-sm w-20">•••</div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

/**
 * StripeCardForm
 * finalAmount: server-validated final payable amount (after coupon discount from backend)
 * couponCode:  the coupon code string to send to /confirm (server re-validates at this point)
 */
export function StripeCardForm({ bookingRef, finalAmount, clientSecret, couponCode, onSuccess }: {
  bookingRef: string
  finalAmount: number
  clientSecret: string
  couponCode: string
  onSuccess: () => void
}) {
  const stripe = useStripe(); const elements = useElements()
  const [error, setError] = useState(''); const [processing, setProcessing] = useState(false)
  const [cardName, setCardName] = useState(''); const [focused, setFocused] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    if (!clientSecret) { setError('Payment session not ready. Please refresh.'); return }
    setError(''); setProcessing(true)
    try {
      const cardEl = elements.getElement(CardNumberElement)
      if (!cardEl) { setProcessing(false); return }
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: cardEl, billing_details: { name: cardName || undefined } },
      })
      if (stripeError) { setError(stripeError.message || 'Payment failed.'); setProcessing(false); return }
      if (paymentIntent?.status === 'succeeded') {
        try {
          // Send coupon CODE (not amount) — server re-validates and redeems
          await axiosInstance.post('/api/v1/payments/confirm', {
            bookingRef,
            paymentIntentId: paymentIntent.id,
            couponCode: couponCode || undefined,
          })
        } catch (e) { console.warn('Backend confirm failed (webhook will handle):', e) }
        onSuccess()
      } else { setError(`Unexpected status: ${paymentIntent?.status}`); setProcessing(false) }
    } catch (err: any) { setError(err?.response?.data?.message || 'Payment failed.'); setProcessing(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <CardPreview name={cardName} focused={focused} />
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Card Number</label>
        <div className={`px-4 py-3.5 border-2 rounded-xl bg-white transition-all ${focused === 'number' ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'}`}
          onFocus={() => setFocused('number')} onBlur={() => setFocused(null)}>
          <CardNumberElement options={STRIPE_STYLE} />
        </div>
        <p className="text-xs text-gray-400 mt-1">Test: <span className="font-mono font-semibold text-gray-600">4242 4242 4242 4242</span></p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Expiry Date</label>
          <div className={`px-4 py-3.5 border-2 rounded-xl bg-white transition-all ${focused === 'expiry' ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'}`}
            onFocus={() => setFocused('expiry')} onBlur={() => setFocused(null)}>
            <CardExpiryElement options={STRIPE_STYLE} />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1 mb-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">CVV</label>
            <span className="group relative cursor-pointer">
              <Info size={11} className="text-gray-400" />
              <span className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">3-digit code on back</span>
            </span>
          </div>
          <div className={`px-4 py-3.5 border-2 rounded-xl bg-white transition-all ${focused === 'cvc' ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'}`}
            onFocus={() => setFocused('cvc')} onBlur={() => setFocused(null)}>
            <CardCvcElement options={STRIPE_STYLE} />
          </div>
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Cardholder Name</label>
        <input type="text" value={cardName} onChange={e => setCardName(e.target.value.toUpperCase())}
          onFocus={() => setFocused('name')} onBlur={() => setFocused(null)}
          placeholder="AS ON CARD"
          className={`w-full px-4 py-3.5 border-2 rounded-xl bg-white text-sm font-medium uppercase tracking-wide transition-all outline-none ${focused === 'name' ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'}`} />
      </div>
      {error && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm">
          <AlertCircle size={16} /> {error}
        </motion.div>
      )}
      <button type="submit" disabled={!stripe || processing}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-300 disabled:to-blue-300 text-white font-black py-4 rounded-xl transition-all text-base shadow-lg shadow-blue-200">
        {processing
          ? <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
          : <><Lock size={18} /> Pay ₹{finalAmount.toLocaleString('en-IN')} Securely</>}
      </button>
    </form>
  )
}

// ─── UPI Form ─────────────────────────────────────────────────────────────────
export const UPI_APPS = [
  { id: 'gpay', name: 'Google Pay', gradient: 'from-blue-500 to-green-500', letter: 'G' },
  { id: 'phonepe', name: 'PhonePe', gradient: 'from-purple-600 to-purple-800', letter: 'P' },
  { id: 'paytm', name: 'Paytm', gradient: 'from-blue-400 to-blue-600', letter: 'P' },
  { id: 'bhim', name: 'BHIM', gradient: 'from-orange-500 to-red-600', letter: 'B' },
  { id: 'amazon', name: 'Amazon Pay', gradient: 'from-yellow-400 to-orange-500', letter: 'A' },
]

export function UpiForm({ onSuccess, finalAmount, onAppSelect }: {
  onSuccess: () => void; finalAmount: number; onAppSelect: (app: string | null) => void
}) {
  const [selectedApp, setSelectedApp] = useState<string | null>(null)
  const [upiId, setUpiId] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  const selectApp = (id: string) => {
    const next = selectedApp === id ? null : id
    setSelectedApp(next); setUpiId(''); onAppSelect(next)
  }
  const handlePay = async () => {
    if (!selectedApp && !upiId.trim()) { setError('Please select a UPI app or enter UPI ID'); return }
    if (upiId && !/^[\w.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upiId)) { setError('Invalid UPI ID format (e.g. name@upi)'); return }
    setError(''); setProcessing(true)
    await new Promise(r => setTimeout(r, 2000))
    setProcessing(false); onSuccess()
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-2">
        {UPI_APPS.map(app => (
          <button key={app.id} onClick={() => selectApp(app.id)}
            className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all ${selectedApp === app.id ? 'border-purple-500 bg-purple-50 shadow-sm' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${app.gradient} flex items-center justify-center text-white font-black text-sm shadow-md`}>{app.letter}</div>
            <span className="text-xs text-gray-600 font-medium text-center leading-tight">{app.name}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium">OR ENTER UPI ID</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>
      <input type="text" value={upiId}
        onChange={e => { setUpiId(e.target.value); setSelectedApp(null); onAppSelect(null) }}
        placeholder="yourname@upi"
        className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all" />
      {error && <div className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm"><AlertCircle size={16} /> {error}</div>}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-xs text-purple-700 flex items-start gap-2">
        <Smartphone size={14} className="shrink-0 mt-0.5" />
        <span>You'll receive a payment request on your UPI app. Complete within 5 minutes.</span>
      </div>
      <button onClick={handlePay} disabled={processing}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:opacity-60 text-white font-black py-4 rounded-xl transition-all text-base shadow-lg shadow-purple-200">
        {processing
          ? <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending Request...</>
          : <><Smartphone size={18} /> Pay ₹{finalAmount.toLocaleString('en-IN')} via UPI</>}
      </button>
    </div>
  )
}

// ─── Wallet Form ──────────────────────────────────────────────────────────────
export const WALLETS = [
  { id: 'paytm', name: 'Paytm Wallet', gradient: 'from-blue-400 to-blue-600', balance: '₹1,240' },
  { id: 'amazon', name: 'Amazon Pay', gradient: 'from-yellow-400 to-orange-500', balance: '₹580' },
  { id: 'mobikwik', name: 'MobiKwik', gradient: 'from-blue-500 to-indigo-600', balance: '₹320' },
  { id: 'freecharge', name: 'Freecharge', gradient: 'from-green-400 to-green-600', balance: '₹150' },
  { id: 'airtel', name: 'Airtel Money', gradient: 'from-red-500 to-red-700', balance: '₹890' },
]

export function WalletForm({ onSuccess, finalAmount, onWalletSelect }: {
  onSuccess: () => void; finalAmount: number; onWalletSelect: (w: string | null) => void
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  const select = (id: string) => { setSelected(id); onWalletSelect(id) }
  const handlePay = async () => {
    if (!selected) { setError('Please select a wallet'); return }
    setError(''); setProcessing(true)
    await new Promise(r => setTimeout(r, 2000))
    setProcessing(false); onSuccess()
  }

  return (
    <div className="space-y-3">
      {WALLETS.map(w => (
        <button key={w.id} onClick={() => select(w.id)}
          className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${selected === w.id ? 'border-green-500 bg-green-50 shadow-sm' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${w.gradient} flex items-center justify-center text-white font-black text-sm shadow-md`}>{w.name[0]}</div>
            <div className="text-left">
              <div className="font-semibold text-gray-800 text-sm">{w.name}</div>
              <div className="text-xs text-gray-400">Balance: {w.balance}</div>
            </div>
          </div>
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selected === w.id ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
            {selected === w.id && <Check size={12} className="text-white" />}
          </div>
        </button>
      ))}
      {error && <div className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm"><AlertCircle size={16} /> {error}</div>}
      <button onClick={handlePay} disabled={processing || !selected}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:opacity-60 text-white font-black py-4 rounded-xl transition-all text-base shadow-lg shadow-green-200">
        {processing
          ? <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
          : <><Wallet size={18} /> Pay ₹{finalAmount.toLocaleString('en-IN')} via Wallet</>}
      </button>
    </div>
  )
}

// ─── Net Banking Form ─────────────────────────────────────────────────────────
export const BANKS = [
  { id: 'SBI', name: 'State Bank of India', color: 'bg-blue-700' },
  { id: 'HDFC', name: 'HDFC Bank', color: 'bg-red-600' },
  { id: 'ICICI', name: 'ICICI Bank', color: 'bg-orange-600' },
  { id: 'AXIS', name: 'Axis Bank', color: 'bg-purple-700' },
  { id: 'KOTAK', name: 'Kotak Mahindra', color: 'bg-red-700' },
  { id: 'PNB', name: 'Punjab National', color: 'bg-orange-700' },
  { id: 'BOB', name: 'Bank of Baroda', color: 'bg-orange-500' },
  { id: 'CANARA', name: 'Canara Bank', color: 'bg-yellow-600' },
  { id: 'UNION', name: 'Union Bank', color: 'bg-blue-600' },
  { id: 'IDFC', name: 'IDFC First', color: 'bg-teal-600' },
  { id: 'YES', name: 'Yes Bank', color: 'bg-blue-500' },
  { id: 'OTHER', name: 'Other Banks', color: 'bg-gray-500' },
]

export function NetBankingForm({ onSuccess, finalAmount, onBankSelect }: {
  onSuccess: () => void; finalAmount: number; onBankSelect: (b: string | null) => void
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  const filtered = BANKS.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) || b.id.toLowerCase().includes(search.toLowerCase())
  )
  const select = (id: string) => { setSelected(id); onBankSelect(id) }
  const handlePay = async () => {
    if (!selected) { setError('Please select a bank'); return }
    setError(''); setProcessing(true)
    await new Promise(r => setTimeout(r, 2000))
    setProcessing(false); onSuccess()
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search bank..."
          className="w-full pl-4 pr-10 py-3 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-all" />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
        {filtered.map(bank => (
          <button key={bank.id} onClick={() => select(bank.id)}
            className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${selected === bank.id ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
            <div className={`w-9 h-9 rounded-lg ${bank.color} flex items-center justify-center text-white font-black text-xs shadow-sm`}>
              {bank.id.slice(0, 3)}
            </div>
            <span className="text-xs text-gray-600 font-medium text-center leading-tight">{bank.name}</span>
          </button>
        ))}
      </div>
      {error && <div className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm"><AlertCircle size={16} /> {error}</div>}
      <button onClick={handlePay} disabled={processing || !selected}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-60 text-white font-black py-4 rounded-xl transition-all text-base shadow-lg shadow-blue-200">
        {processing
          ? <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Redirecting to Bank...</>
          : <><Lock size={18} /> Pay ₹{finalAmount.toLocaleString('en-IN')} via Net Banking</>}
      </button>
    </div>
  )
}

// ─── COD Form ─────────────────────────────────────────────────────────────────
export function CodForm({ onSuccess, finalAmount }: { onSuccess: () => void; finalAmount: number }) {
  const [processing, setProcessing] = useState(false)
  const handlePay = async () => {
    setProcessing(true)
    await new Promise(r => setTimeout(r, 1500))
    setProcessing(false); onSuccess()
  }
  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <p className="font-semibold mb-1">Pay at Hotel Counter</p>
        <p className="text-xs">Your booking will be reserved. Pay ₹{finalAmount.toLocaleString('en-IN')} at check-in. Cancellation charges may apply.</p>
      </div>
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center gap-2"><Check size={14} className="text-green-500" /> Instant booking confirmation</div>
        <div className="flex items-center gap-2"><Check size={14} className="text-green-500" /> No online payment required</div>
        <div className="flex items-center gap-2"><Check size={14} className="text-green-500" /> Pay cash or card at hotel</div>
      </div>
      <button onClick={handlePay} disabled={processing}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-60 text-white font-black py-4 rounded-xl transition-all text-base shadow-lg shadow-amber-200">
        {processing
          ? <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Confirming...</>
          : <><Check size={18} /> Reserve Now, Pay at Hotel</>}
      </button>
    </div>
  )
}
