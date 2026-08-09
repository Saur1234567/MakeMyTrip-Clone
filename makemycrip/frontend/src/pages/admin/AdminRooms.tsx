import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Plus, Edit2, Trash2, X, Save, Loader2,
  BedDouble, Lock, Unlock, AlertTriangle, CheckCircle,
  Hash, Layers, Users
} from 'lucide-react'
import axiosInstance from '@/lib/axios'

const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const lbl = 'block text-xs font-medium text-gray-600 mb-1'
const saveBtnCls = 'flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50'

interface RoomType { id: string; name: string }
interface Room {
  id: string
  roomNumber: string
  floorNumber?: number
  roomTypeId?: string
  isActive?: boolean
  isBlocked?: boolean
  blockReason?: string
  blockedFrom?: string
  blockedUntil?: string
  notes?: string
}

function RoomModal({ hotelId, room, roomTypes, onClose, onSuccess }: {
  hotelId: string
  room: Room | null
  roomTypes: RoomType[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState({
    roomNumber: room?.roomNumber || '',
    floorNumber: room?.floorNumber ?? 1,
    roomTypeId: room?.roomTypeId || (roomTypes[0]?.id || ''),
    isActive: room?.isActive ?? true,
    notes: room?.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.roomNumber.trim()) { setErr('Room number is required'); return }
    setSaving(true); setErr('')
    try {
      if (room) {
        await axiosInstance.put(`/api/v1/admin/rooms/${room.id}`, form)
      } else {
        await axiosInstance.post(`/api/v1/admin/hotels/${hotelId}/rooms`, form)
      }
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
        className="bg-white rounded-2xl shadow-xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">{room ? 'Edit Room' : 'Add Room'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {err && <div className="mx-5 mt-4 bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-2 text-sm">{err}</div>}

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Room Number *</label>
              <input className={inp} value={form.roomNumber} onChange={e => set('roomNumber', e.target.value)} placeholder="e.g. 101" />
            </div>
            <div>
              <label className={lbl}>Floor Number</label>
              <input type="number" className={inp} value={form.floorNumber} onChange={e => set('floorNumber', +e.target.value)} min={0} />
            </div>
          </div>
          <div>
            <label className={lbl}>Room Type</label>
            <select className={inp} value={form.roomTypeId} onChange={e => set('roomTypeId', e.target.value)}>
              {roomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Notes</label>
            <textarea className={inp} rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Internal notes..." />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} className="w-4 h-4 rounded" />
            <span className="text-sm text-gray-700">Active</span>
          </label>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving} className={saveBtnCls}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {room ? 'Save Changes' : 'Add Room'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function BulkModal({ hotelId, roomTypes, onClose, onSuccess }: {
  hotelId: string
  roomTypes: RoomType[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState({
    fromNumber: 101, toNumber: 110, floorNumber: 1,
    roomTypeId: roomTypes[0]?.id || '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    if (form.toNumber < form.fromNumber) { setErr('To must be >= From'); return }
    if (form.toNumber - form.fromNumber > 99) { setErr('Max 100 rooms at once'); return }
    setSaving(true); setErr('')
    try {
      await axiosInstance.post(`/api/v1/admin/hotels/${hotelId}/rooms/bulk`, form)
      onSuccess()
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Bulk create failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Bulk Add Rooms</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {err && <div className="mx-5 mt-4 bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-2 text-sm">{err}</div>}

        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-500">Creates rooms with sequential numbers from <strong>From</strong> to <strong>To</strong>.</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>From Number</label>
              <input type="number" className={inp} value={form.fromNumber} onChange={e => set('fromNumber', +e.target.value)} min={1} />
            </div>
            <div>
              <label className={lbl}>To Number</label>
              <input type="number" className={inp} value={form.toNumber} onChange={e => set('toNumber', +e.target.value)} min={1} />
            </div>
            <div>
              <label className={lbl}>Floor</label>
              <input type="number" className={inp} value={form.floorNumber} onChange={e => set('floorNumber', +e.target.value)} min={0} />
            </div>
          </div>
          <div>
            <label className={lbl}>Room Type</label>
            <select className={inp} value={form.roomTypeId} onChange={e => set('roomTypeId', e.target.value)}>
              {roomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
            </select>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
            Will create {Math.max(0, form.toNumber - form.fromNumber + 1)} rooms (skipping existing numbers)
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving} className={saveBtnCls}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Create Rooms
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function BlockModal({ room, onClose, onSuccess }: {
  room: Room
  onClose: () => void
  onSuccess: () => void
}) {
  const [reason, setReason] = useState(room.blockReason || '')
  const [blockedFrom, setBlockedFrom] = useState(room.blockedFrom?.slice(0, 16) || '')
  const [blockedUntil, setBlockedUntil] = useState(room.blockedUntil?.slice(0, 16) || '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const save = async () => {
    setSaving(true); setErr('')
    try {
      await axiosInstance.put(`/api/v1/admin/rooms/${room.id}/block`, {
        reason,
        blockedFrom: blockedFrom || undefined,
        blockedUntil: blockedUntil || undefined,
      })
      onSuccess()
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Block failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <Lock size={16} className="text-red-500" /> Block Room {room.roomNumber}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {err && <div className="mx-5 mt-4 bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-2 text-sm">{err}</div>}

        <div className="p-5 space-y-4">
          <div>
            <label className={lbl}>Reason</label>
            <input className={inp} value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Maintenance, renovation..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Blocked From</label>
              <input type="datetime-local" className={inp} value={blockedFrom} onChange={e => setBlockedFrom(e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Blocked Until</label>
              <input type="datetime-local" className={inp} value={blockedUntil} onChange={e => setBlockedUntil(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
            Block Room
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default function AdminRooms() {
  const { hotelId } = useParams<{ hotelId: string }>()
  const navigate = useNavigate()
  const [rooms, setRooms] = useState<Room[]>([])
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'add' | 'bulk' | null>(null)
  const [editRoom, setEditRoom] = useState<Room | null>(null)
  const [blockRoom, setBlockRoom] = useState<Room | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [unblocking, setUnblocking] = useState<string | null>(null)
  const [filterFloor, setFilterFloor] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')

  const fetch = useCallback(async () => {
    if (!hotelId) return
    setLoading(true)
    try {
      const [roomsRes, rtRes] = await Promise.all([
        axiosInstance.get(`/api/v1/admin/hotels/${hotelId}/rooms`),
        axiosInstance.get(`/api/v1/admin/hotels/${hotelId}/room-types`),
      ])
      setRooms(roomsRes.data?.data || [])
      setRoomTypes(rtRes.data?.data || [])
    } catch {}
    setLoading(false)
  }, [hotelId])

  useEffect(() => { fetch() }, [fetch])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this room?')) return
    setDeleting(id)
    try {
      await axiosInstance.delete(`/api/v1/admin/rooms/${id}`)
      setRooms(prev => prev.filter(r => r.id !== id))
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  const handleUnblock = async (id: string) => {
    setUnblocking(id)
    try {
      await axiosInstance.put(`/api/v1/admin/rooms/${id}/unblock`)
      fetch()
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Unblock failed')
    } finally {
      setUnblocking(null)
    }
  }

  const floors = [...new Set(rooms.map(r => r.floorNumber).filter(f => f != null))].sort((a, b) => (a as number) - (b as number))

  const filtered = rooms.filter(r => {
    if (filterFloor !== 'all' && String(r.floorNumber) !== filterFloor) return false
    if (filterType !== 'all' && r.roomTypeId !== filterType) return false
    return true
  })

  const getRoomTypeName = (id?: string) => roomTypes.find(rt => rt.id === id)?.name || '—'

  return (
    <>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(`/admin/hotels/${hotelId}/room-types`)} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Rooms</h1>
            <p className="text-sm text-gray-500">{rooms.length} total rooms</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/admin/hotels/${hotelId}/inventory`)}
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              <Users size={15} /> Inventory
            </button>
            <button
              onClick={() => setModal('bulk')}
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              <Layers size={15} /> Bulk Add
            </button>
            <button
              onClick={() => { setEditRoom(null); setModal('add') }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
            >
              <Plus size={15} /> Add Room
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-4">
          <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterFloor} onChange={e => setFilterFloor(e.target.value)}>
            <option value="all">All Floors</option>
            {floors.map(f => <option key={f} value={String(f)}>Floor {f}</option>)}
          </select>
          <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            {roomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
          </select>
          <div className="flex items-center gap-4 ml-auto text-sm text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-400 inline-block" /> Available ({filtered.filter(r => r.isActive && !r.isBlocked).length})</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-400 inline-block" /> Blocked ({filtered.filter(r => r.isBlocked).length})</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-300 inline-block" /> Inactive ({filtered.filter(r => !r.isActive).length})</span>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-blue-600" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <BedDouble size={40} className="mx-auto mb-3 opacity-30" />
            <p>No rooms found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filtered.map(room => {
              const isBlocked = room.isBlocked
              const isInactive = !room.isActive
              const bgColor = isBlocked ? 'bg-red-50 border-red-200' : isInactive ? 'bg-gray-50 border-gray-200' : 'bg-green-50 border-green-200'
              const textColor = isBlocked ? 'text-red-700' : isInactive ? 'text-gray-500' : 'text-green-700'

              return (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`border rounded-xl p-3 ${bgColor} relative group`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className={`font-bold text-base ${textColor}`}>{room.roomNumber}</span>
                    {isBlocked && <Lock size={12} className="text-red-500 mt-0.5" />}
                    {isInactive && !isBlocked && <span className="text-xs text-gray-400">off</span>}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{getRoomTypeName(room.roomTypeId)}</p>
                  {room.floorNumber != null && <p className="text-xs text-gray-400">Floor {room.floorNumber}</p>}
                  {isBlocked && room.blockReason && (
                    <p className="text-xs text-red-500 truncate mt-1" title={room.blockReason}>{room.blockReason}</p>
                  )}

                  {/* Actions overlay */}
                  <div className="absolute inset-0 bg-white/90 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                    <button onClick={() => { setEditRoom(room); setModal('add') }}
                      className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors" title="Edit">
                      <Edit2 size={13} />
                    </button>
                    {isBlocked ? (
                      <button onClick={() => handleUnblock(room.id)}
                        disabled={unblocking === room.id}
                        className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors" title="Unblock">
                        {unblocking === room.id ? <Loader2 size={13} className="animate-spin" /> : <Unlock size={13} />}
                      </button>
                    ) : (
                      <button onClick={() => setBlockRoom(room)}
                        className="p-1.5 bg-amber-100 text-amber-600 rounded-lg hover:bg-amber-200 transition-colors" title="Block">
                        <Lock size={13} />
                      </button>
                    )}
                    <button onClick={() => handleDelete(room.id)}
                      disabled={deleting === room.id}
                      className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors" title="Delete">
                      {deleting === room.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {modal === 'add' && (
          <RoomModal
            hotelId={hotelId!}
            room={editRoom}
            roomTypes={roomTypes}
            onClose={() => { setModal(null); setEditRoom(null) }}
            onSuccess={() => { setModal(null); setEditRoom(null); fetch() }}
          />
        )}
        {modal === 'bulk' && (
          <BulkModal
            hotelId={hotelId!}
            roomTypes={roomTypes}
            onClose={() => setModal(null)}
            onSuccess={() => { setModal(null); fetch() }}
          />
        )}
        {blockRoom && (
          <BlockModal
            room={blockRoom}
            onClose={() => setBlockRoom(null)}
            onSuccess={() => { setBlockRoom(null); fetch() }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
