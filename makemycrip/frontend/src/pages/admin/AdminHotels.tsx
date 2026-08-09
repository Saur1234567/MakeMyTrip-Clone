import { useState, useEffect, useCallback, useRef } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Edit2, Power, X, Building2, Loader2, CheckCircle, AlertTriangle, MapPin, Image, Globe, Phone, Shield, HelpCircle, Settings, Tag, Save, Trash2, RefreshCw, Star, BedDouble, CalendarDays } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import axiosInstance from '@/lib/axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8081'
const imgUrl = (url?: string) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `${API_BASE}${url}`
}

interface HotelImage { id: string; imageUrl: string; isPrimary?: boolean; caption?: string; category?: string }
interface Hotel {
  id: string; name: string; slug: string; description?: string; shortDescription?: string
  hotelType?: string; starRating: number; city: string; state?: string; country?: string
  pincode?: string; addressLine1?: string; addressLine2?: string; neighborhood?: string
  latitude?: number; longitude?: number; distanceFromAirport?: number; distanceFromCityCenter?: number
  primaryPhone?: string; secondaryPhone?: string; email?: string; website?: string
  facebookUrl?: string; instagramUrl?: string; gstin?: string; panNumber?: string
  checkinTime?: string; checkoutTime?: string; minimumAgeCheckin?: number
  totalFloors?: number; totalRooms?: number; yearBuilt?: number; yearRenovated?: number
  cancellationPolicy?: string; cancellationPolicyDetails?: string
  petsAllowed?: boolean; smokingAllowed?: boolean; eventsAllowed?: boolean
  status?: string; isFeatured?: boolean; isVerified?: boolean
  images?: HotelImage[]; amenities?: any[]; nearbyPlaces?: any[]; policies?: any[]; faqs?: any[]
}

const inp = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue'
const lbl = 'block text-xs font-medium text-gray-700 mb-1'
const saveBtnCls = 'flex items-center gap-2 bg-brand-blue hover:bg-blue-700 disabled:bg-blue-300 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors'

