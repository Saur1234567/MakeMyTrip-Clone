import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Calendar, MapPin, Users, Clock, Building2,
  Download, Star, AlertTriangle, CheckCircle, XCircle,
  Phone, Mail, MessageSquare, Plus, X, Loader2
} from 'lucide-react'
import { format } from 'date-fns'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  useGetBookingDetailQuery,
  useGetCancellationPreviewQuery,
  useCancelBookingMutation,
} from '@/store/api/bookingApi'
import { useToggleWishlistMutation } from '@/store/api/hotelApi'
import axiosInstance from '@/lib/axios'

const reviewSchema = z.object({
  overallRating: z.number().min(1).max(10),
  cleanlinessRating: z.number().min(1).max(10).optional(),
  serviceRating: z.number().min(1).max(10).optional(),
  locationRating: z.number().min(1).max(10).optional(),
  valueRating: z.number().min(1).max(10).optional(),
  title: z.string().min(3, 'Add a short title').max(100),
  reviewText: z.string().min(20, 'Write at least 20 characters').max(2000),
  travelType: z.enum(['BUSINESS', 'LEISURE', 'FAMILY', 'COUPLE', 'SOLO']),
})

type ReviewData = z.infer<typeof reviewSchema>

// ─── Star Rating Input ────────────────────────────────────────────────────────

