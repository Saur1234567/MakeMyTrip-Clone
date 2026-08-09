import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Plus, Edit2, Trash2, X, Save, Loader2,
  BedDouble, Users, Image, Upload, Star
} from 'lucide-react'
import axiosInstance from '@/lib/axios'

const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const lbl = 'block text-xs font-medium text-gray-600 mb-1'
const saveBtnCls = 'flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50'

const BASE_URL = 'http://localhost:8081'
const imgUrl = (url?: string) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return BASE_URL + url
}

interface RoomTypeImage {
  id?: string
  imageUrl: string
  thumbnailUrl?: string
  isPrimary?: boolean
  sortOrder?: number
}

interface RoomType {
  id: string
  name: string
  description?: string
  roomCategory?: string
  bedType?: string
  maxOccupancy?: number
  maxAdults?: number
  maxChildren?: number
  roomSizeSqft?: number
  floorNumbers?: string
  viewType?: string
  bathroomType?: string
  basePrice?: number
  extraAdultCharge?: number
  extraChildCharge?: number
  isActive?: boolean
  isAvailableForBooking?: boolean
  sortOrder?: number
  totalRooms?: number
  availableRooms?: number
  images?: RoomTypeImage[]
}

const EMPTY: Partial<RoomType> = {
  name: '', description: '', roomCategory: 'STANDARD', bedType: 'DOUBLE',
  maxOccupancy: 2, maxAdults: 2, maxChildren: 1, roomSizeSqft: 250,
  floorNumbers: '', viewType: '', bathroomType: 'ATTACHED',
  basePrice: 0, extraAdultCharge: 0, extraChildCharge: 0,
  isActive: true, isAvailableForBooking: true, sortOrder: 0,
}

