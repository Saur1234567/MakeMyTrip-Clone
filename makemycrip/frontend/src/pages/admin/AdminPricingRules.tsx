import { useState, useEffect, useCallback } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Loader2, CheckCircle, AlertTriangle, RefreshCw, Trash2, Edit2, TrendingUp } from 'lucide-react'
import axiosInstance from '@/lib/axios'

const inp = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue'
const lbl = 'block text-xs font-medium text-gray-700 mb-1'

function RuleModal({ rule, onClose, onSuccess }: { rule: any | null; onClose: () => void; onSuccess: () => void }) {
  const isEdit = !!rule?.id
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [data, setData] = useState(rule || {
    ruleName: '', ruleType: 'WEEKEND_SURCHARGE', adjustmentType: 'PERCENTAGE',
    adjustmentValue: '', priority: 1, isActive: true,
    startDate: '', endDate: '', daysOfWeek: [], minAdvanceBookingDays: '', maxAdvanceBookingDays: '',
    minStayNights: '', maxStayNights: '', hotelId: '', roomTypeId: ''
  })
  const set = (f: string, v: any) => setData((p: any) => ({ ...p, [f]: v }))

  const toggleDay = (day: number) => {
    const days = data.daysOfWeek || []
    set('daysOfWeek', days.includes(day) ? days.filter((d: number) => d !== day) : [...days, day])
  }

  const save = async () => {
    setSaving(true)
    try {
      const payload = {
        ...data,
        adjustmentValue: Number(data.adjustmentValue),
        priority: Number(data.priority),
        minAdvanceBookingDays: data.minAdvanceBookingDays ? Number(data.minAdvanceBookingDays) : undefined,
        maxAdvanceBookingDays: data.maxAdvanceBookingDays ? Number(data.maxAdvanceBookingDays) : undefined,
        minStayNights: data.minStayNights ? Number(data.minStayNights) : undefined,
        maxStayNights: data.maxStayNights ? Number(data.maxStayNights) : undefined,
      }
      if (isEdit) await axiosInstance.put(`/api/v1/admin/pricing-rules/${rule.id}`, payload)
      else await axiosInstance.post('/api/v1/admin/pricing-rules', payload)
      onSuccess()
    } catch (e: any) { setErr(e?.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-bold text-gray-900">{isEdit ? 'Edit Pricing Rule' : 'New Pricing Rule'}</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        {err && <div className="mx-5 mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm bg-red-50 text-red-700 flex-shrink-0"><AlertTriangle size={14} />{err}</div>}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className={lbl}>Rule Name *</label><input value={data.ruleName} onChange={e => set('ruleName', e.target.value)} className={inp} placeholder="e.g. Weekend Surcharge" /></div>
            <div><label className={lbl}>Rule Type</label>
              <select value={data.ruleType} onChange={e => set('ruleType', e.target.value)} className={inp + ' bg-white'}>
                {['WEEKEND_SURCHARGE','SEASONAL_PRICING','EARLY_BIRD_DISCOUNT','LAST_MINUTE_DISCOUNT','LONG_STAY_DISCOUNT','OCCUPANCY_BASED','ADVANCE_BOOKING'].map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
              </select>
            </div>
            <div><label className={lbl}>Adjustment Type</label>
              <select value={data.adjustmentType} onChange={e => set('adjustmentType', e.target.value)} className={inp + ' bg-white'}>
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FLAT_AMOUNT">Flat Amount (₹)</option>
              </select>
            </div>
            <div><label className={lbl}>Adjustment Value *</label><input type="number" value={data.adjustmentValue} onChange={e => set('adjustmentValue', e.target.value)} className={inp} placeholder={data.adjustmentType === 'PERCENTAGE' ? '% (use - for discount)' : '₹ (use - for discount)'} /></div>
            <div><label className={lbl}>Priority (higher = applied first)</label><input type="number" value={data.priority} onChange={e => set('priority', e.target.value)} className={inp} /></div>
            <div><label className={lbl}>Start Date</label><input type="date" value={data.startDate} onChange={e => set('startDate', e.target.value)} className={inp} /></div>
            <div><label className={lbl}>End Date</label><input type="date" value={data.endDate} onChange={e => set('endDate', e.target.value)} className={inp} /></div>
            <div><label className={lbl}>Min Advance Booking Days</label><input type="number" value={data.minAdvanceBookingDays} onChange={e => set('minAdvanceBookingDays', e.target.value)} className={inp} /></div>
            <div><label className={lbl}>Max Advance Booking Days</label><input type="number" value={data.maxAdvanceBookingDays} onChange={e => set('maxAdvanceBookingDays', e.target.value)} className={inp} /></div>
            <div><label className={lbl}>Min Stay Nights</label><input type="number" value={data.minStayNights} onChange={e => set('minStayNights', e.target.value)} className={inp} /></div>
            <div><label className={lbl}>Max Stay Nights</label><input type="number" value={data.maxStayNights} onChange={e => set('maxStayNights', e.target.value)} className={inp} /></div>
          </div>

          <div>
            <label className={lbl}>Days of Week (leave empty for all days)</label>
            <div className="flex gap-2 mt-1">
              {DAYS.map((d, i) => (
                <button key={i} type="button" onClick={() => toggleDay(i)}
                  className={`w-10 h-10 rounded-xl text-xs font-medium border transition-colors ${(data.daysOfWeek || []).includes(i) ? 'bg-brand-blue text-white border-brand-blue' : 'border-gray-200 text-gray-600 hover:border-brand-blue'}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="ruleActive" checked={data.isActive} onChange={e => set('isActive', e.target.checked)} className="rounded" />
            <label htmlFor="ruleActive" className="text-sm text-gray-700">Active</label>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm">Cancel</button>
            <button onClick={save} disabled={saving || !data.ruleName} className="flex-1 flex items-center justify-center gap-2 bg-brand-blue hover:bg-blue-700 disabled:bg-blue-300 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} {isEdit ? 'Save' : 'Create'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default function AdminPricingRules() {
  const [rules, setRules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<any | null>(null)
  const [msg, setMsg] = useState('')

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axiosInstance.get('/api/v1/admin/pricing-rules')
      setRules(res.data.data?.content || res.data.data || [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const RULE_TYPE_COLOR: Record<string, string> = {
    WEEKEND_SURCHARGE: 'bg-orange-100 text-orange-700',
    SEASONAL_PRICING: 'bg-blue-100 text-blue-700',
    EARLY_BIRD_DISCOUNT: 'bg-green-100 text-green-700',
    LAST_MINUTE_DISCOUNT: 'bg-purple-100 text-purple-700',
    LONG_STAY_DISCOUNT: 'bg-teal-100 text-teal-700',
    OCCUPANCY_BASED: 'bg-amber-100 text-amber-700',
    ADVANCE_BOOKING: 'bg-cyan-100 text-cyan-700',
  }

  return (
    <>
      <Helmet><title>Pricing Rules | Admin</title></Helmet>
      <div>
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pricing Rules</h1>
            <p className="text-sm text-gray-500">{rules.length} rules configured</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetch} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50"><RefreshCw size={14} /> Refresh</button>
            <button onClick={() => setModal({})} className="flex items-center gap-1.5 px-4 py-2 bg-brand-blue text-white rounded-xl text-sm font-medium hover:bg-blue-700"><Plus size={14} /> New Rule</button>
          </div>
        </div>

        {msg && <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm bg-green-50 text-green-700 border border-green-200"><CheckCircle size={14} />{msg}</div>}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-blue" /></div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Rule Name', 'Type', 'Adjustment', 'Priority', 'Date Range', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rules.map((r: any) => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <TrendingUp size={14} className="text-brand-blue flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-800">{r.ruleName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${RULE_TYPE_COLOR[r.ruleType] || 'bg-gray-100 text-gray-600'}`}>{r.ruleType?.replace(/_/g,' ')}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-bold ${r.adjustmentValue >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {r.adjustmentValue >= 0 ? '+' : ''}{r.adjustmentValue}{r.adjustmentType === 'PERCENTAGE' ? '%' : '₹'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.priority}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {r.startDate ? new Date(r.startDate).toLocaleDateString('en-IN') : '—'} → {r.endDate ? new Date(r.endDate).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{r.isActive ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setModal(r)} className="p-1.5 hover:bg-gray-100 rounded-lg"><Edit2 size={14} className="text-gray-500" /></button>
                        <button onClick={async () => { if (confirm('Delete rule?')) { await axiosInstance.delete(`/api/v1/admin/pricing-rules/${r.id}`); fetch(); flash('Rule deleted!') } }} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={14} className="text-red-500" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rules.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-16 text-gray-400 text-sm">No pricing rules yet. Create your first rule!</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {modal !== null && <RuleModal rule={modal?.id ? modal : null} onClose={() => setModal(null)} onSuccess={() => { setModal(null); fetch(); flash('Rule saved!') }} />}
      </AnimatePresence>
    </>
  )
}
