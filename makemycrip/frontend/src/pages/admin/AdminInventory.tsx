import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, ChevronLeft, ChevronRight, Save, Loader2,
  X, Edit2, Lock, BedDouble
} from 'lucide-react'
import {
  format, addDays, startOfMonth, endOfMonth, eachDayOfInterval,
  addMonths, subMonths, isToday, isBefore, startOfDay
} from 'date-fns'
import axiosInstance from '@/lib/axios'

const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const lbl = 'block text-xs font-medium text-gray-600 mb-1'

interface RoomType { id: string; name: string; basePrice?: number }
interface InventoryItem {
  id: string
  roomTypeId: string
  date: string
  totalRooms: number
  availableRooms: number
  bookedRooms: number
  adminOverridePrice?: number
  minPriceFloor?: number
  maxPriceCeiling?: number
  isBlocked?: boolean
  blockReason?: string
  minNights?: number
  maxNights?: number
  closedToArrival?: boolean
  closedToDeparture?: boolean
  occupancyPercent?: number
}

function EditModal({ item, onClose, onSuccess }: {
  item: InventoryItem
  onClose: () => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState({
    availableRooms: String(item.availableRooms ?? ''),
    adminOverridePrice: item.adminOverridePrice != null ? String(item.adminOverridePrice) : '',
    minPriceFloor: item.minPriceFloor != null ? String(item.minPriceFloor) : '',
    maxPriceCeiling: item.maxPriceCeiling != null ? String(item.maxPriceCeiling) : '',
    isBlocked: item.isBlocked ?? false,
    blockReason: item.blockReason ?? '',
    minNights: item.minNights != null ? String(item.minNights) : '',
    maxNights: item.maxNights != null ? String(item.maxNights) : '',
    closedToArrival: item.closedToArrival ?? false,
    closedToDeparture: item.closedToDeparture ?? false,
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    setSaving(true); setErr('')
    const payload: any = {}
    if (form.availableRooms !== '') payload.availableRooms = +form.availableRooms
    if (form.adminOverridePrice !== '') payload.adminOverridePrice = +form.adminOverridePrice
    if (form.minPriceFloor !== '') payload.minPriceFloor = +form.minPriceFloor
    if (form.maxPriceCeiling !== '') payload.maxPriceCeiling = +form.maxPriceCeiling
    payload.isBlocked = form.isBlocked
    if (form.blockReason) payload.blockReason = form.blockReason
    if (form.minNights !== '') payload.minNights = +form.minNights
    if (form.maxNights !== '') payload.maxNights = +form.maxNights
    payload.closedToArrival = form.closedToArrival
    payload.closedToDeparture = form.closedToDeparture
    try {
      await axiosInstance.put(`/api/v1/admin/inventory/${item.roomTypeId}/${item.date}`, payload)
      onSuccess()
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="font-bold text-gray-900">Edit Inventory</h2>
            <p className="text-xs text-gray-500">{format(new Date(item.date + 'T00:00:00'), 'EEEE, d MMMM yyyy')}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {err && <div className="mx-5 mt-4 bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-2 text-sm">{err}</div>}

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-xl p-3 text-sm">
            <div><span className="text-gray-500">Total Rooms:</span> <strong>{item.totalRooms}</strong></div>
            <div><span className="text-gray-500">Booked:</span> <strong>{item.bookedRooms}</strong></div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-1">Availability</h3>
            <div>
              <label className={lbl}>Available Rooms</label>
              <input type="number" className={inp} value={form.availableRooms}
                onChange={e => set('availableRooms', e.target.value)} min={0} max={item.totalRooms} />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-1">Pricing Overrides</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={lbl}>Override Price (₹)</label>
                <input type="number" className={inp} value={form.adminOverridePrice}
                  onChange={e => set('adminOverridePrice', e.target.value)} min={0} placeholder="Base price" />
              </div>
              <div>
                <label className={lbl}>Min Floor (₹)</label>
                <input type="number" className={inp} value={form.minPriceFloor}
                  onChange={e => set('minPriceFloor', e.target.value)} min={0} />
              </div>
              <div>
                <label className={lbl}>Max Ceiling (₹)</label>
                <input type="number" className={inp} value={form.maxPriceCeiling}
                  onChange={e => set('maxPriceCeiling', e.target.value)} min={0} />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-1">Stay Restrictions</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Min Nights</label>
                <input type="number" className={inp} value={form.minNights}
                  onChange={e => set('minNights', e.target.value)} min={1} />
              </div>
              <div>
                <label className={lbl}>Max Nights</label>
                <input type="number" className={inp} value={form.maxNights}
                  onChange={e => set('maxNights', e.target.value)} min={1} />
              </div>
            </div>
            <div className="flex gap-6 mt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.closedToArrival}
                  onChange={e => set('closedToArrival', e.target.checked)} className="w-4 h-4 rounded" />
                <span className="text-sm text-gray-700">Closed to Arrival</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.closedToDeparture}
                  onChange={e => set('closedToDeparture', e.target.checked)} className="w-4 h-4 rounded" />
                <span className="text-sm text-gray-700">Closed to Departure</span>
              </label>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-1">Block</h3>
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input type="checkbox" checked={form.isBlocked}
                onChange={e => set('isBlocked', e.target.checked)} className="w-4 h-4 rounded" />
              <span className="text-sm text-gray-700">Block this date</span>
            </label>
            {form.isBlocked && (
              <div>
                <label className={lbl}>Block Reason</label>
                <input className={inp} value={form.blockReason}
                  onChange={e => set('blockReason', e.target.value)} placeholder="e.g. Maintenance" />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Changes
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function BulkEditModal({ roomTypeId, roomTypeName, onClose, onSuccess }: {
  roomTypeId: string
  roomTypeName: string
  onClose: () => void
  onSuccess: () => void
}) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(format(addDays(new Date(), 30), 'yyyy-MM-dd'))
  const [form, setForm] = useState({
    availableRooms: '', adminOverridePrice: '', minPriceFloor: '',
    maxPriceCeiling: '', isBlocked: false, blockReason: '',
    minNights: '', maxNights: '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [success, setSuccess] = useState('')

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    setSaving(true); setErr(''); setSuccess('')
    const payload: any = {}
    if (form.availableRooms !== '') payload.availableRooms = +form.availableRooms
    if (form.adminOverridePrice !== '') payload.adminOverridePrice = +form.adminOverridePrice
    if (form.minPriceFloor !== '') payload.minPriceFloor = +form.minPriceFloor
    if (form.maxPriceCeiling !== '') payload.maxPriceCeiling = +form.maxPriceCeiling
    payload.isBlocked = form.isBlocked
    if (form.blockReason) payload.blockReason = form.blockReason
    if (form.minNights !== '') payload.minNights = +form.minNights
    if (form.maxNights !== '') payload.maxNights = +form.maxNights
    try {
      const res = await axiosInstance.put(
        `/api/v1/admin/inventory/${roomTypeId}/bulk?from=${from}&to=${to}`,
        payload
      )
      const count = res.data?.data?.updated || 0
      setSuccess(`Updated ${count} inventory records`)
      onSuccess()
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Bulk update failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="font-bold text-gray-900">Bulk Edit Inventory</h2>
            <p className="text-xs text-gray-500">{roomTypeName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {err && <div className="mx-5 mt-4 bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-2 text-sm">{err}</div>}
        {success && <div className="mx-5 mt-4 bg-green-50 text-green-700 border border-green-200 rounded-lg px-4 py-2 text-sm">{success}</div>}

        <div className="p-5 space-y-5">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
            Only filled fields will be updated. Leave blank to keep existing values.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>From Date</label>
              <input type="date" className={inp} value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div>
              <label className={lbl}>To Date</label>
              <input type="date" className={inp} value={to} onChange={e => setTo(e.target.value)} />
            </div>
          </div>

          <div>
            <label className={lbl}>Available Rooms</label>
            <input type="number" className={inp} value={form.availableRooms}
              onChange={e => set('availableRooms', e.target.value)} min={0} placeholder="Leave blank to keep" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>Override Price (₹)</label>
              <input type="number" className={inp} value={form.adminOverridePrice}
                onChange={e => set('adminOverridePrice', e.target.value)} min={0} />
            </div>
            <div>
              <label className={lbl}>Min Floor (₹)</label>
              <input type="number" className={inp} value={form.minPriceFloor}
                onChange={e => set('minPriceFloor', e.target.value)} min={0} />
            </div>
            <div>
              <label className={lbl}>Max Ceiling (₹)</label>
              <input type="number" className={inp} value={form.maxPriceCeiling}
                onChange={e => set('maxPriceCeiling', e.target.value)} min={0} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Min Nights</label>
              <input type="number" className={inp} value={form.minNights}
                onChange={e => set('minNights', e.target.value)} min={1} />
            </div>
            <div>
              <label className={lbl}>Max Nights</label>
              <input type="number" className={inp} value={form.maxNights}
                onChange={e => set('maxNights', e.target.value)} min={1} />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isBlocked}
              onChange={e => set('isBlocked', e.target.checked)} className="w-4 h-4 rounded" />
            <span className="text-sm text-gray-700">Block all dates in range</span>
          </label>
          {form.isBlocked && (
            <div>
              <label className={lbl}>Block Reason</label>
              <input className={inp} value={form.blockReason}
                onChange={e => set('blockReason', e.target.value)} />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Apply to Range
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default function AdminInventory() {
  const { hotelId } = useParams<{ hotelId: string }>()
  const navigate = useNavigate()
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [selectedRoomType, setSelectedRoomType] = useState<string>('')
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [editItem, setEditItem] = useState<InventoryItem | null>(null)
  const [bulkEdit, setBulkEdit] = useState(false)

  useEffect(() => {
    if (!hotelId) return
    axiosInstance.get(`/api/v1/admin/hotels/${hotelId}/room-types`).then(res => {
      const rts: RoomType[] = res.data?.data || []
      setRoomTypes(rts)
      if (rts.length > 0) setSelectedRoomType(rts[0].id)
    }).catch(() => {})
  }, [hotelId])

  const fetchInventory = useCallback(async () => {
    if (!hotelId || !selectedRoomType) return
    setLoading(true)
    const from = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
    const to = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
    try {
      const res = await axiosInstance.get(`/api/v1/admin/hotels/${hotelId}/inventory?from=${from}&to=${to}`)
      const all: InventoryItem[] = res.data?.data || []
      setInventory(all.filter(i => i.roomTypeId === selectedRoomType))
    } catch {}
    setLoading(false)
  }, [hotelId, selectedRoomType, currentMonth])

  useEffect(() => { fetchInventory() }, [fetchInventory])

  const getItemForDate = (date: Date): InventoryItem | undefined => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return inventory.find(i => i.date === dateStr)
  }

  const getOccupancyColor = (item?: InventoryItem) => {
    if (!item) return 'bg-gray-50 border-gray-100'
    if (item.isBlocked) return 'bg-red-50 border-red-200'
    const pct = item.totalRooms > 0 ? (item.bookedRooms / item.totalRooms) * 100 : 0
    if (pct >= 90) return 'bg-red-50 border-red-200'
    if (pct >= 70) return 'bg-amber-50 border-amber-200'
    if (pct >= 40) return 'bg-yellow-50 border-yellow-100'
    return 'bg-green-50 border-green-100'
  }

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  const startDow = startOfMonth(currentMonth).getDay()
  const selectedRoomTypeName = roomTypes.find(rt => rt.id === selectedRoomType)?.name || ''

  return (
    <>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(`/admin/hotels/${hotelId}/rooms`)} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Inventory Calendar</h1>
            <p className="text-sm text-gray-500">Manage availability, pricing &amp; restrictions</p>
          </div>
          <button
            onClick={() => setBulkEdit(true)}
            disabled={!selectedRoomType}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            <Edit2 size={15} /> Bulk Edit
          </button>
        </div>

        {/* Room Type Tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {roomTypes.map(rt => (
            <button
              key={rt.id}
              onClick={() => setSelectedRoomType(rt.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedRoomType === rt.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <BedDouble size={14} /> {rt.name}
              {rt.basePrice != null && (
                <span className="opacity-70">₹{rt.basePrice.toLocaleString('en-IN')}</span>
              )}
            </button>
          ))}
        </div>

        {/* Month Nav */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCurrentMonth(m => subMonths(m, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft size={18} />
          </button>
          <h2 className="text-lg font-bold text-gray-900">{format(currentMonth, 'MMMM yyyy')}</h2>
          <button onClick={() => setCurrentMonth(m => addMonths(m, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mb-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-100 border border-green-200 inline-block" /> Low occupancy</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-100 inline-block" /> Moderate</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-200 inline-block" /> High</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 border border-red-200 inline-block" /> Full / Blocked</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-blue-600" /></div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-7 border-b border-gray-100">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="px-2 py-2 text-center text-xs font-semibold text-gray-500">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {Array.from({ length: startDow }).map((_, i) => (
                <div key={`empty-${i}`} className="border-r border-b border-gray-50 min-h-[90px] bg-gray-50/30" />
              ))}

              {days.map(day => {
                const item = getItemForDate(day)
                const isPast = isBefore(startOfDay(day), startOfDay(new Date()))
                const colorClass = getOccupancyColor(item)
                const todayRing = isToday(day) ? 'ring-2 ring-blue-400 ring-inset' : ''

                return (
                  <div
                    key={day.toISOString()}
                    className={`border-r border-b border-gray-100 min-h-[90px] p-1.5 cursor-pointer hover:brightness-95 transition-all ${colorClass} ${todayRing} ${isPast ? 'opacity-60' : ''}`}
                    onClick={() => item && setEditItem(item)}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className={`text-xs font-semibold ${isToday(day) ? 'text-blue-600' : 'text-gray-700'}`}>
                        {format(day, 'd')}
                      </span>
                      {item?.isBlocked && <Lock size={10} className="text-red-500 mt-0.5" />}
                    </div>

                    {item ? (
                      <div className="space-y-0.5">
                        <div className="text-xs text-gray-600">
                          <span className="font-medium">{item.availableRooms}</span>
                          <span className="text-gray-400">/{item.totalRooms}</span>
                        </div>
                        {item.adminOverridePrice != null && (
                          <div className="text-xs font-semibold text-blue-600">
                            ₹{item.adminOverridePrice.toLocaleString('en-IN')}
                          </div>
                        )}
                        {item.bookedRooms > 0 && (
                          <div className="text-xs text-gray-500">{item.bookedRooms} booked</div>
                        )}
                        {(item.closedToArrival || item.closedToDeparture) && (
                          <div className="text-xs text-red-500">
                            {[item.closedToArrival && 'CTA', item.closedToDeparture && 'CTD'].filter(Boolean).join('/')}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-300">No data</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Summary */}
        {inventory.length > 0 && (
          <div className="mt-4 grid grid-cols-4 gap-3">
            {[
              { label: 'Total Rooms', value: inventory[0]?.totalRooms ?? 0, color: 'text-gray-900' },
              {
                label: 'Avg Available',
                value: Math.round(inventory.reduce((s, i) => s + i.availableRooms, 0) / inventory.length),
                color: 'text-green-600'
              },
              { label: 'Blocked Days', value: inventory.filter(i => i.isBlocked).length, color: 'text-red-600' },
              {
                label: 'Avg Occupancy',
                value: `${Math.round(inventory.reduce((s, i) => s + (i.occupancyPercent ?? 0), 0) / inventory.length)}%`,
                color: 'text-blue-600'
              },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {editItem && (
          <EditModal
            item={editItem}
            onClose={() => setEditItem(null)}
            onSuccess={() => { setEditItem(null); fetchInventory() }}
          />
        )}
        {bulkEdit && selectedRoomType && (
          <BulkEditModal
            roomTypeId={selectedRoomType}
            roomTypeName={selectedRoomTypeName}
            onClose={() => setBulkEdit(false)}
            onSuccess={() => { setBulkEdit(false); fetchInventory() }}
          />
        )}
      </AnimatePresence>
    </>
  )
}