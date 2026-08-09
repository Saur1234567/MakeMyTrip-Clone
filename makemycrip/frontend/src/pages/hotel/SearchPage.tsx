import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin, Calendar, Users, Search, Star, Heart, SlidersHorizontal,
  LayoutGrid, List, Map as MapIcon, ChevronDown, X, Filter,
  Wifi, Wind, Car, Waves, Dumbbell, Coffee, ArrowUpDown, AlertCircle,
  Navigation, Loader2 as Spinner
} from 'lucide-react'
import CityAutocomplete from '@/components/common/CityAutocomplete'
import { format, addDays, differenceInDays, parseISO, isValid } from 'date-fns'
import { useDispatch } from 'react-redux'
import { setSearch } from '@/store/slices/searchSlice'
import { useSearchHotelsQuery, useToggleWishlistMutation } from '@/store/api/hotelApi'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Hotel {
  id: string
  name: string
  slug: string
  city: string
  locality: string
  address: string
  starRating: number
  hotelType: string
  primaryImageUrl: string
  rating: number
  reviewCount: number
  basePrice: number
  discountedPrice: number
  taxAmount: number
  freeCancellation: boolean
  isWishlisted: boolean
  amenities: string[]
  minAvailableRooms: number
  latitude?: number
  longitude?: number
}

interface SearchFilters {
  minPrice: number
  maxPrice: number
  starRatings: number[]
  freeCancellation: boolean
  amenities: string[]
  guestRating: number | null
  hotelType: string[]
}

type ViewMode = 'grid' | 'list' | 'map'
type SortOption = 'popularity' | 'price_asc' | 'price_desc' | 'rating' | 'distance'

const DEFAULT_FILTERS: SearchFilters = {
  minPrice: 0,
  maxPrice: 20000,
  starRatings: [],
  freeCancellation: false,
  amenities: [],
  guestRating: null,
  hotelType: [],
}

const AMENITY_OPTIONS = [
  { key: 'FREE_WIFI', label: 'Free WiFi', icon: Wifi },
  { key: 'AIR_CONDITIONING', label: 'AC', icon: Wind },
  { key: 'FREE_PARKING', label: 'Parking', icon: Car },
  { key: 'SWIMMING_POOL', label: 'Pool', icon: Waves },
  { key: 'GYM', label: 'Gym', icon: Dumbbell },
  { key: 'RESTAURANT', label: 'Restaurant', icon: Coffee },
]

const HOTEL_TYPES = ['BUDGET', 'BUSINESS', 'RESORT', 'BOUTIQUE', 'APARTMENT', 'HOSTEL']
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'popularity', label: 'Popularity' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Guest Rating' },
]

// Map frontend sort values to backend expected uppercase values
const SORT_VALUE_MAP: Record<SortOption, string> = {
  popularity: 'POPULARITY',
  price_asc: 'PRICE_ASC',
  price_desc: 'PRICE_DESC',
  rating: 'RATING',
  distance: 'DISTANCE',
}

// ─── Skeleton Card ───────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 animate-pulse">
      <div className="h-48 bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="flex gap-2">
          {[1, 2, 3].map(i => <div key={i} className="h-6 w-16 bg-gray-200 rounded-full" />)}
        </div>
        <div className="flex justify-between items-end pt-2">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-10 bg-gray-200 rounded w-1/4" />
        </div>
      </div>
    </div>
  )
}

// ─── Hotel Card (Grid) ───────────────────────────────────────────────────────

