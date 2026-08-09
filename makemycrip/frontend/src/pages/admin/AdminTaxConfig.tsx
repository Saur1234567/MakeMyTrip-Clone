import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Loader2, AlertTriangle, RefreshCw, Trash2, Percent, DollarSign, Layers, Check } from 'lucide-react'
import axiosInstance from '@/lib/axios'

const inp = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue'
const lbl = 'block text-xs font-medium text-gray-700 mb-1'

interface TaxSlab { id: string; minAmount: number; maxAmount: number | null; gstRate: number; label: string; isActive: boolean }
interface TaxFee { id: string; feeName: string; feeType: 'FLAT' | 'PERCENT'; amount: number; scope: 'GLOBAL' | 'HOTEL'; hotelId: string | null; isActive: boolean; displayOrder: number }

function SlabModal({ slab, onClose, onSuccess }: { slab: TaxSlab | null; onClose: () => void; onSuccess: () => void }) {
  const isEdit = !!slab
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [d, setD] = useState({ minAmount: slab?.minAmount ?? 0, maxAmount: slab?.maxAmount ?? '' as number | '', gstRate: slab?.gstRate ?? 0, label: slab?.label ?? '', isActive: slab?.isActive ?? true })
  const s = (k: string, v: any) => setD(p => ({ ...p, [k]: v }))
  const save = async () => {
    setSaving(true); setErr('')
    try {
      const payload = { ...d, minAmount: Number(d.minAmount), maxAmount: d.maxAmount === '' ? null : Number(d.maxAmount), gstRate: Number(d.gstRate) }
      if (isEdit) await axiosInstance.put(`/api/v1/admin/tax-config/slabs/${slab!.id}`, payload)
      else await axiosInstance.post('/api/v1/admin/tax-config/slabs', payload)
      onSuccess()
    } catch (e: any) { setErr(e?.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">{isEdit ? 'Edit GST Slab' : 'New GST Slab'}</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        {err && <div className="mx-5 mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm bg-red-50 text-red-700"><AlertTriangle size={14} />{err}</div>}
        <div className="p-5 space-y-3">
          <div><label className={lbl}>Label *</label><input value={d.label} onChange={e => s('label', e.target.value)} className={inp} placeholder="e.g. Budget (₹0–₹1,000)" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Min Amount (₹) *</label><input type="number" min={0} step={0.01} value={d.minAmount} onChange={e => s('minAmount', e.target.value)} className={inp} /></div>
            <div><label className={lbl}>Max Amount (₹, blank=∞)</label><input type="number" min={0} step={0.01} value={d.maxAmount} onChange={e => s('maxAmount', e.target.value)} placeholder="No limit" className={inp} /></div>
          </div>
          <div><label className={lbl}>GST Rate (%) *</label><input type="number" min={0} max={100} step={0.01} value={d.gstRate} onChange={e => s('gstRate', e.target.value)} className={inp} /></div>
          <div className="flex items-center gap-2"><input type="checkbox" id="sa" checked={d.isActive} onChange={e => s('isActive', e.target.checked)} className="rounded" /><label htmlFor="sa" className="text-sm text-gray-700">Active</label></div>
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm">Cancel</button>
            <button onClick={save} disabled={saving} className="flex-1 flex items-center justify-center gap-2 bg-brand-blue hover:bg-blue-700 disabled:bg-blue-300 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors">
              {saving && <Loader2 size={14} className="animate-spin" />}{saving ? 'Saving…' : isEdit ? 'Update' : 'Add Slab'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function FeeModal({ fee, onClose, onSuccess }: { fee: TaxFee | null; onClose: () => void; onSuccess: () => void }) {
  const isEdit = !!fee
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [d, setD] = useState({ feeName: fee?.feeName ?? '', feeType: fee?.feeType ?? 'FLAT' as 'FLAT' | 'PERCENT', amount: fee?.amount ?? 0, scope: fee?.scope ?? 'GLOBAL' as 'GLOBAL' | 'HOTEL', hotelId: fee?.hotelId ?? '', isActive: fee?.isActive ?? true, displayOrder: fee?.displayOrder ?? 0 })
  const s = (k: string, v: any) => setD(p => ({ ...p, [k]: v }))
  const save = async () => {
    setSaving(true); setErr('')
    try {
      const payload = { ...d, amount: Number(d.amount), displayOrder: Number(d.displayOrder), hotelId: d.scope === 'HOTEL' && d.hotelId ? d.hotelId : null }
      if (isEdit) await axiosInstance.put(`/api/v1/admin/tax-config/fees/${fee!.id}`, payload)
      else await axiosInstance.post('/api/v1/admin/tax-config/fees', payload)
      onSuccess()
    } catch (e: any) { setErr(e?.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">{isEdit ? 'Edit Fee' : 'New Fee'}</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        {err && <div className="mx-5 mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm bg-red-50 text-red-700"><AlertTriangle size={14} />{err}</div>}
        <div className="p-5 space-y-3">
          <div><label className={lbl}>Fee Name *</label><input value={d.feeName} onChange={e => s('feeName', e.target.value)} className={inp} placeholder="e.g. Convenience Fee" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Fee Type</label>
              <select value={d.feeType} onChange={e => s('feeType', e.target.value)} className={inp + ' bg-white'}>
                <option value="FLAT">Flat (₹)</option><option value="PERCENT">Percent (%)</option>
              </select>
            </div>
            <div><label className={lbl}>Amount ({d.feeType === 'FLAT' ? '₹' : '%'}) *</label><input type="number" min={0} step={0.01} value={d.amount} onChange={e => s('amount', e.target.value)} className={inp} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Scope</label>
              <select value={d.scope} onChange={e => s('scope', e.target.value)} className={inp + ' bg-white'}>
                <option value="GLOBAL">Global (all hotels)</option><option value="HOTEL">Hotel-specific</option>
              </select>
            </div>
            <div><label className={lbl}>Display Order</label><input type="number" min={0} value={d.displayOrder} onChange={e => s('displayOrder', e.target.value)} className={inp} /></div>
          </div>
          {d.scope === 'HOTEL' && (
            <div><label className={lbl}>Hotel ID (UUID)</label><input value={d.hotelId} onChange={e => s('hotelId', e.target.value)} className={inp + ' font-mono'} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" /></div>
          )}
          <div className="flex items-center gap-2"><input type="checkbox" id="fa" checked={d.isActive} onChange={e => s('isActive', e.target.checked)} className="rounded" /><label htmlFor="fa" className="text-sm text-gray-700">Active</label></div>
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm">Cancel</button>
            <button onClick={save} disabled={saving} className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors">
              {saving && <Loader2 size={14} className="animate-spin" />}{saving ? 'Saving…' : isEdit ? 'Update' : 'Add Fee'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function DelConfirm({ label, onConfirm, onCancel, busy }: { label: string; onConfirm: () => void; onCancel: () => void; busy: boolean }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={24} className="text-red-600" /></div>
        <h3 className="text-base font-bold text-gray-900 mb-1">Delete "{label}"?</h3>
        <p className="text-sm text-gray-500 mb-5">This action cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm">Cancel</button>
          <button onClick={onConfirm} disabled={busy} className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white px-3 py-2 rounded-xl text-sm font-bold transition-colors">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}{busy ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default function AdminTaxConfig() {
  const [slabs, setSlabs] = useState<TaxSlab[]>([])
  const [slabsLoading, setSlabsLoading] = useState(true)
  const [slabModal, setSlabModal] = useState<{ open: boolean; item: TaxSlab | null }>({ open: false, item: null })
  const [slabDel, setSlabDel] = useState<TaxSlab | null>(null)
  const [slabDelBusy, setSlabDelBusy] = useState(false)

  const [fees, setFees] = useState<TaxFee[]>([])
  const [feesLoading, setFeesLoading] = useState(true)
  const [feeModal, setFeeModal] = useState<{ open: boolean; item: TaxFee | null }>({ open: false, item: null })
  const [feeDel, setFeeDel] = useState<TaxFee | null>(null)
  const [feeDelBusy, setFeeDelBusy] = useState(false)

  const fetchSlabs = useCallback(async () => {
    setSlabsLoading(true)
    try {
      const r = await axiosInstance.get('/api/v1/admin/tax-config/slabs')
      // ApiResponse envelope: { success, data: [...], message }
      const raw = r.data
      const list = Array.isArray(raw) ? raw
        : Array.isArray(raw?.data) ? raw.data
        : Array.isArray(raw?.content) ? raw.content
        : []
      setSlabs(list)
    } catch { setSlabs([]) }
    finally { setSlabsLoading(false) }
  }, [])

  const fetchFees = useCallback(async () => {
    setFeesLoading(true)
    try {
      const r = await axiosInstance.get('/api/v1/admin/tax-config/fees')
      // ApiResponse envelope: { success, data: [...], message }
      const raw = r.data
      const list = Array.isArray(raw) ? raw
        : Array.isArray(raw?.data) ? raw.data
        : Array.isArray(raw?.content) ? raw.content
        : []
      setFees(list)
    } catch { setFees([]) }
    finally { setFeesLoading(false) }
  }, [])

  useEffect(() => { fetchSlabs() }, [fetchSlabs])
  useEffect(() => { fetchFees() }, [fetchFees])

  const doDeleteSlab = async () => {
    if (!slabDel) return
    setSlabDelBusy(true)
    try { await axiosInstance.delete(`/api/v1/admin/tax-config/slabs/${slabDel.id}`); setSlabDel(null); fetchSlabs() }
    catch { /* keep open */ }
    finally { setSlabDelBusy(false) }
  }

  const doDeleteFee = async () => {
    if (!feeDel) return
    setFeeDelBusy(true)
    try { await axiosInstance.delete(`/api/v1/admin/tax-config/fees/${feeDel.id}`); setFeeDel(null); fetchFees() }
    catch { /* keep open */ }
    finally { setFeeDelBusy(false) }
  }

  const activeBadge = (active: boolean) => active
    ? <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-0.5 rounded-full text-xs font-medium"><Check size={11} />Active</span>
    : <span className="inline-flex items-center gap-1 text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full text-xs font-medium">Inactive</span>

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tax Configuration</h1>
          <p className="text-sm text-gray-500 mt-1">Manage tiered GST slabs and platform fees applied during booking pricing.</p>
        </div>
        <button onClick={() => { fetchSlabs(); fetchFees() }}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl px-3 py-2 hover:bg-gray-50 transition-colors">
          <RefreshCw size={14} />Refresh
        </button>
      </div>

      {/* GST Slabs */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-brand-blue" />
            <h2 className="text-base font-semibold text-gray-900">GST Slabs</h2>
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{slabs.length} slabs</span>
          </div>
          <button onClick={() => setSlabModal({ open: true, item: null })}
            className="flex items-center gap-1.5 bg-brand-blue text-white text-sm font-medium px-3 py-1.5 rounded-xl hover:bg-blue-700 transition-colors">
            <Plus size={15} />Add Slab
          </button>
        </div>
        {slabsLoading ? (
          <div className="p-8 flex items-center justify-center gap-2 text-gray-400 text-sm"><Loader2 size={16} className="animate-spin" />Loading…</div>
        ) : slabs.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No GST slabs configured yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-6 py-3 text-left">Label</th>
                  <th className="px-6 py-3 text-right">Min (₹)</th>
                  <th className="px-6 py-3 text-right">Max (₹)</th>
                  <th className="px-6 py-3 text-right">GST Rate</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {slabs.map((slab: TaxSlab) => (
                  <tr key={slab.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-gray-900">{slab.label}</td>
                    <td className="px-6 py-3 text-right text-gray-600">₹{Number(slab.minAmount).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-3 text-right text-gray-600">
                      {slab.maxAmount != null ? `₹${Number(slab.maxAmount).toLocaleString('en-IN')}` : <span className="text-gray-400 italic">No limit</span>}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span className="inline-flex items-center gap-1 font-semibold text-blue-700"><Percent size={12} />{slab.gstRate}%</span>
                    </td>
                    <td className="px-6 py-3 text-center">{activeBadge(slab.isActive)}</td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setSlabModal({ open: true, item: slab })} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">✏️</button>
                        <button onClick={() => setSlabDel(slab)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Platform Fees */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <DollarSign size={18} className="text-emerald-600" />
            <h2 className="text-base font-semibold text-gray-900">Platform Fees</h2>
            <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{fees.length} fees</span>
          </div>
          <button onClick={() => setFeeModal({ open: true, item: null })}
            className="flex items-center gap-1.5 bg-emerald-600 text-white text-sm font-medium px-3 py-1.5 rounded-xl hover:bg-emerald-700 transition-colors">
            <Plus size={15} />Add Fee
          </button>
        </div>
        {feesLoading ? (
          <div className="p-8 flex items-center justify-center gap-2 text-gray-400 text-sm"><Loader2 size={16} className="animate-spin" />Loading…</div>
        ) : fees.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No platform fees configured yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-6 py-3 text-left">Fee Name</th>
                  <th className="px-6 py-3 text-center">Type</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3 text-center">Scope</th>
                  <th className="px-6 py-3 text-center">Order</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {fees.map((fee: TaxFee) => (
                  <tr key={fee.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-gray-900">{fee.feeName}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${fee.feeType === 'FLAT' ? 'bg-purple-50 text-purple-700' : 'bg-orange-50 text-orange-700'}`}>
                        {fee.feeType === 'FLAT' ? <DollarSign size={10} /> : <Percent size={10} />}{fee.feeType}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-semibold text-gray-700">
                      {fee.feeType === 'FLAT' ? `₹${Number(fee.amount).toLocaleString('en-IN')}` : `${fee.amount}%`}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${fee.scope === 'GLOBAL' ? 'bg-blue-50 text-blue-700' : 'bg-yellow-50 text-yellow-700'}`}>
                        {fee.scope === 'GLOBAL' ? '🌐 Global' : '🏨 Hotel'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center text-gray-500">{fee.displayOrder}</td>
                    <td className="px-6 py-3 text-center">{activeBadge(fee.isActive)}</td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setFeeModal({ open: true, item: fee })} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">✏️</button>
                        <button onClick={() => setFeeDel(fee)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modals */}
      <AnimatePresence>
        {slabModal.open && (
          <SlabModal slab={slabModal.item} onClose={() => setSlabModal({ open: false, item: null })} onSuccess={() => { setSlabModal({ open: false, item: null }); fetchSlabs() }} />
        )}
        {slabDel && (
          <DelConfirm label={slabDel.label} onConfirm={doDeleteSlab} onCancel={() => setSlabDel(null)} busy={slabDelBusy} />
        )}
        {feeModal.open && (
          <FeeModal fee={feeModal.item} onClose={() => setFeeModal({ open: false, item: null })} onSuccess={() => { setFeeModal({ open: false, item: null }); fetchFees() }} />
        )}
        {feeDel && (
          <DelConfirm label={feeDel.feeName} onConfirm={doDeleteFee} onCancel={() => setFeeDel(null)} busy={feeDelBusy} />
        )}
      </AnimatePresence>
    </div>
  )
}
