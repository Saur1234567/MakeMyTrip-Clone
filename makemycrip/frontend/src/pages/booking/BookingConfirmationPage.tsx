import { useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import {
  CheckCircle, Download, Calendar, MapPin, Users,
  Building2, Phone, Mail, Share2, Star, ArrowRight
} from 'lucide-react'
import { format } from 'date-fns'
import { useGetBookingDetailQuery } from '@/store/api/bookingApi'
import axiosInstance from '@/lib/axios'

export default function BookingConfirmationPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const bookingRef = searchParams.get('bookingRef') || ''

  // Force a fresh fetch every time this page mounts so the totalAmount reflects the
  // post-payment, post-coupon-deduction value saved by confirmBooking().
  // Without this, RTK Query serves the stale cached response from the payment page
  // (which was fetched before the coupon discount was applied), causing the displayed
  // total to be higher than the invoice total by the coupon discount amount.
  const { data, isLoading } = useGetBookingDetailQuery(bookingRef, {
    skip: !bookingRef,
    refetchOnMountOrArgChange: true,
  })
  const booking = data?.data

  useEffect(() => {
    if (!bookingRef) navigate('/', { replace: true })
  }, [bookingRef, navigate])

  const handleDownloadInvoice = async () => {
    try {
      const response = await axiosInstance.get(`/api/v1/bookings/${bookingRef}/invoice`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `invoice-${bookingRef}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Invoice download failed', err)
    }
  }

  const handleAddToCalendar = () => {
    if (!booking) return
    const checkIn = new Date(booking.checkIn)
    const checkOut = new Date(booking.checkOut)

    const formatICS = (d: Date) =>
      d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//MakeMyCrip//Hotel Booking//EN',
      'BEGIN:VEVENT',
      `UID:${bookingRef}@makemycrip.com`,
      `DTSTART:${formatICS(checkIn)}`,
      `DTEND:${formatICS(checkOut)}`,
      `SUMMARY:Hotel Stay - ${booking.hotelName}`,
      `DESCRIPTION:Booking ref: ${bookingRef}\\nRoom: ${booking.roomTypeName}`,
      `LOCATION:${booking.hotelAddress}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `hotel-booking-${bookingRef}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const handleShare = async () => {
    if (!booking) return
    const text = `I just booked ${booking.hotelName} for ${format(new Date(booking.checkIn), 'd MMM')} – ${format(new Date(booking.checkOut), 'd MMM yyyy')} via MakeMyCrip!`
    if (navigator.share) {
      await navigator.share({ title: 'My Hotel Booking', text })
    } else {
      await navigator.clipboard.writeText(text)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 border-4 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin mx-auto" />
        <p className="text-gray-500 mt-4">Loading your booking...</p>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-gray-700 mb-2">Booking not found</h2>
        <Link to="/" className="text-brand-blue hover:underline text-sm">Go to homepage</Link>
      </div>
    )
  }

  return (
    <>
      <Helmet>
        <title>Booking Confirmed! {bookingRef} | MakeMyCrip</title>
      </Helmet>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Success header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={44} className="text-green-600" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Booking Confirmed!</h1>
          <p className="text-gray-600 mb-1">
            Your hotel stay is all set. A confirmation has been sent to{' '}
            <strong>{booking.guestEmail}</strong>.
          </p>
          <div className="inline-flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full mt-2">
            <span className="text-sm text-gray-500">Booking ref:</span>
            <span className="font-bold text-gray-900 tracking-wider">{bookingRef}</span>
          </div>
        </motion.div>

        {/* Booking card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6"
        >
          {/* Hotel banner */}
          <div className="relative h-40 overflow-hidden">
            <img
              src={booking.hotelImageUrl || '/placeholder-hotel.svg'}
              alt={booking.hotelName}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-hotel.svg' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
              <h2 className="font-black text-xl">{booking.hotelName}</h2>
              <p className="text-sm text-white/80 flex items-center gap-1 mt-0.5">
                <MapPin size={12} /> {booking.hotelAddress}
              </p>
            </div>
          </div>

          <div className="p-5">
            {/* Stay details grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5 pb-5 border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Check-in</p>
                <p className="font-bold text-gray-900">{format(new Date(booking.checkIn), 'EEE, d MMM')}</p>
                <p className="text-xs text-gray-500">From {booking.checkInTime}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Check-out</p>
                <p className="font-bold text-gray-900">{format(new Date(booking.checkOut), 'EEE, d MMM')}</p>
                <p className="text-xs text-gray-500">By {booking.checkOutTime}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Duration</p>
                <p className="font-bold text-gray-900">{booking.nights} night{booking.nights !== 1 ? 's' : ''}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Guests</p>
                <p className="font-bold text-gray-900 flex items-center gap-1">
                  <Users size={14} /> {booking.adults}
                </p>
              </div>
            </div>

            {/* Room type */}
            <div className="flex items-center justify-between mb-5 pb-5 border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Room type</p>
                <p className="font-semibold text-gray-800">{booking.roomTypeName}</p>
              </div>
              {booking.cancellationPolicy && booking.cancellationPolicy !== 'NON_REFUNDABLE' && (
                <span className="bg-green-100 text-green-700 text-xs px-2.5 py-1 rounded-full font-medium">
                  <CheckCircle size={11} className="inline mr-1" />
                  Free cancellation
                </span>
              )}
            </div>

            {/* Guest info */}
            <div className="mb-5 pb-5 border-b border-gray-100">
              <p className="text-xs text-gray-500 mb-2">Primary guest</p>
              <p className="font-semibold text-gray-800">{booking.primaryGuestName}</p>
              {booking.guestEmail && (
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                  <Mail size={13} /> {booking.guestEmail}
                </p>
              )}
              {booking.guestPhone && (
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                  <Phone size={13} /> +91 {booking.guestPhone}
                </p>
              )}
            </div>

            {/* Price */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Room charges</span>
                <span>₹{booking.baseAmount?.toLocaleString('en-IN')}</span>
              </div>
              {booking.addOnAmount > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Add-ons</span>
                  <span>₹{booking.addOnAmount?.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-gray-600">
                <span>Taxes & fees</span>
                <span>₹{booking.taxAmount?.toLocaleString('en-IN')}</span>
              </div>
              {booking.couponCode && booking.couponDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600 font-semibold">
                  <span className="flex items-center gap-1">
                    🏷️ Coupon ({booking.couponCode})
                  </span>
                  <span>−₹{Number(booking.couponDiscount).toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-gray-900 text-base pt-2 border-t border-gray-200">
                <span>Total paid</span>
                <span>₹{booking.totalAmount?.toLocaleString('en-IN')}</span>
              </div>
              {booking.couponCode && booking.couponDiscount > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-sm text-green-700 font-semibold text-center">
                  🎉 You saved ₹{Number(booking.couponDiscount).toLocaleString('en-IN')} with coupon <span className="font-mono font-black">{booking.couponCode}</span>!
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6"
        >
          <button
            onClick={handleDownloadInvoice}
            className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download size={16} /> Download Invoice
          </button>
          <button
            onClick={handleAddToCalendar}
            className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Calendar size={16} /> Add to Calendar
          </button>
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Share2 size={16} /> Share
          </button>
        </motion.div>

        {/* Next steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-6"
        >
          <h3 className="font-bold text-blue-900 mb-3">What's next?</h3>
          <div className="space-y-2">
            {[
              'Check your email for a detailed confirmation with hotel contact info',
              `Arrive by ${booking.checkInTime} on ${format(new Date(booking.checkIn), 'EEEE, d MMMM yyyy')}`,
              'Show your booking reference or QR code at the front desk',
              'Rate your stay after check-out to help other travelers',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-blue-800">
                <span className="w-5 h-5 rounded-full bg-brand-blue text-white text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">{i + 1}</span>
                {step}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Navigation buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/user/bookings"
            className="flex-1 flex items-center justify-center gap-2 bg-brand-blue hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors"
          >
            View My Bookings <ArrowRight size={16} />
          </Link>
          <Link
            to="/"
            className="flex-1 flex items-center justify-center gap-2 border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </>
  )
}