function HotelCardGrid({ hotel, nights, onWishlist }: {
  hotel: Hotel
  nights: number
  onWishlist: (id: string) => void
}) {
  const navigate = useNavigate()
  const [imgError, setImgError] = useState(false)
  const discountPct = hotel.basePrice > hotel.discountedPrice
    ? Math.round((1 - hotel.discountedPrice / hotel.basePrice) * 100)
    : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group"
      onClick={() => navigate(`/hotels/${hotel.city.toLowerCase()}/${hotel.slug}`)}
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={imgError ? '/placeholder-hotel.jpg' : hotel.primaryImageUrl}
          alt={hotel.name}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {discountPct > 0 && (
          <div className="absolute top-3 left-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            {discountPct}% OFF
          </div>
        )}
        {hotel.minAvailableRooms > 0 && hotel.minAvailableRooms <= 3 && (
          <div className="absolute top-3 right-10 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            Only {hotel.minAvailableRooms} left!
          </div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onWishlist(hotel.id) }}
          className="absolute top-3 right-3 p-1.5 bg-white/90 rounded-full hover:bg-white transition-colors"
        >
          <Heart
            size={16}
            className={hotel.isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-400'}
          />
        </button>
        {hotel.freeCancellation && (
          <div className="absolute bottom-3 left-3 bg-teal-600 text-white text-xs px-2 py-0.5 rounded-full">
            Free cancellation
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-1">{hotel.name}</h3>
          <div className="flex items-center gap-1 shrink-0">
            {Array.from({ length: Math.round(hotel.starRating || 0) }).map((_, i) => (
              <span key={i} className="text-yellow-400 text-xs">★</span>
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
          <MapPin size={11} /> {hotel.locality}, {hotel.city}
        </p>

        <div className="flex flex-wrap gap-1 mb-3">
          {(hotel.amenities || []).slice(0, 3).map((a) => {
            const opt = AMENITY_OPTIONS.find(o => o.key === a)
            return opt ? (
              <span key={a} className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                <opt.icon size={10} /> {opt.label}
              </span>
            ) : null
          })}
        </div>

        <div className="flex items-center justify-between">
          <div>
            {hotel.rating > 0 && (
              <div className="flex items-center gap-1 mb-1">
                <span className="bg-green-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                  {hotel.rating.toFixed(1)}
                </span>
                <span className="text-xs text-gray-500">({hotel.reviewCount} reviews)</span>
              </div>
            )}
            <div className="flex items-baseline gap-1">
              {discountPct > 0 && (
                <span className="text-xs text-gray-400 line-through">₹{hotel.basePrice.toLocaleString('en-IN')}</span>
              )}
              <span className="text-lg font-black text-gray-900">₹{hotel.discountedPrice.toLocaleString('en-IN')}</span>
            </div>
            <p className="text-xs text-gray-500">+₹{hotel.taxAmount.toLocaleString('en-IN')} taxes · {nights} night{nights !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/hotels/${hotel.city.toLowerCase()}/${hotel.slug}`) }}
            className="bg-brand-red hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Book
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Hotel Card (List) ───────────────────────────────────────────────────────

function HotelCardList({ hotel, nights, onWishlist }: {
  hotel: Hotel
  nights: number
  onWishlist: (id: string) => void
}) {
  const navigate = useNavigate()
  const [imgError, setImgError] = useState(false)
  const discountPct = hotel.basePrice > hotel.discountedPrice
    ? Math.round((1 - hotel.discountedPrice / hotel.basePrice) * 100)
    : 0

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group flex"
      onClick={() => navigate(`/hotels/${hotel.city.toLowerCase()}/${hotel.slug}`)}
    >
      <div className="relative w-64 shrink-0 overflow-hidden">
        <img
          src={imgError ? '/placeholder-hotel.jpg' : hotel.primaryImageUrl}
          alt={hotel.name}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {discountPct > 0 && (
          <div className="absolute top-3 left-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            {discountPct}% OFF
          </div>
        )}
        {hotel.minAvailableRooms > 0 && hotel.minAvailableRooms <= 3 && (
          <div className="absolute bottom-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            Only {hotel.minAvailableRooms} left!
          </div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onWishlist(hotel.id) }}
          className="absolute top-3 right-3 p-1.5 bg-white/90 rounded-full hover:bg-white transition-colors"
        >
          <Heart size={16} className={hotel.isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-400'} />
        </button>
      </div>

      <div className="flex-1 p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-bold text-gray-900 leading-tight">{hotel.name}</h3>
            <div className="flex items-center gap-0.5 shrink-0">
              {Array.from({ length: Math.round(hotel.starRating || 0) }).map((_, i) => (
                <Star key={i} size={12} className="fill-yellow-400 text-yellow-400" />
              ))}
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-3 flex items-center gap-1">
            <MapPin size={13} /> {hotel.locality}, {hotel.city}
          </p>
          <div className="flex flex-wrap gap-1 mb-3">
            {(hotel.amenities || []).slice(0, 5).map((a) => {
              const opt = AMENITY_OPTIONS.find(o => o.key === a)
              return opt ? (
                <span key={a} className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                  <opt.icon size={10} /> {opt.label}
                </span>
              ) : null
            })}
            {hotel.freeCancellation && (
              <span className="bg-teal-50 text-teal-700 text-xs px-2 py-0.5 rounded-full border border-teal-200">
                Free cancellation
              </span>
            )}
          </div>
        </div>

        <div className="flex items-end justify-between">
          <div>
            {hotel.rating > 0 && (
              <div className="flex items-center gap-1 mb-1">
                <span className="bg-green-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                  {hotel.rating.toFixed(1)}
                </span>
                <span className="text-xs text-gray-500">{hotel.reviewCount} reviews</span>
              </div>
            )}
          </div>
          <div className="text-right">
            {discountPct > 0 && (
              <span className="text-sm text-gray-400 line-through block">₹{hotel.basePrice.toLocaleString('en-IN')}</span>
            )}
            <span className="text-2xl font-black text-gray-900">₹{hotel.discountedPrice.toLocaleString('en-IN')}</span>
            <p className="text-xs text-gray-500">+₹{hotel.taxAmount.toLocaleString('en-IN')} taxes · {nights} nights</p>
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/hotels/${hotel.city.toLowerCase()}/${hotel.slug}`) }}
              className="mt-2 bg-brand-red hover:bg-red-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
            >
              Book Now
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Filter Sidebar ──────────────────────────────────────────────────────────

function FilterSidebar({ filters, onChange, onReset, totalResults }: {
  filters: SearchFilters
  onChange: (f: Partial<SearchFilters>) => void
  onReset: () => void
  totalResults: number
}) {
  const toggleStar = (s: number) => {
    const next = filters.starRatings.includes(s)
      ? filters.starRatings.filter(r => r !== s)
      : [...filters.starRatings, s]
    onChange({ starRatings: next })
  }

  const toggleAmenity = (key: string) => {
    const next = filters.amenities.includes(key)
      ? filters.amenities.filter(a => a !== key)
      : [...filters.amenities, key]
    onChange({ amenities: next })
  }

  const toggleType = (t: string) => {
    const next = filters.hotelType.includes(t)
      ? filters.hotelType.filter(x => x !== t)
      : [...filters.hotelType, t]
    onChange({ hotelType: next })
  }

  const activeCount = (
    filters.starRatings.length +
    filters.amenities.length +
    filters.hotelType.length +
    (filters.freeCancellation ? 1 : 0) +
    (filters.guestRating ? 1 : 0) +
    (filters.minPrice > 0 || filters.maxPrice < 20000 ? 1 : 0)
  )

  return (
    <aside className="w-64 shrink-0">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sticky top-20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Filter size={16} /> Filters
            {activeCount > 0 && (
              <span className="bg-brand-blue text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </h3>
          {activeCount > 0 && (
            <button onClick={onReset} className="text-xs text-brand-blue hover:underline">Reset all</button>
          )}
        </div>

        <p className="text-xs text-gray-500 mb-4">{totalResults} properties found</p>

        {/* Price Range */}
        <div className="mb-5">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">Price per night</h4>
          <div className="space-y-2">
            <input
              type="range"
              min={0}
              max={20000}
              step={500}
              value={filters.maxPrice}
              onChange={(e) => onChange({ maxPrice: Number(e.target.value) })}
              className="w-full accent-brand-blue"
            />
            <div className="flex justify-between text-xs text-gray-600">
              <span>₹{filters.minPrice.toLocaleString('en-IN')}</span>
              <span>₹{filters.maxPrice.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Star Rating */}
        <div className="mb-5">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">Star rating</h4>
          <div className="flex flex-wrap gap-2">
            {[5, 4, 3, 2, 1].map((s) => (
              <button
                key={s}
                onClick={() => toggleStar(s)}
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-colors ${
                  filters.starRatings.includes(s)
                    ? 'bg-brand-blue text-white border-brand-blue'
                    : 'border-gray-200 text-gray-700 hover:border-brand-blue'
                }`}
              >
                {s}<Star size={10} className={filters.starRatings.includes(s) ? 'fill-current' : 'fill-yellow-400 text-yellow-400'} />
              </button>
            ))}
          </div>
        </div>

        {/* Guest Rating */}
        <div className="mb-5">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">Guest rating</h4>
          <div className="space-y-1">
            {[{ label: 'Exceptional (9+)', val: 9 }, { label: 'Excellent (8+)', val: 8 }, { label: 'Good (7+)', val: 7 }].map(({ label, val }) => (
              <button
                key={val}
                onClick={() => onChange({ guestRating: filters.guestRating === val ? null : val })}
                className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-colors ${
                  filters.guestRating === val
                    ? 'bg-brand-blue/10 text-brand-blue font-medium'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Amenities */}
        <div className="mb-5">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">Amenities</h4>
          <div className="space-y-2">
            {AMENITY_OPTIONS.map(({ key, label, icon: Icon }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.amenities.includes(key)}
                  onChange={() => toggleAmenity(key)}
                  className="accent-brand-blue rounded"
                />
                <Icon size={13} className="text-gray-500" />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Hotel Type */}
        <div className="mb-5">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">Property type</h4>
          <div className="flex flex-wrap gap-2">
            {HOTEL_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => toggleType(t)}
                className={`text-xs px-2 py-1 rounded-full border transition-colors capitalize ${
                  filters.hotelType.includes(t)
                    ? 'bg-brand-blue text-white border-brand-blue'
                    : 'border-gray-200 text-gray-700 hover:border-brand-blue'
                }`}
              >
                {t.toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Free Cancellation */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.freeCancellation}
            onChange={(e) => onChange({ freeCancellation: e.target.checked })}
            className="accent-brand-blue rounded"
          />
          <span className="text-sm text-gray-700">Free cancellation</span>
        </label>
      </div>
    </aside>
  )
}

// ─── Map View ────────────────────────────────────────────────────────────────

function MapView({ hotels }: { hotels: Hotel[] }) {
  const mapRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const initMap = async () => {
      const L = (await import('leaflet')).default

      if (!containerRef.current) return

      // Destroy existing map instance before re-creating
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }

      const firstHotel = hotels.find(h => h.latitude && h.longitude)
      const center: [number, number] = firstHotel
        ? [firstHotel.latitude!, firstHotel.longitude!]
        : [20.5937, 78.9629]

      const map = L.map(containerRef.current).setView(center, 12)
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map)

      hotels.forEach(h => {
        if (!h.latitude || !h.longitude) return
        const icon = L.divIcon({
          className: '',
          html: `<div style="background:#1e3a8a;color:white;padding:4px 8px;border-radius:999px;font-size:12px;font-weight:bold;white-space:nowrap">₹${(h.discountedPrice / 1000).toFixed(0)}K</div>`,
          iconAnchor: [30, 15],
        })
        L.marker([h.latitude, h.longitude], { icon })
          .addTo(map)
          .bindPopup(`<b>${h.name}</b><br/>₹${h.discountedPrice.toLocaleString('en-IN')}/night`)
      })
    }

    initMap()

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [hotels])

  return (
    <div ref={containerRef} className="w-full h-[600px] rounded-xl overflow-hidden border border-gray-200" />
  )
}

// ─── Main SearchPage ─────────────────────────────────────────────────────────

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const urlCity = searchParams.get('city') || ''
  const urlCheckIn = searchParams.get('checkIn') || format(addDays(new Date(), 1), 'yyyy-MM-dd')
  const urlCheckOut = searchParams.get('checkOut') || format(addDays(new Date(), 2), 'yyyy-MM-dd')
  const urlAdults = Number(searchParams.get('adults') || 1)

  const [city, setCity] = useState(urlCity)
  const [checkIn, setCheckIn] = useState(urlCheckIn)
  const [checkOut, setCheckOut] = useState(urlCheckOut)
  const [adults, setAdults] = useState(urlAdults)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortBy, setSortBy] = useState<SortOption>('popularity')
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS)
  const [filterOpen, setFilterOpen] = useState(false)
  const [page, setPage] = useState(0)
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState('')

  const nights = (checkIn && checkOut && isValid(parseISO(checkIn)) && isValid(parseISO(checkOut)))
    ? differenceInDays(parseISO(checkOut), parseISO(checkIn)) || 1
    : 1

  // Geolocation: detect user city via browser GPS + reverse geocoding
  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation not supported by your browser')
      return
    }
    setGeoLoading(true)
    setGeoError('')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          )
          const data = await res.json()
          const detectedCity =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.county ||
            ''
          if (detectedCity) {
            setCity(detectedCity)
            dispatch(setSearch({ city: detectedCity, checkIn, checkOut, adults }))
            setSearchParams({ city: detectedCity, checkIn, checkOut, adults: String(adults) })
            setPage(0)
          } else {
            setGeoError('Could not detect your city. Please type manually.')
          }
        } catch {
          setGeoError('Location lookup failed. Please type your city.')
        } finally {
          setGeoLoading(false)
        }
      },
      (err) => {
        setGeoLoading(false)
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError('Location access denied. Please type your city.')
        } else {
          setGeoError('Could not get your location. Please type manually.')
        }
      },
      { timeout: 8000, maximumAge: 60000 }
    )
  }, [checkIn, checkOut, adults, dispatch, setSearchParams])

  const queryParams = {
    city: urlCity,
    checkIn: urlCheckIn,
    checkOut: urlCheckOut,
    adults: urlAdults,
    page,
    size: 12,
    sortBy: SORT_VALUE_MAP[sortBy],
    ...(filters.minPrice > 0 && { minPrice: filters.minPrice }),
    ...(filters.maxPrice < 20000 && { maxPrice: filters.maxPrice }),
    ...(filters.starRatings.length > 0 && { starRatings: filters.starRatings }),
    ...(filters.freeCancellation && { freeCancellation: true }),
    ...(filters.guestRating && { minGuestRating: filters.guestRating }),
    ...(filters.amenities.length > 0 && { amenities: filters.amenities }),
    ...(filters.hotelType.length > 0 && { hotelTypes: filters.hotelType }),
  }

  const { data, isLoading, isFetching, isError } = useSearchHotelsQuery(queryParams, {
    skip: !urlCity,
  })

  const [toggleWishlist] = useToggleWishlistMutation()

  const hotels: Hotel[] = data?.data?.content || []
  const totalElements = data?.data?.totalElements || 0
  const totalPages = data?.data?.totalPages || 0

  const handleSearch = () => {
    if (!city.trim()) return
    dispatch(setSearch({ city, checkIn, checkOut, adults }))
    setSearchParams({
      city: city.trim(),
      checkIn,
      checkOut,
      adults: String(adults),
    })
    setPage(0)
  }

  const handleFilterChange = useCallback((partial: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...partial }))
    setPage(0)
  }, [])

  const handleFilterReset = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
    setPage(0)
  }, [])

  const handleWishlist = async (hotelId: string) => {
    await toggleWishlist(hotelId)
  }

  const activeFilterCount = (
    filters.starRatings.length +
    filters.amenities.length +
    filters.hotelType.length +
    (filters.freeCancellation ? 1 : 0) +
    (filters.guestRating ? 1 : 0) +
    (filters.minPrice > 0 || filters.maxPrice < 20000 ? 1 : 0)
  )

  return (
    <>
      <Helmet>
        <title>{urlCity ? `Hotels in ${urlCity} | MakeMyCrip` : 'Hotel Search | MakeMyCrip'}</title>
        <meta name="description" content={`Find best hotels in ${urlCity}. Compare prices, read reviews, get best deals.`} />
      </Helmet>

      {/* Search Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <div className="md:col-span-2 flex gap-2">
              <div className="flex-1">
                <CityAutocomplete
                  value={city}
                  onChange={setCity}
                  onSelect={(selected) => {
                    setCity(selected)
                    dispatch(setSearch({ city: selected, checkIn, checkOut, adults }))
                    setSearchParams({ city: selected, checkIn, checkOut, adults: String(adults) })
                    setPage(0)
                  }}
                  inputClassName="py-2.5"
                />
              </div>
              <button
                type="button"
                onClick={handleUseMyLocation}
                disabled={geoLoading}
                title="Use my location"
                className="shrink-0 flex items-center justify-center w-10 h-10 border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-brand-blue transition-colors disabled:opacity-50"
              >
                {geoLoading
                  ? <Spinner size={16} className="animate-spin text-brand-blue" />
                  : <Navigation size={16} className="text-brand-blue" />
                }
              </button>
            </div>
            <div className="relative">
              <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={checkIn}
                min={format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
            </div>
            <div className="relative">
              <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={checkOut}
                min={checkIn && isValid(parseISO(checkIn)) ? format(addDays(parseISO(checkIn), 1), 'yyyy-MM-dd') : format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
            </div>
            <button
              onClick={handleSearch}
              className="flex items-center justify-center gap-2 bg-brand-red hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-xl transition-colors text-sm"
            >
              <Search size={16} /> Search
            </button>
          </div>

          {/* Geo error */}
          {geoError && (
            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
              <AlertCircle size={12} /> {geoError}
            </p>
          )}

          {/* Adults selector */}
          <div className="flex items-center gap-2 mt-2">
            <Users size={14} className="text-gray-400" />
            <span className="text-xs text-gray-500">Adults:</span>
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setAdults(n)}
                className={`w-7 h-7 rounded-full text-xs font-medium transition-colors ${
                  adults === n ? 'bg-brand-blue text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {n}
              </button>
            ))}
            <span className="text-xs text-gray-400 ml-2">{nights} night{nights !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {urlCity ? `Hotels in ${urlCity}` : 'Search Results'}
            </h1>
            {!isLoading && (
              <p className="text-sm text-gray-500 mt-0.5">
                {totalElements} properties found
                {urlCheckIn && isValid(parseISO(urlCheckIn)) && isValid(parseISO(urlCheckOut)) && ` · ${format(parseISO(urlCheckIn), 'd MMM')} – ${format(parseISO(urlCheckOut), 'd MMM yyyy')}`}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile filter toggle */}
            <button
              onClick={() => setFilterOpen(true)}
              className="lg:hidden flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
            >
              <SlidersHorizontal size={15} />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-brand-blue text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Sort */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="appearance-none pl-8 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue bg-white cursor-pointer"
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ArrowUpDown size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* View mode */}
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              {([
                { mode: 'grid' as ViewMode, Icon: LayoutGrid },
                { mode: 'list' as ViewMode, Icon: List },
                { mode: 'map' as ViewMode, Icon: MapIcon },
              ]).map(({ mode, Icon }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`p-2 transition-colors ${
                    viewMode === mode ? 'bg-brand-blue text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={16} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block">
            <FilterSidebar
              filters={filters}
              onChange={handleFilterChange}
              onReset={handleFilterReset}
              totalResults={totalElements}
            />
          </div>

          {/* Results */}
          <div className="flex-1 min-w-0">
            {isError && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <AlertCircle size={48} className="text-red-400 mb-4" />
                <h3 className="text-lg font-bold text-gray-800 mb-2">Something went wrong</h3>
                <p className="text-gray-500 text-sm">Could not load hotels. Please try again.</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-brand-blue text-white rounded-lg text-sm"
                >
                  Retry
                </button>
              </div>
            )}

            {!isError && viewMode === 'map' && (
              <MapView hotels={hotels} />
            )}

            {!isError && viewMode !== 'map' && (
              <>
                {(isLoading || isFetching) && (
                  <div className={viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4'
                    : 'flex flex-col gap-4'
                  }>
                    {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                  </div>
                )}

                {!isLoading && !isFetching && hotels.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Search size={48} className="text-gray-300 mb-4" />
                    <h3 className="text-lg font-bold text-gray-700 mb-2">No hotels found</h3>
                    <p className="text-gray-500 text-sm max-w-sm">
                      Try adjusting your filters or search for a different city.
                    </p>
                    {activeFilterCount > 0 && (
                      <button
                        onClick={handleFilterReset}
                        className="mt-4 px-4 py-2 bg-brand-blue text-white rounded-lg text-sm"
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>
                )}

                {!isLoading && !isFetching && hotels.length > 0 && (
                  <AnimatePresence mode="wait">
                    <div className={viewMode === 'grid'
                      ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4'
                      : 'flex flex-col gap-4'
                    }>
                      {hotels.map(hotel =>
                        viewMode === 'grid'
                          ? <HotelCardGrid key={hotel.id} hotel={hotel} nights={nights} onWishlist={handleWishlist} />
                          : <HotelCardList key={hotel.id} hotel={hotel} nights={nights} onWishlist={handleWishlist} />
                      )}
                    </div>
                  </AnimatePresence>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                      disabled={page === 0}
                      onClick={() => setPage(p => p - 1)}
                      className="px-4 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors"
                    >
                      Previous
                    </button>
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      const pg = totalPages <= 7 ? i : page < 4 ? i : page > totalPages - 4 ? totalPages - 7 + i : page - 3 + i
                      return (
                        <button
                          key={pg}
                          onClick={() => setPage(pg)}
                          className={`w-9 h-9 rounded-lg text-sm transition-colors ${
                            pg === page ? 'bg-brand-blue text-white' : 'border border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {pg + 1}
                        </button>
                      )
                    })}
                    <button
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage(p => p + 1)}
                      className="px-4 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      <AnimatePresence>
        {filterOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setFilterOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed top-0 left-0 bottom-0 w-80 bg-white z-50 overflow-y-auto lg:hidden"
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-bold text-gray-900">Filters</h3>
                <button onClick={() => setFilterOpen(false)}>
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              <div className="p-4">
                <FilterSidebar
                  filters={filters}
                  onChange={handleFilterChange}
                  onReset={handleFilterReset}
                  totalResults={totalElements}
                />
              </div>
              <div className="sticky bottom-0 bg-white border-t p-4">
                <button
                  onClick={() => setFilterOpen(false)}
                  className="w-full bg-brand-blue text-white py-3 rounded-xl font-semibold"
                >
                  Show {totalElements} properties
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
