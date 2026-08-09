import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import {
  Calendar, MapPin, Users, Clock, ChevronRight,
  CheckCircle, XCircle, AlertCircle, Building2,
  Download, Star, Loader2
} from 'lucide-react'
import { format } from 'date-fns'
import { useGetMyBookingsQuery } from '@/store/api/bookingApi'
import axiosInstance from '@/lib/axios'

type StatusFilter = 'UPCOMING' | 'COMPLETED' | 'CANCELLED'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PAYMENT_PENDING: { label: 'Payment Pending', color: 'text-orange-600 bg-orange-50 border-orange-200', icon: Clock },
  PENDING: { label: 'Pending', color: 'text-amber-600 bg-amber-50 border-amber-200', icon: Clock },
  CONFIRMED: { label: 'Confirmed', color: 'text-green-600 bg-green-50 border-green-200', icon: CheckCircle },
  CHECKED_IN: { label: 'Checked In', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: CheckCircle },
  CHECKED_OUT: { label: 'Completed', color: 'text-gray-600 bg-gray-50 border-gray-200', icon: CheckCircle },
  CANCELLED: { label: 'Cancelled', color: 'text-red-600 bg-red-50 border-red-200', icon: XCircle },
  NO_SHOW: { label: 'No Show', color: 'text-red-600 bg-red-50 border-red-200', icon: AlertCircle },
}

const TAB_STATUS_MAP: Record<StatusFilter, string[]> = {
  UPCOMING: ['PAYMENT_PENDING', 'PENDING', 'CONFIRMED', 'CHECKED_IN'],
  COMPLETED: ['CHECKED_OUT'],
  CANCELLED: ['CANCELLED', 'NO_SHOW'],
}

function BookingCard({ booking }: { booking: any }) {
  const navigate = useNavigate()
  const status = STATUS_CONFIG[booking.status] || STATUS_CONFIG.CONFIRMED
  const StatusIcon = status.icon

  const handleDownloadInvoice = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const response = await axiosInstance.get(`/api/v1/bookings/${booking.bookingRef}/invoice`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `invoice-${booking.bookingRef}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch {}
  }

  const isUpcoming = ['PAYMENT_PENDING', 'PENDING', 'CONFIRMED', 'CHECKED_IN'].includes(booking.status)
  const isCompleted = booking.status === 'CHECKED_OUT'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => navigate(`/user/bookings/${booking.bookingRef}`)}
    >
      <div className="flex flex-col sm:flex-row">
        {/* Hotel image */}
        <div className="sm:w-48 h-36 sm:h-auto shrink-0 overflow-hidden bg-gray-100">
          <img
            src={booking.hotelImageUrl || '/placeholder-hotel.svg'}
            alt={booking.hotelName}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-hotel.svg' }}
          />
        </div>

        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <h3 className="font-bold text-gray-900 leading-tight">{booking.hotelName}</h3>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <MapPin size={11} /> {booking.hotelCity}
              </p>
            </div>
            <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${status.color}`}>
              <StatusIcon size={11} /> {status.label}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-3 text-xs text-gray-600">
            <div>
              <p className="text-gray-400 mb-0.5">Check-in</p>
              <p className="font-medium">{format(new Date(booking.checkIn), 'd MMM yyyy')}</p>
            </div>
            <div>
              <p className="text-gray-400 mb-0.5">Check-out</p>
              <p className="font-medium">{format(new Date(booking.checkOut), 'd MMM yyyy')}</p>
            </div>
            <div>
              <p className="text-gray-400 mb-0.5">Guests</p>
              <p className="font-medium flex items-center gap-0.5"><Users size={11} /> {booking.adults}</p>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Booking ref: <span className="font-mono text-gray-600">{booking.bookingRef}</span></p>
              <p className="font-bold text-gray-900">₹{booking.totalAmount?.toLocaleString('en-IN')}</p>
            </div>

            <div className="flex items-center gap-2">
              {(isUpcoming || isCompleted) && (
                <button
                  onClick={handleDownloadInvoice}
                  className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Download size={13} /> Invoice
                </button>
              )}
              {isCompleted && !booking.hasReview && (
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/user/bookings/${booking.bookingRef}?tab=review`) }}
                  className="flex items-center gap-1.5 text-xs text-amber-600 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-50 transition-colors"
                >
                  <Star size={13} /> Write Review
                </button>
              )}
              <button className="flex items-center gap-1 text-xs text-brand-blue font-semibold hover:underline">
                View Details <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function MyBookingsPage() {
  const [activeTab, setActiveTab] = useState<StatusFilter>('UPCOMING')
  const [page, setPage] = useState(0)

  // Backend accepts a single status value; send the first status of the tab group
  // (UPCOMING maps to CONFIRMED as the primary filter; backend will handle PENDING/CHECKED_IN too)
  // We pass the full comma-joined list and let the backend handle it via IN clause
  const statusValues = TAB_STATUS_MAP[activeTab]
  const { data, isLoading, isFetching } = useGetMyBookingsQuery({
    status: statusValues.join(','),
    page,
    size: 10,
  })

  const bookings = data?.data?.content || []
  const totalPages = data?.data?.totalPages || 0

  return (
    <>
      <Helmet>
        <title>My Bookings | MakeMyCrip</title>
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          {(['UPCOMING', 'COMPLETED', 'CANCELLED'] as StatusFilter[]).map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setPage(0) }}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab
                  ? 'border-brand-blue text-brand-blue'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Content */}
        {(isLoading || isFetching) && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="text-brand-blue animate-spin" />
          </div>
        )}

        {!isLoading && !isFetching && bookings.length === 0 && (
          <div className="text-center py-20">
            <Calendar size={48} className="text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-700 mb-2">No {activeTab.toLowerCase()} bookings</h3>
            <p className="text-gray-400 text-sm mb-6">
              {activeTab === 'UPCOMING'
                ? "You don't have any upcoming trips."
                : activeTab === 'COMPLETED'
                ? "You haven't completed any stays yet."
                : "You don't have any cancelled bookings."}
            </p>
            {activeTab === 'UPCOMING' && (
              <Link to="/" className="inline-flex items-center gap-2 bg-brand-blue text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors">
                Search Hotels <ChevronRight size={16} />
              </Link>
            )}
          </div>
        )}

        {!isLoading && !isFetching && bookings.length > 0 && (
          <div className="space-y-4">
            {bookings.map((booking: any) => (
              <BookingCard key={booking.bookingRef} booking={booking} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-500">{page + 1} / {totalPages}</span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">
              Next
            </button>
          </div>
        )}
      </div>
    </>
  )
}
