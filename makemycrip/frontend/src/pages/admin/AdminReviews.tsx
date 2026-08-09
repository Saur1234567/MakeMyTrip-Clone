import { useState, useEffect, useCallback } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Loader2, CheckCircle, AlertTriangle, RefreshCw, Star, Trash2, Flag, MessageSquare } from 'lucide-react'
import axiosInstance from '@/lib/axios'

const inp = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue'
const lbl = 'block text-xs font-medium text-gray-700 mb-1'

function ReviewModal({ review, onClose, onSuccess }: { review: any; onClose: () => void; onSuccess: () => void }) {
  const [response, setResponse] = useState(review.hotelResponse || '')
  const [editContent, setEditContent] = useState(review.reviewText || '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [isErr, setIsErr] = useState(false)

  const flash = (m: string, err = false) => { setMsg(m); setIsErr(err); setTimeout(() => setMsg(''), 3000) }

  const action = async (endpoint: string, method: 'post' | 'patch' | 'delete', body?: any, label = 'Done') => {
    setSaving(true)
    try {
      await (axiosInstance as any)[method](endpoint, body)
      flash(label); onSuccess()
    } catch (e: any) { flash(e?.response?.data?.message || 'Failed', true) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Manage Review</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        {msg && (
          <div className={`mx-5 mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm ${isErr ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {isErr ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}{msg}
          </div>
        )}
        <div className="p-5 space-y-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex text-yellow-400">
                {[1,2,3,4,5].map(i => <Star key={i} size={14} fill={i <= review.rating ? 'currentColor' : 'none'} />)}
              </div>
              <span className="text-xs text-gray-500">{review.rating}/5</span>
              <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${review.status === 'APPROVED' ? 'bg-green-100 text-green-700' : review.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{review.status}</span>
            </div>
            <p className="text-sm font-medium text-gray-800">{review.title}</p>
            <p className="text-sm text-gray-600 mt-1">{review.reviewText}</p>
            <p className="text-xs text-gray-400 mt-2">By {review.userName} · {review.hotelName}</p>
          </div>

          <div className="flex gap-2 flex-wrap">
            {review.status !== 'APPROVED' && (
              <button onClick={() => action(`/api/v1/admin/reviews/${review.id}/approve`, 'post', {}, 'Review approved')} disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700">
                <CheckCircle size={14} /> Approve
              </button>
            )}
            {review.status !== 'REJECTED' && (
              <button onClick={() => action(`/api/v1/admin/reviews/${review.id}/reject`, 'post', {}, 'Review rejected')} disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700">
                <X size={14} /> Reject
              </button>
            )}
            <button onClick={() => action(`/api/v1/admin/reviews/${review.id}/flag`, 'post', {}, 'Review flagged')} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-2 border border-amber-300 text-amber-700 rounded-xl text-sm font-medium hover:bg-amber-50">
              <Flag size={14} /> Flag
            </button>
            <button onClick={() => { if (confirm('Delete this review?')) action(`/api/v1/admin/reviews/${review.id}`, 'delete', undefined, 'Review deleted') }} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50">
              <Trash2 size={14} /> Delete
            </button>
          </div>

          <div>
            <label className={lbl}>Edit Review Content</label>
            <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={3} className={inp + ' resize-none'} />
            <button onClick={() => action(`/api/v1/admin/reviews/${review.id}`, 'patch', { reviewText: editContent }, 'Review updated')} disabled={saving || !editContent}
              className="mt-2 px-4 py-2 bg-brand-blue text-white rounded-xl text-sm font-medium hover:bg-blue-700">
              Save Edit
            </button>
          </div>

          <div>
            <label className={lbl}>Hotel Response</label>
            <textarea value={response} onChange={e => setResponse(e.target.value)} rows={3} className={inp + ' resize-none'} placeholder="Write hotel's official response..." />
            <button onClick={() => action(`/api/v1/admin/reviews/${review.id}/hotel-response`, 'post', { response }, 'Response saved')} disabled={saving || !response}
              className="mt-2 flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-xl text-sm font-medium hover:bg-blue-700">
              <MessageSquare size={14} /> Save Response
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [selected, setSelected] = useState<any | null>(null)

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { page, size: 15 }
      if (search) params.search = search
      if (statusFilter !== 'ALL') params.status = statusFilter
      const res = await axiosInstance.get('/api/v1/admin/reviews', { params })
      const d = res.data.data
      setReviews(d.content || [])
      setTotalPages(d.totalPages || 0)
      setTotalElements(d.totalElements || 0)
    } finally { setLoading(false) }
  }, [page, search, statusFilter])

  useEffect(() => { fetchReviews() }, [fetchReviews])

  return (
    <>
      <Helmet><title>Manage Reviews | Admin</title></Helmet>
      <div>
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
            <p className="text-sm text-gray-500">{totalElements.toLocaleString('en-IN')} total reviews</p>
          </div>
          <button onClick={fetchReviews} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-5">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
                placeholder="Search by hotel, user..." className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
            </div>
            <div className="flex gap-1">
              {['ALL','PENDING','APPROVED','REJECTED','FLAGGED'].map(s => (
                <button key={s} onClick={() => { setStatusFilter(s); setPage(0) }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${statusFilter === s ? 'bg-brand-blue text-white border-brand-blue' : 'border-gray-200 text-gray-600 hover:border-brand-blue'}`}>
                  {s === 'ALL' ? 'All' : s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {loading && <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-blue" /></div>}
          {!loading && reviews.length === 0 && <div className="text-center py-16 text-gray-400 text-sm">No reviews found</div>}
          {!loading && reviews.map((r: any) => (
            <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex text-yellow-400">
                      {[1,2,3,4,5].map(i => <Star key={i} size={12} fill={i <= r.rating ? 'currentColor' : 'none'} />)}
                    </div>
                    <span className="text-xs text-gray-500">{r.rating}/5</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.status === 'APPROVED' ? 'bg-green-100 text-green-700' : r.status === 'REJECTED' ? 'bg-red-100 text-red-700' : r.status === 'FLAGGED' ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'}`}>{r.status}</span>
                  </div>
                  {r.title && <p className="text-sm font-semibold text-gray-800">{r.title}</p>}
                  <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{r.reviewText}</p>
                  <p className="text-xs text-gray-400 mt-1">{r.userName} · {r.hotelName} · {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : ''}</p>
                </div>
                <button onClick={() => setSelected(r)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 flex-shrink-0">Manage</button>
              </div>
            </motion.div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-xs text-gray-500">Page {page + 1} of {totalPages}</p>
            <div className="flex gap-2">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs disabled:opacity-40 hover:bg-gray-50">Previous</button>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs disabled:opacity-40 hover:bg-gray-50">Next</button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selected && <ReviewModal review={selected} onClose={() => setSelected(null)} onSuccess={() => { setSelected(null); fetchReviews() }} />}
      </AnimatePresence>
    </>
  )
}
