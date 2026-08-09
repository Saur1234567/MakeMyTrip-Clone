import { useState, useEffect, useCallback } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Loader2, CheckCircle, AlertTriangle, RefreshCw, Trash2, Tag, Ticket } from 'lucide-react'
import axiosInstance from '@/lib/axios'

const inp = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue'
const lbl = 'block text-xs font-medium text-gray-700 mb-1'
const saveBtnCls = 'flex items-center gap-2 bg-brand-blue hover:bg-blue-700 disabled:bg-blue-300 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors'

function PromotionModal({ promo, onClose, onSuccess }: { promo: any | null; onClose: () => void; onSuccess: () => void }) {
  const isEdit = !!promo
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [data, setData] = useState(promo || {
    promotionName: '', promotionType: 'PERCENTAGE', discountValue: '', minBookingAmount: '',
    maxDiscountAmount: '', startDate: '', endDate: '', isActive: true, applicableHotelIds: []
  })
  const set = (f: string, v: any) => setData((p: any) => ({ ...p, [f]: v }))

  const save = async () => {
    setSaving(true)
    try {
      const payload = { ...data, discountValue: Number(data.discountValue), minBookingAmount: data.minBookingAmount ? Number(data.minBookingAmount) : undefined, maxDiscountAmount: data.maxDiscountAmount ? Number(data.maxDiscountAmount) : undefined }
      if (isEdit) await axiosInstance.put(`/api/v1/admin/promotions/${promo.id}`, payload)
      else await axiosInstance.post('/api/v1/admin/promotions', payload)
      onSuccess()
    } catch (e: any) { setErr(e?.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">{isEdit ? 'Edit Promotion' : 'New Promotion'}</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        {err && <div className="mx-5 mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm bg-red-50 text-red-700"><AlertTriangle size={14} />{err}</div>}
        <div className="p-5 space-y-3">
          <div><label className={lbl}>Promotion Name *</label><input value={data.promotionName} onChange={e => set('promotionName', e.target.value)} className={inp} placeholder="e.g. Summer Sale 2025" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Type</label>
              <select value={data.promotionType} onChange={e => set('promotionType', e.target.value)} className={inp + ' bg-white'}>
                {['PERCENTAGE','FLAT_AMOUNT','FREE_NIGHT','EARLY_BIRD','LAST_MINUTE'].map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
              </select>
            </div>
            <div><label className={lbl}>Discount Value *</label><input type="number" value={data.discountValue} onChange={e => set('discountValue', e.target.value)} className={inp} placeholder={data.promotionType === 'PERCENTAGE' ? '% off' : '₹ off'} /></div>
            <div><label className={lbl}>Min Booking Amount (₹)</label><input type="number" value={data.minBookingAmount} onChange={e => set('minBookingAmount', e.target.value)} className={inp} /></div>
            <div><label className={lbl}>Max Discount (₹)</label><input type="number" value={data.maxDiscountAmount} onChange={e => set('maxDiscountAmount', e.target.value)} className={inp} /></div>
            <div><label className={lbl}>Start Date</label><input type="date" value={data.startDate} onChange={e => set('startDate', e.target.value)} className={inp} /></div>
            <div><label className={lbl}>End Date</label><input type="date" value={data.endDate} onChange={e => set('endDate', e.target.value)} className={inp} /></div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isActive" checked={data.isActive} onChange={e => set('isActive', e.target.checked)} className="rounded" />
            <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm">Cancel</button>
            <button onClick={save} disabled={saving || !data.promotionName} className={saveBtnCls + ' flex-1 justify-center'}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} {isEdit ? 'Save' : 'Create'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function CouponModal({ promotionId, onClose, onSuccess }: { promotionId: string; onClose: () => void; onSuccess: () => void }) {
  const [coupons, setCoupons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [count, setCount] = useState('1')
  const [prefix, setPrefix] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await axiosInstance.get(`/api/v1/admin/promotions/${promotionId}/coupons`)
      setCoupons(res.data.data || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [promotionId])

  const generate = async () => {
    setGenerating(true)
    try {
      await axiosInstance.post(`/api/v1/admin/promotions/${promotionId}/coupons/generate`, { count: Number(count), prefix })
      load(); onSuccess()
    } finally { setGenerating(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-bold text-gray-900">Coupon Codes</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="p-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex gap-2">
            <input value={prefix} onChange={e => setPrefix(e.target.value)} className={inp} placeholder="Prefix (optional)" />
            <input type="number" value={count} onChange={e => setCount(e.target.value)} className={inp} placeholder="Count" min="1" max="100" />
            <button onClick={generate} disabled={generating} className="flex items-center gap-1.5 px-4 py-2 bg-brand-blue text-white rounded-xl text-sm font-medium hover:bg-blue-700 whitespace-nowrap">
              {generating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Generate
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-brand-blue" /></div> : (
            <div className="space-y-2">
              {coupons.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                  <div>
                    <p className="font-mono text-sm font-bold text-gray-800">{c.code}</p>
                    <p className="text-xs text-gray-400">Used: {c.usedCount}/{c.maxUses || '∞'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{c.isActive ? 'Active' : 'Inactive'}</span>
                    <button onClick={async () => { if (confirm('Delete coupon?')) { await axiosInstance.delete(`/api/v1/admin/promotions/${promotionId}/coupons/${c.id}`); load() } }} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={14} className="text-red-500" /></button>
                  </div>
                </div>
              ))}
              {coupons.length === 0 && <p className="text-center py-8 text-gray-400 text-sm">No coupons yet. Generate some above.</p>}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default function AdminPromotions() {
  const [promotions, setPromotions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<any | null>(null)
  const [couponModal, setCouponModal] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axiosInstance.get('/api/v1/admin/promotions')
      setPromotions(res.data.data?.content || res.data.data || [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  return (
    <>
      <Helmet><title>Promotions & Coupons | Admin</title></Helmet>
      <div>
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Promotions & Coupons</h1>
            <p className="text-sm text-gray-500">{promotions.length} promotions</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetch} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50"><RefreshCw size={14} /> Refresh</button>
            <button onClick={() => setModal({})} className="flex items-center gap-1.5 px-4 py-2 bg-brand-blue text-white rounded-xl text-sm font-medium hover:bg-blue-700"><Plus size={14} /> New Promotion</button>
          </div>
        </div>

        {msg && <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm bg-green-50 text-green-700 border border-green-200"><CheckCircle size={14} />{msg}</div>}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-blue" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {promotions.map((p: any) => (
              <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-brand-blue/10 flex items-center justify-center"><Tag size={16} className="text-brand-blue" /></div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">{p.promotionName}</h3>
                      <p className="text-xs text-gray-500">{p.promotionType?.replace('_',' ')}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.isActive ? 'Active' : 'Inactive'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-4">
                  <div><span className="text-gray-400">Discount:</span> {p.promotionType === 'PERCENTAGE' ? `${p.discountValue}%` : `₹${p.discountValue}`}</div>
                  {p.minBookingAmount && <div><span className="text-gray-400">Min:</span> ₹{p.minBookingAmount}</div>}
                  {p.startDate && <div><span className="text-gray-400">From:</span> {new Date(p.startDate).toLocaleDateString('en-IN')}</div>}
                  {p.endDate && <div><span className="text-gray-400">To:</span> {new Date(p.endDate).toLocaleDateString('en-IN')}</div>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setModal(p)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50">Edit</button>
                  <button onClick={() => setCouponModal(p.id)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50"><Ticket size={12} /> Coupons</button>
                  <button onClick={async () => { if (confirm('Delete promotion?')) { await axiosInstance.delete(`/api/v1/admin/promotions/${p.id}`); fetch(); flash('Deleted!') } }} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={14} className="text-red-500" /></button>
                </div>
              </motion.div>
            ))}
            {promotions.length === 0 && (
              <div className="col-span-2 text-center py-16 text-gray-400">
                <Tag size={40} className="mx-auto mb-3 text-gray-200" />
                <p className="text-sm">No promotions yet. Create your first one!</p>
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {modal !== null && <PromotionModal promo={modal?.id ? modal : null} onClose={() => setModal(null)} onSuccess={() => { setModal(null); fetch(); flash('Promotion saved!') }} />}
        {couponModal && <CouponModal promotionId={couponModal} onClose={() => setCouponModal(null)} onSuccess={() => flash('Coupons updated!')} />}
      </AnimatePresence>
    </>
  )
}