function StatusBadge({ status }: { status?: string }) {
  const s = status ?? 'UNKNOWN'
  const styles: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700', INACTIVE: 'bg-gray-100 text-gray-600',
    UNDER_RENOVATION: 'bg-amber-100 text-amber-700', TEMPORARILY_CLOSED: 'bg-orange-100 text-orange-700',
    PERMANENTLY_CLOSED: 'bg-red-100 text-red-700', UNKNOWN: 'bg-gray-100 text-gray-500',
  }
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[s] || styles.UNKNOWN}`}>{s.replace(/_/g, ' ')}</span>
}

function TabBtn({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${active ? 'bg-brand-blue text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
      <Icon size={13} />{label}
    </button>
  )
}

function ImageManager({ hotelId, images, onRefresh }: { hotelId: string; images: HotelImage[]; onRefresh: () => void }) {
  const [uploading, setUploading] = useState(false)
  const [editImg, setEditImg] = useState<HotelImage | null>(null)
  const [caption, setCaption] = useState('')
  const [category, setCategory] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const CATS = ['EXTERIOR','LOBBY','ROOM','BATHROOM','POOL','GYM','RESTAURANT','AMENITY','OTHER']
  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    try {
      for (const f of Array.from(files)) {
        const fd = new FormData()
        fd.append('file', f)
        fd.append('category', 'EXTERIOR')
        await axiosInstance.post(`/api/v1/admin/hotels/${hotelId}/images`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      }
      onRefresh()
    } catch (e) { console.error(e) } finally { setUploading(false) }
  }
  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-brand-blue hover:bg-blue-50 transition-colors"
        onClick={() => fileRef.current?.click()} onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); upload(e.dataTransfer.files) }}>
        <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={e => upload(e.target.files)} />
        {uploading ? <Loader2 size={24} className="animate-spin text-brand-blue mx-auto mb-2" /> : <Image size={24} className="text-gray-400 mx-auto mb-2" />}
        <p className="text-sm text-gray-600 font-medium">{uploading ? 'Uploading...' : 'Click or drag & drop images'}</p>
        <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP up to 10MB each</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {images.map(img => (
          <div key={img.id} className="relative group rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
            <img src={imgUrl(img.imageUrl)} alt={img.caption || ''} className="w-full h-28 object-cover" />
            {img.isPrimary && <div className="absolute top-1 left-1 bg-yellow-400 text-yellow-900 text-xs font-bold px-1.5 py-0.5 rounded-full">Primary</div>}
            {img.category && <div className="absolute top-1 right-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded-full">{img.category}</div>}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
              <button onClick={() => { setEditImg(img); setCaption(img.caption || ''); setCategory(img.category || 'EXTERIOR') }} className="bg-white text-gray-800 text-xs px-2 py-1 rounded-lg font-medium">Edit</button>
              {!img.isPrimary && <button onClick={async () => { await axiosInstance.put(`/api/v1/admin/hotels/${hotelId}/images/${img.id}/set-primary`); onRefresh() }} className="bg-yellow-400 text-yellow-900 text-xs px-2 py-1 rounded-lg font-medium">Primary</button>}
              <button onClick={async () => { if (confirm('Delete?')) { await axiosInstance.delete(`/api/v1/admin/hotels/${hotelId}/images/${img.id}`); onRefresh() } }} className="bg-red-500 text-white text-xs px-2 py-1 rounded-lg font-medium">Del</button>
            </div>
            {img.caption && <p className="text-xs text-gray-500 p-1.5 truncate">{img.caption}</p>}
          </div>
        ))}
        {images.length === 0 && <div className="col-span-4 text-center py-8 text-gray-400 text-sm">No images yet.</div>}
      </div>
      {editImg && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-3">
            <h3 className="font-bold text-gray-900">Edit Image</h3>
            <img src={imgUrl(editImg.imageUrl)} alt="" className="w-full h-32 object-cover rounded-xl" />
            <div><label className={lbl}>Caption</label><input value={caption} onChange={e => setCaption(e.target.value)} className={inp} /></div>
            <div><label className={lbl}>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className={inp + ' bg-white'}>
                {CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditImg(null)} className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm">Cancel</button>
              <button onClick={async () => { await axiosInstance.put(`/api/v1/admin/hotels/${hotelId}/images/${editImg.id}`, { caption, category }); setEditImg(null); onRefresh() }} className="flex-1 px-3 py-2 bg-brand-blue text-white rounded-xl text-sm font-bold">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function HotelEditModal({ hotel, onClose, onSuccess }: { hotel: Hotel | null; onClose: () => void; onSuccess: () => void }) {
  const isEdit = !!hotel
  const [tab, setTab] = useState('basic')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [data, setData] = useState<Partial<Hotel>>(hotel || {
    hotelType: 'HOTEL', starRating: 3, country: 'India', checkinTime: '14:00', checkoutTime: '11:00',
    cancellationPolicy: 'MODERATE', status: 'ACTIVE', petsAllowed: false, smokingAllowed: false,
    eventsAllowed: false, isFeatured: false, isVerified: false, minimumAgeCheckin: 18
  })
  const [images, setImages] = useState<HotelImage[]>(hotel?.images || [])
  const [amenities, setAmenities] = useState<any[]>(hotel?.amenities || [])
  const [nearbyPlaces, setNearbyPlaces] = useState<any[]>(hotel?.nearbyPlaces || [])
  const [policies, setPolicies] = useState<any[]>(hotel?.policies || [])
  const [faqs, setFaqs] = useState<any[]>(hotel?.faqs || [])
  const [newAmenity, setNewAmenity] = useState({ amenityName: '', amenityIcon: '', category: 'GENERAL', isPaid: false, priceInfo: '' })
  const [newPlace, setNewPlace] = useState({ placeName: '', placeType: 'AIRPORT', distanceKm: '', travelTimeMinutes: '' })
  const [newPolicy, setNewPolicy] = useState({ policyType: 'CHECK_IN', title: '', description: '' })
  const [newFaq, setNewFaq] = useState({ question: '', answer: '' })

  const set = (f: string, v: any) => setData(p => ({ ...p, [f]: v }))
  const refresh = async () => {
    if (!hotel?.id) return
    try {
      const res = await axiosInstance.get(`/api/v1/admin/hotels/${hotel.id}`)
      const h = res.data.data
      if (h) {
        setData(prev => ({ ...prev, ...h }))
        setImages(h.images || [])
        setAmenities(h.amenities || [])
        setNearbyPlaces(h.nearbyPlaces || [])
        setPolicies(h.policies || [])
        setFaqs(h.faqs || [])
      }
    } catch (e) { console.error('refresh failed', e) }
  }
  const flash = (msg: string, isErr = false) => {
    if (isErr) { setErr(msg); setOk('') } else { setOk(msg); setErr('') }
    setTimeout(() => { setErr(''); setOk('') }, 3000)
  }
  const save = async (payload: object, label: string) => {
    setSaving(true)
    try {
      if (isEdit) {
        await axiosInstance.put(`/api/v1/admin/hotels/${hotel!.id}`, payload)
        flash(`${label} saved!`)
        await refresh()
        onSuccess()
      } else {
        await axiosInstance.post('/api/v1/admin/hotels', payload)
        flash('Hotel created!')
        onSuccess()
        onClose()
      }
    } catch (e: any) { flash(e?.response?.data?.message || `Failed to save ${label}`, true) }
    finally { setSaving(false) }
  }

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: Building2 },
    { id: 'location', label: 'Location', icon: MapPin },
    { id: 'contact', label: 'Contact & Legal', icon: Phone },
    ...(isEdit ? [
      { id: 'images', label: 'Images', icon: Image },
      { id: 'amenities', label: 'Amenities', icon: Tag },
      { id: 'nearby', label: 'Nearby Places', icon: Globe },
      { id: 'policies', label: 'Policies', icon: Shield },
      { id: 'faqs', label: 'FAQs', icon: HelpCircle },
    ] : []),
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-bold text-gray-900 text-lg">{isEdit ? `Edit: ${hotel!.name}` : 'Add New Hotel'}</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="flex gap-1 px-5 pt-3 pb-2 border-b border-gray-100 overflow-x-auto flex-shrink-0">
          {tabs.map(t => <TabBtn key={t.id} active={tab === t.id} onClick={() => setTab(t.id)} icon={t.icon} label={t.label} />)}
        </div>
        {(err || ok) && (
          <div className={`mx-5 mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm flex-shrink-0 ${err ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
            {err ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}{err || ok}
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className={lbl}>Hotel Name *</label><input value={data.name || ''} onChange={e => set('name', e.target.value)} className={inp} placeholder="e.g. The Grand Palace" /></div>
                <div><label className={lbl}>Slug</label><input value={data.slug || ''} onChange={e => set('slug', e.target.value)} className={inp} /></div>
                <div><label className={lbl}>Hotel Type</label>
                  <select value={data.hotelType || 'HOTEL'} onChange={e => set('hotelType', e.target.value)} className={inp + ' bg-white'}>
                    {['HOTEL','RESORT','VILLA','HOSTEL','APARTMENT','BOUTIQUE'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className={lbl}>Star Rating</label>
                  <select value={data.starRating || 3} onChange={e => set('starRating', Number(e.target.value))} className={inp + ' bg-white'}>
                    {[1,2,3,4,5].map(s => <option key={s} value={s}>{s} Star</option>)}
                  </select>
                </div>
                <div><label className={lbl}>Total Floors</label><input type="number" value={data.totalFloors || ''} onChange={e => set('totalFloors', e.target.value)} className={inp} /></div>
                <div>
                  <label className={lbl}>Total Rooms <span className="text-gray-400 font-normal">(auto-calculated)</span></label>
                  <input type="number" value={data.totalRooms || 0} readOnly className={inp + ' bg-gray-50 cursor-not-allowed text-gray-500'} />
                </div>
                <div><label className={lbl}>Year Built</label><input type="number" value={data.yearBuilt || ''} onChange={e => set('yearBuilt', e.target.value)} className={inp} /></div>
                <div><label className={lbl}>Year Renovated</label><input type="number" value={data.yearRenovated || ''} onChange={e => set('yearRenovated', e.target.value)} className={inp} /></div>
                <div><label className={lbl}>Check-in Time</label><input type="time" value={data.checkinTime || '14:00'} onChange={e => set('checkinTime', e.target.value)} className={inp} /></div>
                <div><label className={lbl}>Check-out Time</label><input type="time" value={data.checkoutTime || '11:00'} onChange={e => set('checkoutTime', e.target.value)} className={inp} /></div>
                <div><label className={lbl}>Min Age Check-in</label><input type="number" value={data.minimumAgeCheckin || 18} onChange={e => set('minimumAgeCheckin', e.target.value)} className={inp} /></div>
                <div className="col-span-2"><label className={lbl}>Short Description</label>
                  <textarea value={data.shortDescription || ''} onChange={e => set('shortDescription', e.target.value)} rows={2} maxLength={500} className={inp + ' resize-none'} />
                  <p className="text-xs text-gray-400">{(data.shortDescription || '').length}/500</p>
                </div>
                <div className="col-span-2"><label className={lbl}>Full Description</label>
                  <textarea value={data.description || ''} onChange={e => set('description', e.target.value)} rows={5} className={inp + ' resize-none'} />
                </div>
              </div>
              <button onClick={() => save({
                name: data.name, slug: data.slug, description: data.description,
                shortDescription: data.shortDescription, hotelType: data.hotelType || 'HOTEL',
                starRating: Number(data.starRating),
                totalFloors: data.totalFloors ? Number(data.totalFloors) : undefined,
                yearBuilt: data.yearBuilt ? Number(data.yearBuilt) : undefined,
                yearRenovated: data.yearRenovated ? Number(data.yearRenovated) : undefined,
                checkinTime: data.checkinTime || '14:00', checkoutTime: data.checkoutTime || '11:00',
                minimumAgeCheckin: Number(data.minimumAgeCheckin) || 18,
                city: data.city, state: data.state, country: data.country || 'India',
                addressLine1: data.addressLine1, primaryPhone: data.primaryPhone, email: data.email,
                cancellationPolicy: data.cancellationPolicy || 'MODERATE', status: data.status || 'ACTIVE',
              }, 'Basic Info')} disabled={saving} className={saveBtnCls}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {isEdit ? 'Save Basic Info' : 'Create Hotel'}
              </button>
            </div>
          )}
          {tab === 'location' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className={lbl}>Address Line 1</label><input value={data.addressLine1 || ''} onChange={e => set('addressLine1', e.target.value)} className={inp} /></div>
                <div className="col-span-2"><label className={lbl}>Address Line 2</label><input value={data.addressLine2 || ''} onChange={e => set('addressLine2', e.target.value)} className={inp} /></div>
                <div><label className={lbl}>City *</label><input value={data.city || ''} onChange={e => set('city', e.target.value)} className={inp} /></div>
                <div><label className={lbl}>State</label><input value={data.state || ''} onChange={e => set('state', e.target.value)} className={inp} /></div>
                <div><label className={lbl}>Country</label><input value={data.country || 'India'} onChange={e => set('country', e.target.value)} className={inp} /></div>
                <div><label className={lbl}>Pincode</label><input value={data.pincode || ''} onChange={e => set('pincode', e.target.value)} className={inp} /></div>
                <div><label className={lbl}>Latitude</label><input type="number" step="0.000001" value={data.latitude || ''} onChange={e => set('latitude', e.target.value)} className={inp} /></div>
                <div><label className={lbl}>Longitude</label><input type="number" step="0.000001" value={data.longitude || ''} onChange={e => set('longitude', e.target.value)} className={inp} /></div>
                <div className="col-span-2"><label className={lbl}>Neighborhood</label><input value={data.neighborhood || ''} onChange={e => set('neighborhood', e.target.value)} className={inp} /></div>
                <div><label className={lbl}>Distance from Airport (km)</label><input type="number" step="0.1" value={data.distanceFromAirport || ''} onChange={e => set('distanceFromAirport', e.target.value)} className={inp} /></div>
                <div><label className={lbl}>Distance from City Center (km)</label><input type="number" step="0.1" value={data.distanceFromCityCenter || ''} onChange={e => set('distanceFromCityCenter', e.target.value)} className={inp} /></div>
              </div>
              {isEdit && (
                <button onClick={() => save({
                  addressLine1: data.addressLine1, addressLine2: data.addressLine2,
                  city: data.city, state: data.state, country: data.country, pincode: data.pincode,
                  latitude: data.latitude ? Number(data.latitude) : undefined,
                  longitude: data.longitude ? Number(data.longitude) : undefined,
                  neighborhood: data.neighborhood,
                  distanceFromAirport: data.distanceFromAirport ? Number(data.distanceFromAirport) : undefined,
                  distanceFromCityCenter: data.distanceFromCityCenter ? Number(data.distanceFromCityCenter) : undefined,
                }, 'Location')} disabled={saving} className={saveBtnCls}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Location
                </button>
              )}
            </div>
          )}
          {tab === 'contact' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lbl}>Primary Phone</label><input value={data.primaryPhone || ''} onChange={e => set('primaryPhone', e.target.value)} className={inp} /></div>
                <div><label className={lbl}>Secondary Phone</label><input value={data.secondaryPhone || ''} onChange={e => set('secondaryPhone', e.target.value)} className={inp} /></div>
                <div><label className={lbl}>Email</label><input type="email" value={data.email || ''} onChange={e => set('email', e.target.value)} className={inp} /></div>
                <div><label className={lbl}>Website</label><input value={data.website || ''} onChange={e => set('website', e.target.value)} className={inp} /></div>
                <div><label className={lbl}>Facebook URL</label><input value={data.facebookUrl || ''} onChange={e => set('facebookUrl', e.target.value)} className={inp} /></div>
                <div><label className={lbl}>Instagram URL</label><input value={data.instagramUrl || ''} onChange={e => set('instagramUrl', e.target.value)} className={inp} /></div>
                <div><label className={lbl}>GSTIN</label><input value={data.gstin || ''} onChange={e => set('gstin', e.target.value)} className={inp} /></div>
                <div><label className={lbl}>PAN Number</label><input value={data.panNumber || ''} onChange={e => set('panNumber', e.target.value)} className={inp} /></div>
              </div>
              {isEdit && (
                <button onClick={() => save({
                  primaryPhone: data.primaryPhone, secondaryPhone: data.secondaryPhone,
                  email: data.email, website: data.website, facebookUrl: data.facebookUrl,
                  instagramUrl: data.instagramUrl, gstin: data.gstin, panNumber: data.panNumber,
                }, 'Contact')} disabled={saving} className={saveBtnCls}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Contact
                </button>
              )}
            </div>
          )}
          {tab === 'images' && hotel && <ImageManager hotelId={hotel.id} images={images} onRefresh={refresh} />}
          {tab === 'amenities' && hotel && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Add Amenity</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={lbl}>Name *</label><input value={newAmenity.amenityName} onChange={e => setNewAmenity(p => ({ ...p, amenityName: e.target.value }))} className={inp} placeholder="e.g. Swimming Pool" /></div>
                  <div><label className={lbl}>Icon</label><input value={newAmenity.amenityIcon} onChange={e => setNewAmenity(p => ({ ...p, amenityIcon: e.target.value }))} className={inp} placeholder="emoji or icon code" /></div>
                  <div><label className={lbl}>Category</label>
                    <select value={newAmenity.category} onChange={e => setNewAmenity(p => ({ ...p, category: e.target.value }))} className={inp + ' bg-white'}>
                      {['GENERAL','ROOM','FOOD','WELLNESS','BUSINESS','TRANSPORT','RECREATION'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div><label className={lbl}>Price Info</label><input value={newAmenity.priceInfo} onChange={e => setNewAmenity(p => ({ ...p, priceInfo: e.target.value }))} className={inp} placeholder="e.g. Rs 500/hr" /></div>
                  <div className="flex items-center gap-2 pt-1">
                    <input type="checkbox" id="isPaid" checked={newAmenity.isPaid} onChange={e => setNewAmenity(p => ({ ...p, isPaid: e.target.checked }))} className="rounded" />
                    <label htmlFor="isPaid" className="text-sm text-gray-700">Paid amenity</label>
                  </div>
                </div>
                <button onClick={async () => {
                  if (!newAmenity.amenityName) return
                  await axiosInstance.post(`/api/v1/admin/hotels/${hotel.id}/amenities`, newAmenity)
                  setNewAmenity({ amenityName: '', amenityIcon: '', category: 'GENERAL', isPaid: false, priceInfo: '' })
                  refresh(); flash('Amenity added!')
                }} className={saveBtnCls}><Plus size={14} /> Add Amenity</button>
              </div>
              <div className="space-y-2">
                {amenities.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{a.amenityIcon || '✓'}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{a.amenityName}</p>
                        <p className="text-xs text-gray-400">{a.category}{a.isPaid ? ' · Paid' : ''}</p>
                      </div>
                    </div>
                    <button onClick={async () => { if (confirm('Delete?')) { await axiosInstance.delete(`/api/v1/admin/hotels/${hotel.id}/amenities/${a.id}`); refresh() } }} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={14} className="text-red-500" /></button>
                  </div>
                ))}
                {amenities.length === 0 && <p className="text-center py-6 text-gray-400 text-sm">No amenities yet.</p>}
              </div>
            </div>
          )}
          {tab === 'nearby' && hotel && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Add Nearby Place</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={lbl}>Place Name *</label><input value={newPlace.placeName} onChange={e => setNewPlace(p => ({ ...p, placeName: e.target.value }))} className={inp} placeholder="e.g. Airport" /></div>
                  <div><label className={lbl}>Type</label>
                    <select value={newPlace.placeType} onChange={e => setNewPlace(p => ({ ...p, placeType: e.target.value }))} className={inp + ' bg-white'}>
                      {['AIRPORT','RAILWAY_STATION','BUS_STAND','METRO','MALL','HOSPITAL','BEACH','MONUMENT','PARK','OTHER'].map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
                    </select>
                  </div>
                  <div><label className={lbl}>Distance (km)</label><input type="number" step="0.1" value={newPlace.distanceKm} onChange={e => setNewPlace(p => ({ ...p, distanceKm: e.target.value }))} className={inp} /></div>
                  <div><label className={lbl}>Travel Time (min)</label><input type="number" value={newPlace.travelTimeMinutes} onChange={e => setNewPlace(p => ({ ...p, travelTimeMinutes: e.target.value }))} className={inp} /></div>
                </div>
                <button onClick={async () => {
                  if (!newPlace.placeName) return
                  await axiosInstance.post(`/api/v1/admin/hotels/${hotel.id}/nearby-places`, { ...newPlace, distanceKm: Number(newPlace.distanceKm), travelTimeMinutes: Number(newPlace.travelTimeMinutes) })
                  setNewPlace({ placeName: '', placeType: 'AIRPORT', distanceKm: '', travelTimeMinutes: '' })
                  refresh(); flash('Place added!')
                }} className={saveBtnCls}><Plus size={14} /> Add Place</button>
              </div>
              <div className="space-y-2">
                {nearbyPlaces.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{p.placeName}</p>
                      <p className="text-xs text-gray-400">{p.placeType?.replace('_',' ')} · {p.distanceKm}km{p.travelTimeMinutes ? ` · ${p.travelTimeMinutes}min` : ''}</p>
                    </div>
                    <button onClick={async () => { if (confirm('Delete?')) { await axiosInstance.delete(`/api/v1/admin/hotels/${hotel.id}/nearby-places/${p.id}`); refresh() } }} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={14} className="text-red-500" /></button>
                  </div>
                ))}
                {nearbyPlaces.length === 0 && <p className="text-center py-6 text-gray-400 text-sm">No nearby places yet.</p>}
              </div>
            </div>
          )}
          {tab === 'policies' && hotel && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Add Policy</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={lbl}>Type</label>
                    <select value={newPolicy.policyType} onChange={e => setNewPolicy(p => ({ ...p, policyType: e.target.value }))} className={inp + ' bg-white'}>
                      {['CHECK_IN','CHECK_OUT','CANCELLATION','PAYMENT','PET','SMOKING','CHILD','DRESS_CODE','OTHER'].map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
                    </select>
                  </div>
                  <div><label className={lbl}>Title *</label><input value={newPolicy.title} onChange={e => setNewPolicy(p => ({ ...p, title: e.target.value }))} className={inp} /></div>
                  <div className="col-span-2"><label className={lbl}>Description</label><textarea value={newPolicy.description} onChange={e => setNewPolicy(p => ({ ...p, description: e.target.value }))} rows={3} className={inp + ' resize-none'} /></div>
                </div>
                <button onClick={async () => {
                  if (!newPolicy.title) return
                  await axiosInstance.post(`/api/v1/admin/hotels/${hotel.id}/policies`, newPolicy)
                  setNewPolicy({ policyType: 'CHECK_IN', title: '', description: '' })
                  refresh(); flash('Policy added!')
                }} className={saveBtnCls}><Plus size={14} /> Add Policy</button>
              </div>
              <div className="space-y-2">
                {policies.map((p: any) => (
                  <div key={p.id} className="flex items-start justify-between bg-white border border-gray-100 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-xs font-semibold text-brand-blue uppercase">{p.policyType?.replace('_',' ')}</p>
                      <p className="text-sm font-medium text-gray-800">{p.title}</p>
                      {p.description && <p className="text-xs text-gray-500 mt-0.5">{p.description}</p>}
                    </div>
                    <button onClick={async () => { if (confirm('Delete?')) { await axiosInstance.delete(`/api/v1/admin/hotels/${hotel.id}/policies/${p.id}`); refresh() } }} className="p-1.5 hover:bg-red-50 rounded-lg ml-2 flex-shrink-0"><Trash2 size={14} className="text-red-500" /></button>
                  </div>
                ))}
                {policies.length === 0 && <p className="text-center py-6 text-gray-400 text-sm">No policies yet.</p>}
              </div>
            </div>
          )}
          {tab === 'faqs' && hotel && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Add FAQ</h3>
                <div><label className={lbl}>Question *</label><input value={newFaq.question} onChange={e => setNewFaq(p => ({ ...p, question: e.target.value }))} className={inp} /></div>
                <div><label className={lbl}>Answer *</label><textarea value={newFaq.answer} onChange={e => setNewFaq(p => ({ ...p, answer: e.target.value }))} rows={3} className={inp + ' resize-none'} /></div>
                <button onClick={async () => {
                  if (!newFaq.question || !newFaq.answer) return
                  await axiosInstance.post(`/api/v1/admin/hotels/${hotel.id}/faqs`, newFaq)
                  setNewFaq({ question: '', answer: '' })
                  refresh(); flash('FAQ added!')
                }} className={saveBtnCls}><Plus size={14} /> Add FAQ</button>
              </div>
              <div className="space-y-2">
                {faqs.map((f: any) => (
                  <div key={f.id} className="flex items-start justify-between bg-white border border-gray-100 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Q: {f.question}</p>
                      <p className="text-sm text-gray-600 mt-1">A: {f.answer}</p>
                    </div>
                    <button onClick={async () => { if (confirm('Delete?')) { await axiosInstance.delete(`/api/v1/admin/hotels/${hotel.id}/faqs/${f.id}`); refresh() } }} className="p-1.5 hover:bg-red-50 rounded-lg ml-2 flex-shrink-0"><Trash2 size={14} className="text-red-500" /></button>
                  </div>
                ))}
                {faqs.length === 0 && <p className="text-center py-6 text-gray-400 text-sm">No FAQs yet.</p>}
              </div>
            </div>
          )}
          {tab === 'settings' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lbl}>Status</label>
                  <select value={data.status || 'ACTIVE'} onChange={e => set('status', e.target.value)} className={inp + ' bg-white'}>
                    {['ACTIVE','INACTIVE','UNDER_RENOVATION','TEMPORARILY_CLOSED','PERMANENTLY_CLOSED'].map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                  </select>
                </div>
                <div><label className={lbl}>Cancellation Policy</label>
                  <select value={data.cancellationPolicy || 'MODERATE'} onChange={e => set('cancellationPolicy', e.target.value)} className={inp + ' bg-white'}>
                    {['FLEXIBLE','MODERATE','STRICT','NON_REFUNDABLE'].map(c => <option key={c} value={c}>{c.replace('_',' ')}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { key: 'isFeatured', label: 'Featured Hotel', desc: 'Show in featured section on homepage' },
                  { key: 'isVerified', label: 'Verified Hotel', desc: 'Show verified badge on hotel listing' },
                  { key: 'petsAllowed', label: 'Pets Allowed', desc: 'Guests can bring pets' },
                  { key: 'smokingAllowed', label: 'Smoking Allowed', desc: 'Smoking permitted in designated areas' },
                  { key: 'eventsAllowed', label: 'Events Allowed', desc: 'Hotel can host events and parties' },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{label}</p>
                      <p className="text-xs text-gray-500">{desc}</p>
                    </div>
                    <button onClick={() => set(key, !(data as any)[key])}
                      className={`relative w-11 h-6 rounded-full transition-colors ${(data as any)[key] ? 'bg-brand-blue' : 'bg-gray-200'}`}>
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${(data as any)[key] ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>
                ))}
              </div>
              {isEdit && (
                <button onClick={() => save({
                  status: data.status, cancellationPolicy: data.cancellationPolicy,
                  isFeatured: data.isFeatured, isVerified: data.isVerified,
                  petsAllowed: data.petsAllowed, smokingAllowed: data.smokingAllowed, eventsAllowed: data.eventsAllowed,
                }, 'Settings')} disabled={saving} className={saveBtnCls}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Settings
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default function AdminHotels() {
  const navigate = useNavigate()
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [modal, setModal] = useState<{ hotel: Hotel | null } | null>(null)
  const [statusModal, setStatusModal] = useState<{ hotel: Hotel } | null>(null)
  const [newStatus, setNewStatus] = useState('')
  const [statusReason, setStatusReason] = useState('')

  const fetchHotels = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { page, size: 12 }
      if (search) params.search = search
      const res = await axiosInstance.get('/api/v1/admin/hotels', { params })
      const d = res.data.data
      setHotels(d.content || [])
      setTotalPages(d.totalPages || 0)
      setTotalElements(d.totalElements || 0)
    } finally { setLoading(false) }
  }, [page, search])

  useEffect(() => { fetchHotels() }, [fetchHotels])

  const handleStatusChange = async () => {
    if (!statusModal) return
    await axiosInstance.patch(`/api/v1/admin/hotels/${statusModal.hotel.id}/status`, { status: newStatus, reason: statusReason })
    setStatusModal(null)
    fetchHotels()
  }

  return (
    <>
      <Helmet><title>Manage Hotels | Admin</title></Helmet>
      <div>
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Hotels</h1>
            <p className="text-sm text-gray-500">{totalElements} total hotels</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchHotels} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">
              <RefreshCw size={14} /> Refresh
            </button>
            <button onClick={() => setModal({ hotel: null })} className="flex items-center gap-1.5 px-4 py-2 bg-brand-blue text-white rounded-xl text-sm font-medium hover:bg-blue-700">
              <Plus size={14} /> Add Hotel
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-5">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
              placeholder="Search by name, city..." className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin text-brand-blue" /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {hotels.map(hotel => (
              <motion.div key={hotel.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                <div className="h-36 bg-gray-100 relative overflow-hidden">
                  {hotel.images?.[0]?.imageUrl ? (
                    <img src={imgUrl(hotel.images[0].imageUrl)} alt={hotel.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Building2 size={32} className="text-gray-300" /></div>
                  )}
                  <div className="absolute top-2 right-2"><StatusBadge status={hotel.status} /></div>
                  {hotel.isFeatured && <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-1.5 py-0.5 rounded-full">Featured</div>}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 text-sm leading-tight">{hotel.name}</h3>
                    <div className="flex items-center gap-0.5 text-yellow-500 flex-shrink-0">
                      <Star size={12} fill="currentColor" /><span className="text-xs font-medium text-gray-600">{hotel.starRating}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mb-3"><MapPin size={11} />{hotel.city}{hotel.state ? `, ${hotel.state}` : ''}</p>
                  <div className="flex items-center gap-2 mb-2">
                    <button onClick={() => setModal({ hotel })} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors">
                      <Edit2 size={12} /> Edit
                    </button>
                    <button onClick={() => { setStatusModal({ hotel }); setNewStatus(hotel.status || 'ACTIVE'); setStatusReason('') }}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors">
                      <Power size={12} /> Status
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => navigate(`/admin/hotels/${hotel.id}/room-types`)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors">
                      <BedDouble size={11} /> Rooms
                    </button>
                    <button onClick={() => navigate(`/admin/hotels/${hotel.id}/inventory`)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-purple-50 text-purple-600 border border-purple-100 rounded-lg text-xs font-medium hover:bg-purple-100 transition-colors">
                      <CalendarDays size={11} /> Inventory
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
            {hotels.length === 0 && (
              <div className="col-span-3 text-center py-16 text-gray-400">
                <Building2 size={40} className="mx-auto mb-3 text-gray-200" />
                <p className="text-sm">No hotels found. Add your first hotel!</p>
              </div>
            )}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-xs text-gray-500">Showing {page * 12 + 1}–{Math.min((page + 1) * 12, totalElements)} of {totalElements}</p>
            <div className="flex gap-2">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs disabled:opacity-40 hover:bg-gray-50">Previous</button>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs disabled:opacity-40 hover:bg-gray-50">Next</button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {modal && (
          <HotelEditModal hotel={modal.hotel} onClose={() => setModal(null)} onSuccess={() => { setModal(null); fetchHotels() }} />
        )}
      </AnimatePresence>

      {statusModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-gray-900">Change Hotel Status</h3>
            <p className="text-sm text-gray-600">{statusModal.hotel.name}</p>
            <div>
              <label className={lbl}>New Status</label>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className={inp + ' bg-white'}>
                {['ACTIVE','INACTIVE','UNDER_RENOVATION','TEMPORARILY_CLOSED','PERMANENTLY_CLOSED'].map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Reason (optional)</label>
              <input value={statusReason} onChange={e => setStatusReason(e.target.value)} className={inp} placeholder="Reason for status change" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStatusModal(null)} className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm">Cancel</button>
              <button onClick={handleStatusChange} className="flex-1 px-3 py-2 bg-brand-blue text-white rounded-xl text-sm font-bold">Update</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
