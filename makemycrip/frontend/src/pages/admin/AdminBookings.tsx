import { useState, useCallback } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Filter, Download, ChevronDown, X, CheckCircle,
  LogIn, LogOut, ArrowUpRight, RefreshCw, Loader2, Calendar,
  Users, Building2, AlertTriangle
} from 'lucide-react'
import { format } from 'date-fns'
import axiosInstance from '@/lib/axios'
import { useEffect } from 'react'

type BookingStatus = 'ALL' | 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED' | 'NO_SHOW'

const STATUS_OPTIONS: BookingStatus[] = ['ALL', 'PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW']

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-green-100 text-green-700',
  CHECKED_IN: 'bg-blue-100 text-blue-700',
  CHECKED_OUT: 'bg-gray-100 text-gray-700',
  CANCELLED: 'bg-red-100 text-red-700',
  NO_SHOW: 'bg-orange-100 text-orange-700',
}

// ─── Action Modal ─────────────────────────────────────────────────────────────

function ActionModal({ booking, action, onClose, onSuccess }: {
  booking: any
  action: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [note, setNote] = useState('')
  const [refundAmount, setRefundAmount] = useState(booking.totalAmount)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      // Backend uses UUID bookingId (booking.id), not bookingRef
      const id = booking.id
      if (action === 'CHECK_IN') {
        await axiosInstance.post(`/api/v1/admin/bookings/${id}/check-in`)
      } else if (action === 'CHECK_OUT') {
        await axiosInstance.post(`/api/v1/admin/bookings/${id}/check-out`)
      } else if (action === 'NOTE') {
        await axiosInstance.post(`/api/v1/admin/bookings/${id}/notes`, { note })
      } else if (action === 'REFUND') {
        await axiosInstance.post(`/api/v1/admin/bookings/${id}/refund`, { amount: refundAmount, reason: note })
      }
      onSuccess()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Action failed.')
    } finally {
      setLoading(false)
    }
  }

  const titles: Record<string, string> = {
    CHECK_IN: 'Check In Guest',
    CHECK_OUT: 'Check Out Guest',
    NOTE: 'Add Staff Note',
    REFUND: 'Issue Manual Refund',
  }

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
          <h3 className="font-bold text-gray-900">{titles[action]}</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>

        <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm">
          <p className="font-semibold text-gray-800">{booking.hotelName}</p>
          <p className="text-gray-500 font-mono text-xs">{booking.bookingRef}</p>
          <p className="text-gray-600 mt-1">{booking.primaryGuestName} · {booking.adults} guests</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-xl px-3 py-2.5 mb-4 text-sm">
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        {(action === 'NOTE' || action === 'REFUND') && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {action === 'REFUND' ? 'Reason for refund *' : 'Staff note *'}
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none"
              placeholder={action === 'REFUND' ? 'Reason for manual refund...' : 'Note visible only to staff...'}
            />
          </div>
        )}

        {action === 'REFUND' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Refund amount (₹)</label>
            <input
              type="number"
              value={refundAmount}
              onChange={e => setRefundAmount(Number(e.target.value))}
              max={booking.totalAmount}
              min={1}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
            <p className="text-xs text-gray-400 mt-1">Max: ₹{booking.totalAmount?.toLocaleString('en-IN')}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || ((action === 'NOTE' || action === 'REFUND') && !note.trim())}
            className="flex-1 flex items-center justify-center gap-2 bg-brand-blue hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            Confirm
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminBookings() {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<BookingStatus>('ALL')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [modal, setModal] = useState<{ booking: any; action: string } | null>(null)

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { page, size: 15 }
      if (statusFilter !== 'ALL') params.status = statusFilter
      if (search) params.search = search
      const res = await axiosInstance.get('/api/v1/admin/bookings', { params })
      setBookings(res.data.data.content || [])
      setTotalPages(res.data.data.totalPages || 0)
      setTotalElements(res.data.data.totalElements || 0)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search, page])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  const handleExportCSV = async () => {
    try {
      const res = await axiosInstance.get('/api/v1/admin/bookings/export', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `bookings-${format(new Date(), 'yyyy-MM-dd')}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {}
  }

  return (
    <>
      <Helmet><title>Manage Bookings | Admin</title></Helmet>

      <div>
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
            <p className="text-sm text-gray-500">{totalElements.toLocaleString('en-IN')} total</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchBookings}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">
              <RefreshCw size={14} /> Refresh
            </button>
            <button onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-brand-blue text-white rounded-xl text-sm font-medium hover:bg-blue-700">
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-5">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0) }}
                placeholder="Search by ref, hotel, guest name..."
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {STATUS_OPTIONS.map(s => (
                <button key={s}
                  onClick={() => { setStatusFilter(s); setPage(0) }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    statusFilter === s
                      ? 'bg-brand-blue text-white border-brand-blue'
                      : 'border-gray-200 text-gray-600 hover:border-brand-blue'
                  }`}>
                  {s === 'ALL' ? 'All' : s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Booking Ref', 'Hotel', 'Guest', 'Dates', 'Guests', 'Amount', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={8} className="text-center py-16">
                    <Loader2 size={28} className="animate-spin text-brand-blue mx-auto" />
                  </td></tr>
                )}
                {!loading && bookings.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-16 text-gray-400 text-sm">No bookings found</td></tr>
                )}
                {!loading && bookings.map((booking) => (
                  <motion.tr key={booking.bookingRef}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-gray-700">{booking.bookingRef}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 size={14} className="text-gray-400 shrink-0" />
                        <span className="text-sm text-gray-800 max-w-[140px] truncate">{booking.hotelName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-800">{booking.primaryGuestName}</p>
                      <p className="text-xs text-gray-400">{booking.guestEmail}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Calendar size={12} />
                        {format(new Date(booking.checkIn), 'd MMM')} → {format(new Date(booking.checkOut), 'd MMM')}
                      </div>
                      <p className="text-xs text-gray-400">{booking.nights}N</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Users size={12} /> {booking.adults}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-gray-900">₹{booking.totalAmount?.toLocaleString('en-IN')}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_STYLE[booking.status] || 'bg-gray-100 text-gray-600'}`}>
                        {booking.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {booking.status === 'CONFIRMED' && (
                          <button onClick={() => setModal({ booking, action: 'CHECK_IN' })}
                            title="Check In"
                            className="p-1.5 hover:bg-green-50 rounded-lg transition-colors group">
                            <LogIn size={15} className="text-green-600" />
                          </button>
                        )}
                        {booking.status === 'CHECKED_IN' && (
                          <button onClick={() => setModal({ booking, action: 'CHECK_OUT' })}
                            title="Check Out"
                            className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors">
                            <LogOut size={15} className="text-blue-600" />
                          </button>
                        )}
                        {['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'].includes(booking.status) && (
                          <button onClick={() => setModal({ booking, action: 'REFUND' })}
                            title="Issue Refund"
                            className="p-1.5 hover:bg-amber-50 rounded-lg transition-colors">
                            <ArrowUpRight size={15} className="text-amber-600" />
                          </button>
                        )}
                        <button onClick={() => setModal({ booking, action: 'NOTE' })}
                          title="Add Note"
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                          <Filter size={15} className="text-gray-500" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Showing {page * 15 + 1}–{Math.min((page + 1) * 15, totalElements)} of {totalElements}
              </p>
              <div className="flex gap-2">
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs disabled:opacity-40 hover:bg-gray-50">
                  Previous
                </button>
                <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs disabled:opacity-40 hover:bg-gray-50">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action modal */}
      <AnimatePresence>
        {modal && (
          <ActionModal
            booking={modal.booking}
            action={modal.action}
            onClose={() => setModal(null)}
            onSuccess={() => { setModal(null); fetchBookings() }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