// ── Image Manager for Room Types ─────────────────────────────────────────────
function RoomTypeImageManager({ roomTypeId, images, onRefresh }: {
  roomTypeId: string
  images: RoomTypeImage[]
  onRefresh: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('isPrimary', images.length === 0 ? 'true' : 'false')
        await axiosInstance.post(
          `/api/v1/admin/hotels/room-types/${roomTypeId}/images`,
          fd,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        )
      }
      onRefresh()
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const deleteImg = async (imgId: string) => {
    if (!confirm('Delete this image?')) return
    try {
      await axiosInstance.delete(`/api/v1/admin/hotels/room-types/${roomTypeId}/images/${imgId}`)
      onRefresh()
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Delete failed')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Room Type Images</h3>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
        >
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          Upload Images
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
          onChange={e => upload(e.target.files)} />
      </div>
      {images.length === 0 ? (
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-blue-300 transition-colors"
        >
          <Image size={28} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-400">Click to upload room type images</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {images.map((img, i) => (
            <div key={img.id || i} className="relative group rounded-lg overflow-hidden border border-gray-100 aspect-video bg-gray-50">
              <img src={imgUrl(img.imageUrl)} alt="" className="w-full h-full object-cover" />
              {img.isPrimary && (
                <span className="absolute top-1 left-1 bg-yellow-400 text-yellow-900 text-xs px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5">
                  <Star size={9} /> Primary
                </span>
              )}
              {img.id && (
                <button
                  onClick={() => deleteImg(img.id!)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-lg aspect-video flex items-center justify-center cursor-pointer hover:border-blue-300 transition-colors"
          >
            <Plus size={20} className="text-gray-300" />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Room Type Modal ───────────────────────────────────────────────────────────
function RoomTypeModal({ hotelId, rt, onClose, onSuccess }: {
  hotelId: string
  rt: RoomType | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState<Partial<RoomType>>(rt ? { ...rt } : { ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [savedRt, setSavedRt] = useState<RoomType | null>(rt)
  const [justCreated, setJustCreated] = useState(false)

  const set = (k: keyof RoomType, v: any) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.name?.trim()) { setErr('Room type name is required'); return }
    setSaving(true); setErr('')
    try {
      let result: RoomType
      if (rt) {
        // PUT /api/v1/admin/hotels/room-types/{roomTypeId}  (no hotelId in path)
        const res = await axiosInstance.put(`/api/v1/admin/hotels/room-types/${rt.id}`, form)
        result = res.data?.data
        setSavedRt(result)
        onSuccess()
      } else {
        const res = await axiosInstance.post(`/api/v1/admin/hotels/${hotelId}/room-types`, form)
        result = res.data?.data
        setSavedRt(result)
        setJustCreated(true)
        onSuccess() // refresh list in background, but keep modal open for image upload
      }
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleImageRefresh = async () => {
    if (!savedRt?.id) return
    try {
      const res = await axiosInstance.get(`/api/v1/admin/hotels/${hotelId}/room-types`)
      const list: RoomType[] = res.data?.data || []
      const updated = list.find(r => r.id === savedRt.id)
      if (updated) setSavedRt(updated)
    } catch {}
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-gray-900">{rt ? 'Edit Room Type' : 'New Room Type'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {err && <div className="mx-5 mt-4 bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-2 text-sm">{err}</div>}

        <div className="p-5 space-y-5">
          {/* Basic */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-1">Basic Info</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={lbl}>Name *</label>
                <input className={inp} value={form.name || ''} onChange={e => set('name', e.target.value)} placeholder="e.g. Deluxe King Room" />
              </div>
              <div className="col-span-2">
                <label className={lbl}>Description</label>
                <textarea className={inp} rows={2} value={form.description || ''} onChange={e => set('description', e.target.value)} />
              </div>
              <div>
                <label className={lbl}>Category</label>
                <select className={inp} value={form.roomCategory || ''} onChange={e => set('roomCategory', e.target.value)}>
                  {['STANDARD', 'DELUXE', 'SUPERIOR', 'SUITE', 'VILLA', 'STUDIO', 'PENTHOUSE', 'DORMITORY'].map(c =>
                    <option key={c} value={c}>{c}</option>
                  )}
                </select>
              </div>
              <div>
                <label className={lbl}>Bed Type</label>
                <select className={inp} value={form.bedType || ''} onChange={e => set('bedType', e.target.value)}>
                  {['SINGLE', 'DOUBLE', 'QUEEN', 'KING', 'TWIN', 'BUNK', 'SOFA_BED', 'FUTON'].map(b =>
                    <option key={b} value={b}>{b.replace('_', ' ')}</option>
                  )}
                </select>
              </div>
              <div>
                <label className={lbl}>View Type</label>
                <select className={inp} value={form.viewType || ''} onChange={e => set('viewType', e.target.value)}>
                  <option value="">None</option>
                  {['CITY', 'GARDEN', 'POOL', 'SEA', 'MOUNTAIN', 'COURTYARD', 'LAKE'].map(v =>
                    <option key={v} value={v}>{v}</option>
                  )}
                </select>
              </div>
              <div>
                <label className={lbl}>Bathroom Type</label>
                <select className={inp} value={form.bathroomType || ''} onChange={e => set('bathroomType', e.target.value)}>
                  {['ATTACHED', 'SHARED', 'ENSUITE', 'OPEN'].map(b =>
                    <option key={b} value={b}>{b}</option>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Capacity */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-1">Capacity & Size</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={lbl}>Max Occupancy</label>
                <input type="number" className={inp} value={form.maxOccupancy || ''} onChange={e => set('maxOccupancy', +e.target.value)} min={1} />
              </div>
              <div>
                <label className={lbl}>Max Adults</label>
                <input type="number" className={inp} value={form.maxAdults || ''} onChange={e => set('maxAdults', +e.target.value)} min={1} />
              </div>
              <div>
                <label className={lbl}>Max Children</label>
                <input type="number" className={inp} value={form.maxChildren ?? ''} onChange={e => set('maxChildren', +e.target.value)} min={0} />
              </div>
              <div>
                <label className={lbl}>Room Size (sqft)</label>
                <input type="number" className={inp} value={form.roomSizeSqft || ''} onChange={e => set('roomSizeSqft', +e.target.value)} min={0} />
              </div>
              <div>
                <label className={lbl}>Floor Numbers</label>
                <input className={inp} value={form.floorNumbers || ''} onChange={e => set('floorNumbers', e.target.value)} placeholder="e.g. 3,4,5" />
              </div>
              <div>
                <label className={lbl}>Sort Order</label>
                <input type="number" className={inp} value={form.sortOrder ?? ''} onChange={e => set('sortOrder', +e.target.value)} min={0} />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-1">Pricing</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={lbl}>Base Price (₹/night)</label>
                <input type="number" className={inp} value={form.basePrice || ''} onChange={e => set('basePrice', +e.target.value)} min={0} step={0.01} />
              </div>
              <div>
                <label className={lbl}>Extra Adult (₹)</label>
                <input type="number" className={inp} value={form.extraAdultCharge || ''} onChange={e => set('extraAdultCharge', +e.target.value)} min={0} step={0.01} />
              </div>
              <div>
                <label className={lbl}>Extra Child (₹)</label>
                <input type="number" className={inp} value={form.extraChildCharge || ''} onChange={e => set('extraChildCharge', +e.target.value)} min={0} step={0.01} />
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-1">Status</h3>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!form.isActive} onChange={e => set('isActive', e.target.checked)} className="w-4 h-4 rounded" />
                <span className="text-sm text-gray-700">Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!form.isAvailableForBooking} onChange={e => set('isAvailableForBooking', e.target.checked)} className="w-4 h-4 rounded" />
                <span className="text-sm text-gray-700">Available for Booking</span>
              </label>
            </div>
          </div>

          {/* Images — only shown after room type is saved */}
          {savedRt?.id && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-1">Images</h3>
              <RoomTypeImageManager
                roomTypeId={savedRt.id}
                images={savedRt.images || []}
                onRefresh={handleImageRefresh}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
            {justCreated ? 'Done' : 'Cancel'}
          </button>
          {!justCreated && (
            <button onClick={save} disabled={saving} className={saveBtnCls}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {rt ? 'Save Changes' : 'Create Room Type'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default function AdminRoomTypes() {
  const { hotelId } = useParams<{ hotelId: string }>()
  const navigate = useNavigate()
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [loading, setLoading] = useState(true)
  const [hotelName, setHotelName] = useState('')
  const [modal, setModal] = useState<{ rt: RoomType | null } | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!hotelId) return
    setLoading(true)
    try {
      const [rtRes, hotelRes] = await Promise.all([
        axiosInstance.get(`/api/v1/admin/hotels/${hotelId}/room-types`),
        axiosInstance.get(`/api/v1/admin/hotels/${hotelId}`),
      ])
      setRoomTypes(rtRes.data?.data || [])
      const h = hotelRes.data?.data
      if (h) setHotelName(h.name)
    } catch {}
    setLoading(false)
  }, [hotelId])

  useEffect(() => { fetch() }, [fetch])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this room type? This cannot be undone.')) return
    setDeleting(id)
    try {
      await axiosInstance.delete(`/api/v1/admin/hotels/room-types/${id}`)
      setRoomTypes(prev => prev.filter(r => r.id !== id))
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/admin/hotels')} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Room Types</h1>
            {hotelName && <p className="text-sm text-gray-500">{hotelName}</p>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/admin/hotels/${hotelId}/rooms`)}
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              <BedDouble size={15} /> Rooms
            </button>
            <button
              onClick={() => navigate(`/admin/hotels/${hotelId}/inventory`)}
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              <Users size={15} /> Inventory
            </button>
            <button
              onClick={() => setModal({ rt: null })}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
            >
              <Plus size={15} /> Add Room Type
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-blue-600" /></div>
        ) : roomTypes.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <BedDouble size={40} className="mx-auto mb-3 opacity-30" />
            <p>No room types yet. Add one to get started.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Bed</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Occupancy</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Base Price</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Rooms</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {roomTypes.map(rt => (
                  <motion.tr key={rt.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {rt.images && rt.images.length > 0 ? (
                          <img src={imgUrl(rt.images.find(i => i.isPrimary)?.imageUrl || rt.images[0]?.imageUrl)}
                            alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <Image size={14} className="text-gray-300" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{rt.name}</p>
                          {rt.description && <p className="text-xs text-gray-400 truncate max-w-[160px]">{rt.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{rt.roomCategory}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{rt.bedType?.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {rt.maxOccupancy} max ({rt.maxAdults}A + {rt.maxChildren}C)
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      ₹{rt.basePrice?.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {rt.availableRooms ?? 0} avail
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full w-fit ${rt.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {rt.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {!rt.isAvailableForBooking && (
                          <span className="text-xs px-2 py-0.5 rounded-full w-fit bg-amber-100 text-amber-700">Not bookable</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setModal({ rt })}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(rt.id)}
                          disabled={deleting === rt.id}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
                          {deleting === rt.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {modal && (
          <RoomTypeModal
            hotelId={hotelId!}
            rt={modal.rt}
            onClose={() => setModal(null)}
            onSuccess={() => fetch()}
          />
        )}
      </AnimatePresence>
    </>
  )
}