function StarRatingInput({ value, onChange, max = 10 }: {
  value: number
  onChange: (v: number) => void
  max?: number
}) {
  const [hover, setHover] = useState(0)
  const display = max === 5 ? 5 : 10

  return (
    <div className="flex gap-1">
      {Array.from({ length: display }, (_, i) => {
        const val = max === 10 ? i + 1 : i + 1
        const filled = (hover || value) >= val
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(val)}
            onMouseEnter={() => setHover(val)}
            onMouseLeave={() => setHover(0)}
            className="transition-transform hover:scale-110"
          >
            <Star size={max === 10 ? 20 : 16} className={`transition-colors ${filled ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
          </button>
        )
      })}
      {value > 0 && <span className="text-sm text-gray-600 ml-2">{value}/10</span>}
    </div>
  )
}

// ─── Cancel Modal ─────────────────────────────────────────────────────────────

function CancelModal({ bookingRef, onClose, onSuccess }: {
  bookingRef: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [reason, setReason] = useState('')
  const { data: preview, isLoading: previewLoading } = useGetCancellationPreviewQuery(bookingRef)
  const [cancelBooking, { isLoading: cancelling }] = useCancelBookingMutation()

  const handleCancel = async () => {
    if (!reason.trim()) return
    try {
      await cancelBooking({ bookingRef, reason }).unwrap()
      onSuccess()
    } catch {}
  }

  const refundInfo = preview?.data

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" /> Cancel Booking
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {previewLoading ? (
          <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-brand-blue" /></div>
        ) : refundInfo ? (
          <div className={`rounded-xl p-4 mb-4 ${
            refundInfo.refundAmount > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <p className="text-sm font-semibold mb-1">
              {refundInfo.refundAmount > 0
                ? `Refund: ₹${refundInfo.refundAmount.toLocaleString('en-IN')}`
                : 'No refund available'}
            </p>
            <p className="text-xs text-gray-600">{refundInfo.policyDescription}</p>
            {refundInfo.refundAmount > 0 && (
              <p className="text-xs text-gray-500 mt-1">Refund will be processed in 5-7 business days.</p>
            )}
          </div>
        ) : null}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Reason for cancellation *</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
          >
            <option value="">Select a reason</option>
            <option value="CHANGE_OF_PLANS">Change of plans</option>
            <option value="FOUND_BETTER_PRICE">Found better price elsewhere</option>
            <option value="EMERGENCY">Personal emergency</option>
            <option value="TRAVEL_CANCELLED">Travel cancelled</option>
            <option value="HOTEL_ISSUES">Issues with hotel</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
            Keep Booking
          </button>
          <button
            onClick={handleCancel}
            disabled={!reason || cancelling}
            className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"
          >
            {cancelling ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
            Cancel Booking
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Review Form ──────────────────────────────────────────────────────────────

function ReviewForm({ bookingId, hotelId, onSuccess }: {
  bookingId: string
  hotelId: string
  onSuccess: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ReviewData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      overallRating: 0,
      travelType: 'LEISURE',
    },
  })

  const overallRating = watch('overallRating')

  const onSubmit = async (data: ReviewData) => {
    setSubmitting(true)
    setServerError('')
    try {
      await axiosInstance.post('/api/v1/reviews', {
        ...data,
        bookingId,
        hotelId,
      })
      onSuccess()
    } catch (err: any) {
      setServerError(err?.response?.data?.message || 'Failed to submit review.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Star size={18} className="text-brand-blue" /> Write a Review
      </h2>

      {serverError && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm">
          <AlertTriangle size={14} /> {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Overall rating *</label>
          <StarRatingInput value={overallRating} onChange={v => setValue('overallRating', v)} />
          {errors.overallRating && <p className="text-xs text-red-600 mt-1">Please select a rating</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            { field: 'cleanlinessRating' as const, label: 'Cleanliness' },
            { field: 'serviceRating' as const, label: 'Service' },
            { field: 'locationRating' as const, label: 'Location' },
            { field: 'valueRating' as const, label: 'Value for money' },
          ].map(({ field, label }) => {
            const val = watch(field) || 0
            return (
              <div key={field}>
                <label className="block text-xs text-gray-500 mb-1.5">{label}</label>
                <StarRatingInput value={val} onChange={v => setValue(field, v)} />
              </div>
            )
          })}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Travel type</label>
          <div className="flex flex-wrap gap-2">
            {['LEISURE', 'BUSINESS', 'FAMILY', 'COUPLE', 'SOLO'].map(t => {
              const travelType = watch('travelType')
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setValue('travelType', t as any)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize ${
                    travelType === t
                      ? 'bg-brand-blue text-white border-brand-blue'
                      : 'border-gray-200 text-gray-700 hover:border-brand-blue'
                  }`}
                >
                  {t.toLowerCase()}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Review title *</label>
          <input
            {...register('title')}
            placeholder="Summarize your experience in a few words"
            className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue ${errors.title ? 'border-red-400' : 'border-gray-200'}`}
          />
          {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Your review *</label>
          <textarea
            {...register('reviewText')}
            rows={4}
            placeholder="Tell other travelers about your experience. What did you enjoy? What could be improved?"
            className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none ${errors.reviewText ? 'border-red-400' : 'border-gray-200'}`}
          />
          {errors.reviewText && <p className="text-xs text-red-600 mt-1">{errors.reviewText.message}</p>}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 bg-brand-blue hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-3 rounded-xl transition-colors"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Star size={16} />}
          Submit Review
        </button>
      </form>
    </div>
  )
}

// ─── Price Breakdown Section ──────────────────────────────────────────────────

function PriceBreakdownSection({ booking }: { booking: any }) {
  const pb = booking.priceBreakdown

  // Helper to format a value as INR if it's a number
  const fmt = (v: any) => {
    if (typeof v === 'number') return `₹${Number(v).toLocaleString('en-IN')}`
    if (typeof v === 'string' && !isNaN(Number(v))) return `₹${Number(v).toLocaleString('en-IN')}`
    return String(v ?? '')
  }

  if (!pb) {
    // Fallback: use top-level booking fields
    return (
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex justify-between">
          <span>Room charges ({booking.nights} night{booking.nights !== 1 ? 's' : ''})</span>
          <span className="font-semibold">₹{Number(booking.baseAmount ?? 0).toLocaleString('en-IN')}</span>
        </div>
        {Number(booking.addOnAmount) > 0 && (
          <div className="flex justify-between">
            <span>Add-ons</span>
            <span className="font-semibold">₹{Number(booking.addOnAmount).toLocaleString('en-IN')}</span>
          </div>
        )}
        {Number(booking.taxAmount) > 0 && (
          <div className="flex justify-between">
            <span>GST &amp; taxes</span>
            <span className="font-semibold">₹{Number(booking.taxAmount).toLocaleString('en-IN')}</span>
          </div>
        )}
        {Number(booking.convenienceFee) > 0 && (
          <div className="flex justify-between">
            <span>Convenience fee</span>
            <span className="font-semibold">₹{Number(booking.convenienceFee).toLocaleString('en-IN')}</span>
          </div>
        )}
        {booking.couponCode && Number(booking.couponDiscount) > 0 && (
          <div className="flex justify-between text-green-600 font-semibold">
            <span>🏷️ Coupon ({booking.couponCode})</span>
            <span>−₹{Number(booking.couponDiscount).toLocaleString('en-IN')}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-gray-900 border-t pt-2">
          <span>Total</span>
          <span>₹{Number(booking.totalAmount ?? 0).toLocaleString('en-IN')}</span>
        </div>
      </div>
    )
  }

  // Structured price breakdown from PricingResult JSON
  const basePrice = pb.basePrice ?? pb.baseprice
  const pricePerNight = pb.pricePerNight ?? pb.pricepernight
  const totalForStay = pb.totalForStay ?? pb.totalforstay
  const subtotal = pb.subtotalAfterAdjustments ?? pb.subtotalafteradjustments
  const totalTax = pb.totalTax ?? pb.totaltax
  const convFee = pb.convenienceFee ?? pb.conveniencefee
  const grandTotal = pb.grandTotal ?? pb.grandtotal
  const nights = pb.nights ?? booking.nights ?? 1
  const priceLocked = pb.priceLockedUntil ?? pb.pricelockeduntil

  // adjustments: array of {name, type, amount, ruleType}
  const adjustments: any[] = Array.isArray(pb.adjustments) ? pb.adjustments : []

  // taxBreakdown: array of {name, rate, amount}
  const taxBreakdown: any[] = Array.isArray(pb.taxBreakdown)
    ? pb.taxBreakdown
    : Array.isArray(pb.taxbreakdown) ? pb.taxbreakdown : []

  return (
    <div className="space-y-2 text-sm">
      {/* Base price */}
      {basePrice != null && (
        <div className="flex justify-between text-gray-600">
          <span>Base price per night</span>
          <span className="font-semibold">₹{Number(basePrice).toLocaleString('en-IN')}</span>
        </div>
      )}
      {pricePerNight != null && (
        <div className="flex justify-between text-gray-600">
          <span>Price per night (after rules)</span>
          <span className="font-semibold">₹{Number(pricePerNight).toLocaleString('en-IN')}</span>
        </div>
      )}
      {totalForStay != null && (
        <div className="flex justify-between text-gray-600">
          <span>Room charges ({nights} night{Number(nights) !== 1 ? 's' : ''})</span>
          <span className="font-semibold">₹{Number(totalForStay).toLocaleString('en-IN')}</span>
        </div>
      )}

      {/* Adjustments */}
      {adjustments.length > 0 && (
        <div className="mt-2 pt-2 border-t border-dashed border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Pricing adjustments</p>
          {adjustments.map((adj: any, i: number) => {
            const isDiscount = String(adj.type ?? '').toUpperCase() === 'DISCOUNT'
            return (
              <div key={i} className={`flex justify-between ${isDiscount ? 'text-green-600' : 'text-orange-600'}`}>
                <span>{adj.name ?? adj.ruleType ?? 'Adjustment'}</span>
                <span className="font-semibold">
                  {isDiscount ? '−' : '+'}₹{Number(adj.amount ?? 0).toLocaleString('en-IN')}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Subtotal after adjustments */}
      {subtotal != null && adjustments.length > 0 && (
        <div className="flex justify-between text-gray-700 font-semibold border-t border-dashed border-gray-100 pt-2">
          <span>Subtotal after adjustments</span>
          <span>₹{Number(subtotal).toLocaleString('en-IN')}</span>
        </div>
      )}

      {/* Add-ons */}
      {(booking.addOns || []).filter((ao: any) => Number(ao.totalPrice ?? 0) > 0).map((ao: any) => (
        <div key={ao.id ?? ao.addOnType} className="flex justify-between text-gray-600">
          <span className="capitalize">{String(ao.addOnType ?? ao.type ?? '').replace(/_/g, ' ').toLowerCase()}</span>
          <span className="font-semibold">₹{Number(ao.totalPrice).toLocaleString('en-IN')}</span>
        </div>
      ))}

      {/* Tax breakdown */}
      {taxBreakdown.length > 0 && (
        <div className="mt-2 pt-2 border-t border-dashed border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Taxes &amp; fees</p>
          {taxBreakdown.map((tax: any, i: number) => (
            <div key={i} className="flex justify-between text-gray-600">
              <span>
                {tax.name ?? 'Tax'}
                {tax.rate != null && Number(tax.rate) > 0 && (
                  <span className="text-xs text-gray-400 ml-1">({Number(tax.rate)}%)</span>
                )}
              </span>
              <span className="font-semibold">₹{Number(tax.amount ?? 0).toLocaleString('en-IN')}</span>
            </div>
          ))}
        </div>
      )}

      {/* Fallback tax row if no breakdown */}
      {taxBreakdown.length === 0 && Number(totalTax ?? booking.taxAmount) > 0 && (
        <div className="flex justify-between text-gray-600">
          <span>GST &amp; taxes</span>
          <span className="font-semibold">₹{Number(totalTax ?? booking.taxAmount).toLocaleString('en-IN')}</span>
        </div>
      )}

      {/* Convenience fee (if not already in taxBreakdown) */}
      {taxBreakdown.length === 0 && Number(convFee ?? booking.convenienceFee) > 0 && (
        <div className="flex justify-between text-gray-600">
          <span>Convenience fee</span>
          <span className="font-semibold">₹{Number(convFee ?? booking.convenienceFee).toLocaleString('en-IN')}</span>
        </div>
      )}

      {/* Coupon discount */}
      {booking.couponCode && Number(booking.couponDiscount) > 0 && (
        <div className="flex justify-between text-green-600 font-semibold">
          <span>🏷️ Coupon ({booking.couponCode})</span>
          <span>−₹{Number(booking.couponDiscount).toLocaleString('en-IN')}</span>
        </div>
      )}

      {/* Grand total — always use booking.totalAmount from DB (post-coupon actual charged amount) */}
      <div className="flex justify-between font-black text-gray-900 border-t border-gray-200 pt-2.5 mt-1">
        <span>Total Paid</span>
        <span className="text-blue-700 text-base">
          ₹{Number(booking.totalAmount ?? grandTotal ?? 0).toLocaleString('en-IN')}
        </span>
      </div>

      {/* Price lock info */}
      {priceLocked && (
        <p className="text-xs text-gray-400 mt-1">
          Price locked until {new Date(priceLocked).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BookingDetailPage() {
  const { bookingRef } = useParams<{ bookingRef: string }>()
  const navigate = useNavigate()
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [reviewSubmitted, setReviewSubmitted] = useState(false)

  const { data, isLoading, refetch } = useGetBookingDetailQuery(bookingRef!, { skip: !bookingRef })
  const booking = data?.data

  const handleDownloadInvoice = async () => {
    try {
      const response = await axiosInstance.get(`/api/v1/bookings/${bookingRef}/invoice`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${bookingRef}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {}
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 size={32} className="animate-spin text-brand-blue" />
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-gray-700 mb-4">Booking not found</h2>
        <button onClick={() => navigate('/user/bookings')} className="text-brand-blue hover:underline text-sm">
          ← Back to My Bookings
        </button>
      </div>
    )
  }

  const isUpcoming = ['PENDING', 'CONFIRMED', 'CHECKED_IN'].includes(booking.status)
  const isCompleted = booking.status === 'CHECKED_OUT'
  const isCancellable = isUpcoming && booking.status !== 'CHECKED_IN'

  return (
    <>
      <Helmet>
        <title>Booking {bookingRef} | MakeMyCrip</title>
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate('/user/bookings')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft size={16} /> Back to My Bookings
        </button>

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-5">
          <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Building2 size={20} className="text-brand-blue" /> {booking.hotelName}
              </h1>
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                <MapPin size={13} /> {booking.hotelAddress}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
                booking.status === 'CONFIRMED' ? 'text-green-600 bg-green-50 border-green-200' :
                booking.status === 'CANCELLED' ? 'text-red-600 bg-red-50 border-red-200' :
                booking.status === 'CHECKED_OUT' ? 'text-gray-600 bg-gray-50 border-gray-200' :
                'text-blue-600 bg-blue-50 border-blue-200'
              }`}>
                {booking.status.replace('_', ' ')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-400 text-xs mb-0.5">Check-in</p>
              <p className="font-semibold">{format(new Date(booking.checkIn), 'EEE, d MMM yyyy')}</p>
              <p className="text-xs text-gray-500">From {booking.checkInTime}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-0.5">Check-out</p>
              <p className="font-semibold">{format(new Date(booking.checkOut), 'EEE, d MMM yyyy')}</p>
              <p className="text-xs text-gray-500">By {booking.checkOutTime}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-0.5">Room</p>
              <p className="font-semibold">{booking.roomTypeName}</p>
              <p className="text-xs text-gray-500">{booking.nights} nights</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-0.5">Booking ref</p>
              <p className="font-mono font-bold text-gray-800">{bookingRef}</p>
              <p className="text-xs text-gray-500">₹{booking.totalAmount?.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={handleDownloadInvoice}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download size={15} /> Download Invoice
          </button>
          {isCancellable && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="flex items-center gap-2 px-4 py-2 border border-red-200 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <XCircle size={15} /> Cancel Booking
            </button>
          )}
          {booking.hotelPhone && (
            <a
              href={`tel:${booking.hotelPhone}`}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Phone size={15} /> Call Hotel
            </a>
          )}
        </div>

        {/* Sections */}
        <div className="space-y-5">
          {/* Guest info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Users size={16} className="text-brand-blue" /> Guest Details
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 w-28">Primary guest</span>
                <span className="font-medium">{booking.primaryGuestName}</span>
              </div>
              {booking.guestEmail && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-28">Email</span>
                  <span className="flex items-center gap-1"><Mail size={12} /> {booking.guestEmail}</span>
                </div>
              )}
              {booking.guestPhone && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-28">Phone</span>
                  <span className="flex items-center gap-1"><Phone size={12} /> +91 {booking.guestPhone}</span>
                </div>
              )}
              {(booking.guests || []).filter((g: any) => !g.isPrimary).length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">Additional guests</p>
                  {(booking.guests || []).filter((g: any) => !g.isPrimary).map((g: any, i: number) => (
                    <p key={i} className="text-sm">{g.firstName} {g.lastName} {g.guestType ? `(${g.guestType.toLowerCase()})` : ''}</p>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Price breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <MessageSquare size={16} className="text-brand-blue" /> Price Breakdown
            </h2>
            <PriceBreakdownSection booking={booking} />
          </div>

          {/* Review section (completed bookings only) */}
          {isCompleted && !booking.hasReview && !reviewSubmitted && (
            <ReviewForm
              bookingId={booking.id}
              hotelId={booking.hotelId}
              onSuccess={() => { setReviewSubmitted(true); refetch() }}
            />
          )}

          {(reviewSubmitted || (isCompleted && booking.hasReview)) && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle size={20} className="text-green-600" />
              <p className="text-sm font-medium text-green-700">
                {reviewSubmitted ? 'Thank you for your review!' : 'You have already reviewed this stay.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Cancel modal */}
      <AnimatePresence>
        {showCancelModal && (
          <CancelModal
            bookingRef={bookingRef!}
            onClose={() => setShowCancelModal(false)}
            onSuccess={() => { setShowCancelModal(false); refetch() }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
