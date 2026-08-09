import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Star, Heart, MapPin, Share2, ChevronLeft, ChevronRight, X,
  Wifi, Wind, Car, Waves, Dumbbell, Coffee, Tv, Shield,
  CheckCircle, Clock, Calendar, Users, ChevronDown, ChevronUp,
  Phone, Mail, Globe, Info, Map as MapIcon, MessageSquare,
  FileText, AlertTriangle, ArrowRight
} from 'lucide-react'
import { format, addDays, differenceInDays } from 'date-fns'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '@/store'
import {
  useGetHotelBySlugQuery,
  useGetAvailableRoomsQuery,
  useGetHotelReviewsQuery,
  useToggleWishlistMutation,
} from '@/store/api/hotelApi'
import { setSearch } from '@/store/slices/searchSlice'

// ─── Types ───────────────────────────────────────────────────────────────────

interface RoomType {
  id: string
  name: string
  roomCategory: string
  description: string
  maxOccupancy: number
  bedType: string
  roomSizeSqft: number
  viewType: string
  amenities: { amenityName: string; amenityIcon?: string; isComplimentary?: boolean }[]
  images: { imageUrl: string; thumbnailUrl?: string; isPrimary?: boolean }[]
  basePrice: number
  discountedPrice: number
  availableRooms: number
  priceBreakdown?: {
    basePrice: number
    totalTax: number
    convenienceFee: number
    grandTotal: number
  }
}

interface Review {
  id: string
  userName: string
  userAvatar?: string
  overallRating: number
  cleanlinessRating: number
  serviceRating: number
  locationRating: number
  valueRating: number
  title: string
  reviewText: string
  travelType: string
  createdAt: string
  adminResponse?: string
}

interface HotelAmenityDto {
  id: string
  amenityName: string
  amenityIcon?: string
  isPaid?: boolean
  priceInfo?: string
}

interface HotelDetail {
  id: string
  name: string
  slug: string
  city: string
  neighborhood: string   // backend field name
  addressLine1: string   // backend field name
  starRating: number
  hotelType: string
  description: string
  checkinTime: string    // backend field name
  checkoutTime: string   // backend field name
  primaryPhone: string   // backend field name
  email: string
  guestRating: number    // backend field name
  reviewCount: number
  images: { imageUrl: string; thumbnailUrl?: string; caption?: string; category?: string; sortOrder?: number; isPrimary?: boolean }[]
  amenitiesByCategory: Record<string, HotelAmenityDto[]>  // backend field name
  policies: { policyType: string; title?: string; description: string }[]
  faqs: { question: string; answer: string }[]
  nearbyPlaces: { placeName: string; placeType?: string; distanceKm: number; travelTimeMinutes?: number }[]
  latitude?: number
  longitude?: number
  isWishlisted: boolean
  isFeatured: boolean
  cancellationPolicy?: string
  petsAllowed?: boolean
  smokingAllowed?: boolean
}

const AMENITY_MAP: Record<string, { label: string; icon: any }> = {
  FREE_WIFI: { label: 'Free WiFi', icon: Wifi },
  AIR_CONDITIONING: { label: 'Air Conditioning', icon: Wind },
  FREE_PARKING: { label: 'Free Parking', icon: Car },
  SWIMMING_POOL: { label: 'Swimming Pool', icon: Waves },
  GYM: { label: 'Fitness Center', icon: Dumbbell },
  RESTAURANT: { label: 'Restaurant', icon: Coffee },
  FLAT_SCREEN_TV: { label: 'Flat Screen TV', icon: Tv },
  SAFE: { label: 'In-room Safe', icon: Shield },
}

const TABS = ['Overview', 'Rooms', 'Amenities', 'Location', 'Reviews', 'Policies', 'FAQ'] as const
type Tab = typeof TABS[number]

const CANCELLATION_LABELS: Record<string, string> = {
  FLEXIBLE: 'Free cancellation anytime',
  MODERATE: 'Free cancellation up to 5 days before',
  STRICT: '50% refund up to 7 days before',
  NON_REFUNDABLE: 'Non-refundable',
}

// ─── Image Gallery ────────────────────────────────────────────────────────────

function ImageGallery({ images }: { images: HotelDetail['images'] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const main = images[0]
  const thumbs = images.slice(1, 5)
  const remaining = images.length - 5

  const prev = useCallback(() => setLightboxIndex(i => (i! > 0 ? i! - 1 : images.length - 1)), [images.length])
  const next = useCallback(() => setLightboxIndex(i => (i! < images.length - 1 ? i! + 1 : 0)), [images.length])

  useEffect(() => {
    if (lightboxIndex === null) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'Escape') setLightboxIndex(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxIndex, prev, next])

  if (!main) return null

  return (
    <>
      <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[420px] rounded-xl overflow-hidden">
        <div
          className="col-span-2 row-span-2 cursor-pointer relative group"
          onClick={() => setLightboxIndex(0)}
        >
          <img src={main.imageUrl} alt="Hotel" className="w-full h-full object-cover group-hover:brightness-90 transition-all"
            onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-hotel.svg' }} />
        </div>
        {thumbs.map((img, i) => (
          <div
            key={i}
            className="relative cursor-pointer group overflow-hidden"
            onClick={() => setLightboxIndex(i + 1)}
          >
            <img src={img.imageUrl} alt="" className="w-full h-full object-cover group-hover:brightness-90 transition-all"
              onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-hotel.svg' }} />
            {i === 3 && remaining > 0 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white font-bold text-lg">+{remaining} more</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
            onClick={() => setLightboxIndex(null)}
          >
            <button onClick={(e) => { e.stopPropagation(); prev() }}
              className="absolute left-4 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
              <ChevronLeft size={24} className="text-white" />
            </button>
            <img
              src={images[lightboxIndex].imageUrl}
              alt=""
              className="max-w-[90vw] max-h-[90vh] object-contain"
              onClick={e => e.stopPropagation()}
              onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-hotel.svg' }}
            />
            <button onClick={(e) => { e.stopPropagation(); next() }}
              className="absolute right-4 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
              <ChevronRight size={24} className="text-white" />
            </button>
            <button onClick={() => setLightboxIndex(null)}
              className="absolute top-4 right-4 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
              <X size={24} className="text-white" />
            </button>
            <div className="absolute bottom-4 text-white/70 text-sm">
              {lightboxIndex + 1} / {images.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Room Card ───────────────────────────────────────────────────────────────

function RoomCard({ room, nights, onSelect }: {
  room: RoomType
  nights: number
  onSelect: (roomId: string) => void
}) {
  const [showMore, setShowMore] = useState(false)
  const [imgIdx, setImgIdx] = useState(0)

  const isAvailable = room.availableRooms > 0
  const lowAvail = isAvailable && room.availableRooms <= 3
  const taxAmount = room.priceBreakdown?.totalTax ?? 0
  const totalPrice = room.priceBreakdown?.grandTotal ?? (room.discountedPrice * nights)
  const cancellationPolicy = room.priceBreakdown ? 'FLEXIBLE' : 'FLEXIBLE'

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${
      !isAvailable ? 'opacity-60 bg-gray-50' : 'bg-white hover:shadow-md'
    }`}>
      <div className="md:flex">
        {/* Room images */}
        <div className="relative md:w-64 h-48 md:h-auto shrink-0 overflow-hidden">
          <img
            src={room.images[imgIdx]?.imageUrl || '/placeholder-room.jpg'}
            alt={room.name}
            className="w-full h-full object-cover"
          />
          {room.images.length > 1 && (
            <>
              <button onClick={() => setImgIdx(i => (i > 0 ? i - 1 : room.images.length - 1))}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1 bg-black/40 rounded-full">
                <ChevronLeft size={14} className="text-white" />
              </button>
              <button onClick={() => setImgIdx(i => (i < room.images.length - 1 ? i + 1 : 0))}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-black/40 rounded-full">
                <ChevronRight size={14} className="text-white" />
              </button>
            </>
          )}
        </div>

        <div className="flex-1 p-4">
          <div className="flex flex-col md:flex-row md:justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-lg mb-1">{room.name}</h3>
              <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-3">
                <span className="flex items-center gap-1"><Users size={13} /> Max {room.maxOccupancy} guests</span>
                {room.bedType && <span>{room.bedType}</span>}
                {room.roomSizeSqft > 0 && <span>{room.roomSizeSqft} sqft</span>}
                {room.viewType && room.viewType !== 'NO_VIEW' && <span>{room.viewType.replace(/_/g, ' ')} View</span>}
              </div>

              <div className="flex flex-wrap gap-1 mb-3">
                {(room.amenities || []).slice(0, showMore ? undefined : 5).map((a, idx) => {
                  const opt = AMENITY_MAP[a.amenityName]
                  return opt ? (
                    <span key={idx} className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                      <opt.icon size={10} /> {opt.label}
                    </span>
                  ) : (
                    <span key={idx} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                      {a.amenityName.replace(/_/g, ' ')}
                    </span>
                  )
                })}
                {room.amenities.length > 5 && (
                  <button onClick={() => setShowMore(x => !x)} className="text-xs text-brand-blue hover:underline">
                    {showMore ? 'Show less' : `+${room.amenities.length - 5} more`}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm">
                <CheckCircle size={14} className="text-green-500" />
                <span className="text-green-600 font-medium">
                  {CANCELLATION_LABELS[cancellationPolicy] || 'Check cancellation policy'}
                </span>
              </div>
            </div>

            {/* Price & booking */}
            <div className="flex flex-col items-end justify-between min-w-[160px]">
              <div className="text-right">
                {room.basePrice > room.discountedPrice && (
                  <p className="text-sm text-gray-400 line-through">₹{Number(room.basePrice).toLocaleString('en-IN')}</p>
                )}
                <p className="text-2xl font-black text-gray-900">₹{Number(room.discountedPrice).toLocaleString('en-IN')}</p>
                <p className="text-xs text-gray-500">+₹{Number(taxAmount).toLocaleString('en-IN')} taxes & fees</p>
                <p className="text-xs text-gray-400">per night · {nights} nights</p>
                <p className="text-sm font-bold text-gray-700 mt-1">
                  Total: ₹{Number(totalPrice).toLocaleString('en-IN')}
                </p>
              </div>

              <div className="mt-3 space-y-2 text-right">
                {lowAvail && (
                  <p className="text-xs text-red-600 font-medium flex items-center gap-1 justify-end">
                    <AlertTriangle size={12} /> Only {room.availableRooms} left!
                  </p>
                )}
                {!isAvailable && (
                  <p className="text-sm text-gray-400">Sold out</p>
                )}
                {isAvailable && (
                  <button
                    onClick={() => onSelect(room.id)}
                    className="bg-brand-red hover:bg-red-700 text-white font-bold py-2 px-6 rounded-xl transition-colors text-sm"
                  >
                    Select Room
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Review Card ─────────────────────────────────────────────────────────────

function ReviewCard({ review }: { review: Review }) {
  const ratingLabel = (r: number) =>
    r >= 9 ? 'Exceptional' : r >= 8 ? 'Excellent' : r >= 7 ? 'Good' : r >= 6 ? 'Fair' : 'Poor'

  return (
    <div className="border border-gray-100 rounded-xl p-4 bg-white">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-blue text-white flex items-center justify-center font-bold text-sm">
            {review.userName?.charAt(0).toUpperCase() || '?'}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{review.userName}</p>
            <p className="text-xs text-gray-500">{format(new Date(review.createdAt), 'd MMM yyyy')} · {review.travelType?.replace('_', ' ')}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="bg-green-600 text-white text-sm font-bold px-2 py-0.5 rounded">
            {Number(review.overallRating).toFixed(1)}
          </span>
          <span className="text-sm text-gray-500">{ratingLabel(review.overallRating)}</span>
        </div>
      </div>

      {review.title && <h4 className="font-semibold text-gray-800 mb-2">{review.title}</h4>}
      <p className="text-sm text-gray-700 leading-relaxed">{review.reviewText}</p>

      <div className="grid grid-cols-4 gap-3 mt-3 pt-3 border-t border-gray-100">
        {[
          { label: 'Cleanliness', val: review.cleanlinessRating },
          { label: 'Service', val: review.serviceRating },
          { label: 'Location', val: review.locationRating },
          { label: 'Value', val: review.valueRating },
        ].filter(x => x.val).map(({ label, val }) => (
          <div key={label}>
            <p className="text-xs text-gray-500">{label}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${(val / 10) * 100}%` }} />
              </div>
              <span className="text-xs font-medium text-gray-700">{Number(val).toFixed(1)}</span>
            </div>
          </div>
        ))}
      </div>

      {review.adminResponse && (
        <div className="mt-3 pt-3 border-t border-gray-100 bg-blue-50 rounded-lg p-3">
          <p className="text-xs font-semibold text-brand-blue mb-1">Response from hotel</p>
          <p className="text-xs text-gray-700">{review.adminResponse}</p>
        </div>
      )}
    </div>
  )
}

// ─── Map Section ─────────────────────────────────────────────────────────────

function LocationMap({ hotel }: { hotel: HotelDetail }) {
  useEffect(() => {
    if (!hotel.latitude || !hotel.longitude) return
    const initMap = async () => {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')
      const container = document.getElementById('detail-map')
      if (!container || (container as any)._leaflet_id) return
      const map = L.map('detail-map').setView([Number(hotel.latitude!), Number(hotel.longitude!)], 15)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map)
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:#1e3a8a;color:white;padding:6px 12px;border-radius:999px;font-size:13px;font-weight:bold">${hotel.name}</div>`,
        iconAnchor: [50, 15],
      })
      L.marker([Number(hotel.latitude!), Number(hotel.longitude!)], { icon }).addTo(map)
    }
    initMap()
  }, [hotel])

  return (
    <div>
      <div id="detail-map" className="w-full h-72 rounded-xl overflow-hidden border border-gray-200 mb-4" />
      {(hotel.nearbyPlaces || []).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {hotel.nearbyPlaces.map((place, i) => (
            <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
              <MapPin size={14} className="text-brand-blue shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-800">{place.placeName}</p>
                <p className="text-xs text-gray-500">{Number(place.distanceKm).toFixed(1)} km</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Sticky Booking Widget ────────────────────────────────────────────────────

function BookingWidget({ hotel, rooms, checkIn, setCheckIn, checkOut, setCheckOut, adults, setAdults, onBook }: {
  hotel: HotelDetail
  rooms: RoomType[]
  checkIn: string
  setCheckIn: (v: string) => void
  checkOut: string
  setCheckOut: (v: string) => void
  adults: number
  setAdults: (v: number) => void
  onBook: (roomId: string) => void
}) {
  const nights = differenceInDays(new Date(checkOut), new Date(checkIn)) || 1
  const cheapest = rooms.find(r => r.availableRooms > 0)

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-5 sticky top-24">
      <div className="mb-4">
        {cheapest ? (
          <>
            <p className="text-sm text-gray-500 mb-0.5">Starting from</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-gray-900">₹{Number(cheapest.discountedPrice).toLocaleString('en-IN')}</span>
              <span className="text-sm text-gray-500">/ night</span>
            </div>
            <p className="text-xs text-gray-400">+taxes & fees</p>
          </>
        ) : (
          <p className="text-base font-bold text-red-500">No rooms available</p>
        )}
      </div>

      <div className="space-y-2 mb-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Check-in</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={checkIn}
                min={format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full pl-8 pr-2 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Check-out</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={checkOut}
                min={format(addDays(new Date(checkIn), 1), 'yyyy-MM-dd')}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full pl-8 pr-2 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Adults</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map(n => (
              <button
                key={n}
                onClick={() => setAdults(n)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  adults === n ? 'bg-brand-blue text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 mb-4 pt-3 border-t border-gray-100">
        <Clock size={13} />
        <span>Check-in: {hotel.checkinTime} · Check-out: {hotel.checkoutTime}</span>
      </div>

      {cheapest ? (
        <button
          onClick={() => onBook(cheapest.id)}
          className="w-full bg-brand-red hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          Book Now <ArrowRight size={16} />
        </button>
      ) : (
        <button disabled className="w-full bg-gray-200 text-gray-400 font-bold py-3 rounded-xl cursor-not-allowed">
          No Availability
        </button>
      )}

      <p className="text-xs text-gray-400 text-center mt-2">No payment required yet</p>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HotelDetailPage() {
  const { city, slug } = useParams<{ city: string; slug: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const storedSearch = useSelector((s: RootState) => s.search)

  const [checkIn, setCheckIn] = useState(
    searchParams.get('checkIn') || storedSearch.checkIn || format(addDays(new Date(), 1), 'yyyy-MM-dd')
  )
  const [checkOut, setCheckOut] = useState(
    searchParams.get('checkOut') || storedSearch.checkOut || format(addDays(new Date(), 2), 'yyyy-MM-dd')
  )
  const [adults, setAdults] = useState(
    Number(searchParams.get('adults') || storedSearch.adults || 1)
  )
  const [activeTab, setActiveTab] = useState<Tab>('Overview')
  const [reviewPage, setReviewPage] = useState(0)

  const tabRefs = useRef<Partial<Record<Tab, HTMLElement | null>>>({})

  const nights = differenceInDays(new Date(checkOut), new Date(checkIn)) || 1

  const { data: hotelData, isLoading: hotelLoading } = useGetHotelBySlugQuery(
    { city: city!, slug: slug! },
    { skip: !city || !slug }
  )
  const { data: roomData, isLoading: roomsLoading } = useGetAvailableRoomsQuery(
    { hotelId: hotelData?.data?.id, checkIn, checkOut, adults },
    { skip: !hotelData?.data?.id }
  )
  const { data: reviewData } = useGetHotelReviewsQuery(
    { hotelId: hotelData?.data?.id!, page: reviewPage },
    { skip: !hotelData?.data?.id }
  )
  const [toggleWishlist] = useToggleWishlistMutation()

  const hotel: HotelDetail | undefined = hotelData?.data
  const rooms: RoomType[] = roomData?.data || []
  const reviews: Review[] = reviewData?.data?.content || []
  const totalReviewPages = reviewData?.data?.totalPages || 1

  // Flatten amenitiesByCategory into a list for the Amenities tab
  const allAmenities: HotelAmenityDto[] = hotel
    ? Object.values(hotel.amenitiesByCategory || {}).flat()
    : []

  const scrollToTab = useCallback((tab: Tab) => {
    setActiveTab(tab)
    tabRefs.current[tab]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const handleBook = (roomTypeId: string) => {
    if (!hotel) return
    dispatch(setSearch({ city: hotel.city, checkIn, checkOut, adults }))
    navigate(`/booking/initiate?hotelId=${hotel.id}&roomTypeId=${roomTypeId}&checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}`)
  }

  if (hotelLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-[420px] bg-gray-200 rounded-xl" />
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="col-span-2 space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/4" />
            <div className="h-32 bg-gray-200 rounded" />
          </div>
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!hotel) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <Info size={48} className="text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-700 mb-2">Hotel not found</h2>
        <p className="text-gray-500 mb-4">The hotel you're looking for doesn't exist or has been removed.</p>
        <button onClick={() => navigate(-1)} className="px-4 py-2 bg-brand-blue text-white rounded-lg text-sm">
          Go Back
        </button>
      </div>
    )
  }

  return (
    <>
      <Helmet>
        <title>{hotel.name} – {hotel.city} | MakeMyCrip</title>
        <meta name="description" content={`Book ${hotel.name} in ${hotel.neighborhood}, ${hotel.city}. ${hotel.description?.slice(0, 120)}`} />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav className="text-xs text-gray-500 mb-4 flex items-center gap-1 flex-wrap">
          <button onClick={() => navigate('/')} className="hover:text-brand-blue">Home</button>
          <ChevronRight size={12} />
          <button onClick={() => navigate(`/hotels/search?city=${hotel.city}`)} className="hover:text-brand-blue">Hotels in {hotel.city}</button>
          <ChevronRight size={12} />
          <span className="text-gray-700 font-medium">{hotel.name}</span>
        </nav>

        {/* Title row */}
        <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl md:text-3xl font-black text-gray-900">{hotel.name}</h1>
              {hotel.isFeatured && (
                <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-medium">Featured</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
              <div className="flex">
                {Array.from({ length: Math.round(Number(hotel.starRating) || 0) }).map((_, i) => (
                  <Star key={i} size={14} className="fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="flex items-center gap-1"><MapPin size={13} /> {hotel.neighborhood}, {hotel.city}</span>
              {hotel.guestRating != null && hotel.guestRating > 0 && (
                <span className="flex items-center gap-1">
                  <span className="bg-green-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">{Number(hotel.guestRating).toFixed(1)}</span>
                  <span className="text-gray-500">({hotel.reviewCount} reviews)</span>
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleWishlist(hotel.id)}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm"
            >
              <Heart size={16} className={hotel.isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-500'} />
              {hotel.isWishlisted ? 'Saved' : 'Save'}
            </button>
            <button
              onClick={() => navigator.share?.({ title: hotel.name, url: window.location.href })}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm"
            >
              <Share2 size={16} className="text-gray-500" /> Share
            </button>
          </div>
        </div>

        {/* Gallery */}
        <div className="mb-6">
          <ImageGallery images={hotel.images || []} />
        </div>

        {/* Sticky tabs */}
        <div className="sticky top-16 z-20 bg-white border-b border-gray-200 mb-6 -mx-4 px-4">
          <div className="flex overflow-x-auto gap-1 scrollbar-none">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => scrollToTab(tab)}
                className={`shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-brand-blue text-brand-blue'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Main content + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-10">

            {/* Overview */}
            <section ref={el => { tabRefs.current['Overview'] = el }} id="tab-overview">
              <h2 className="text-xl font-bold text-gray-900 mb-3">About this hotel</h2>
              <p className="text-gray-700 leading-relaxed text-sm">{hotel.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
                {hotel.primaryPhone && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Phone size={14} className="text-brand-blue" /> {hotel.primaryPhone}
                  </div>
                )}
                {hotel.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Mail size={14} className="text-brand-blue" /> {hotel.email}
                  </div>
                )}
              </div>
            </section>

            {/* Rooms */}
            <section ref={el => { tabRefs.current['Rooms'] = el }} id="tab-rooms">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Available Rooms</h2>
                {roomsLoading && <span className="text-sm text-gray-400">Loading...</span>}
              </div>
              <div className="space-y-4">
                {rooms.length === 0 && !roomsLoading && (
                  <div className="text-center py-12 text-gray-400">
                    <AlertTriangle size={32} className="mx-auto mb-2" />
                    <p>No rooms available for the selected dates.</p>
                  </div>
                )}
                {rooms.map(room => (
                  <RoomCard key={room.id} room={room} nights={nights} onSelect={handleBook} />
                ))}
              </div>
            </section>

            {/* Amenities */}
            <section ref={el => { tabRefs.current['Amenities'] = el }} id="tab-amenities">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Amenities</h2>
              {Object.entries(hotel.amenitiesByCategory || {}).map(([category, amenities]) => (
                <div key={category} className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">{category}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {(amenities as HotelAmenityDto[]).map(a => {
                      const opt = AMENITY_MAP[a.amenityName]
                      return (
                        <div key={a.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2.5">
                          {opt ? <opt.icon size={16} className="text-brand-blue" /> : <CheckCircle size={16} className="text-green-500" />}
                          <span className="text-sm text-gray-700">{opt?.label || a.amenityName.replace(/_/g, ' ')}</span>
                          {a.isPaid && <span className="text-xs text-amber-600 ml-auto">Paid</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
              {allAmenities.length === 0 && (
                <p className="text-gray-400 text-sm">No amenities listed.</p>
              )}
            </section>

            {/* Location */}
            <section ref={el => { tabRefs.current['Location'] = el }} id="tab-location">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Location</h2>
              <p className="text-sm text-gray-600 mb-4 flex items-center gap-1">
                <MapPin size={14} className="text-brand-blue" /> {hotel.addressLine1}
              </p>
              <LocationMap hotel={hotel} />
            </section>

            {/* Reviews */}
            <section ref={el => { tabRefs.current['Reviews'] = el }} id="tab-reviews">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Guest Reviews</h2>
                {hotel.guestRating != null && hotel.guestRating > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-4xl font-black text-gray-900">{Number(hotel.guestRating).toFixed(1)}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">
                        {hotel.guestRating >= 9 ? 'Exceptional' : hotel.guestRating >= 8 ? 'Excellent' : hotel.guestRating >= 7 ? 'Good' : 'Fair'}
                      </p>
                      <p className="text-xs text-gray-500">{hotel.reviewCount} reviews</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {reviews.map(r => <ReviewCard key={r.id} review={r} />)}
                {reviews.length === 0 && (
                  <p className="text-gray-400 text-center py-8">No reviews yet.</p>
                )}
              </div>

              {totalReviewPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <button disabled={reviewPage === 0} onClick={() => setReviewPage(p => p - 1)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40">
                    Previous
                  </button>
                  <span className="px-3 py-1.5 text-sm text-gray-500">{reviewPage + 1} / {totalReviewPages}</span>
                  <button disabled={reviewPage >= totalReviewPages - 1} onClick={() => setReviewPage(p => p + 1)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40">
                    Next
                  </button>
                </div>
              )}
            </section>

            {/* Policies */}
            <section ref={el => { tabRefs.current['Policies'] = el }} id="tab-policies">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Hotel Policies</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Check-in time</p>
                  <p className="font-semibold text-gray-900 flex items-center gap-1.5">
                    <Clock size={14} className="text-brand-blue" /> {hotel.checkinTime}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Check-out time</p>
                  <p className="font-semibold text-gray-900 flex items-center gap-1.5">
                    <Clock size={14} className="text-brand-blue" /> {hotel.checkoutTime}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {(hotel.policies || []).map((policy, i) => (
                  <div key={i} className="flex gap-3 border-b border-gray-100 pb-3">
                    <FileText size={16} className="text-brand-blue shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-800 mb-0.5">
                        {(policy.title || policy.policyType).replace(/_/g, ' ')}
                      </p>
                      <p className="text-sm text-gray-600">{policy.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* FAQ */}
            <section ref={el => { tabRefs.current['FAQ'] = el }} id="tab-faq">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
              <div className="space-y-2">
                {(hotel.faqs || []).map((faq, i) => <FaqItem key={i} question={faq.question} answer={faq.answer} />)}
                {(hotel.faqs || []).length === 0 && (
                  <p className="text-gray-400 text-sm">No FAQs available.</p>
                )}
              </div>
            </section>

          </div>

          {/* Sidebar */}
          <div className="hidden lg:block">
            <BookingWidget
              hotel={hotel}
              rooms={rooms}
              checkIn={checkIn}
              setCheckIn={setCheckIn}
              checkOut={checkOut}
              setCheckOut={setCheckOut}
              adults={adults}
              setAdults={setAdults}
              onBook={handleBook}
            />
          </div>
        </div>

        {/* Mobile sticky CTA */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-30">
          {rooms.find(r => r.availableRooms > 0) ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Starting from</p>
                <p className="text-xl font-black text-gray-900">
                  ₹{Number(rooms.find(r => r.availableRooms > 0)?.discountedPrice).toLocaleString('en-IN')}<span className="text-sm font-normal text-gray-500">/night</span>
                </p>
              </div>
              <button
                onClick={() => scrollToTab('Rooms')}
                className="bg-brand-red hover:bg-red-700 text-white font-bold py-3 px-8 rounded-xl transition-colors"
              >
                Select Rooms
              </button>
            </div>
          ) : (
            <button disabled className="w-full bg-gray-200 text-gray-400 font-bold py-3 rounded-xl cursor-not-allowed">
              No Availability
            </button>
          )}
        </div>
      </div>
    </>
  )
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-medium text-gray-800">{question}</span>
        {open ? <ChevronUp size={16} className="text-gray-500 shrink-0" /> : <ChevronDown size={16} className="text-gray-500 shrink-0" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 text-sm text-gray-600 border-t border-gray-100 pt-3">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
