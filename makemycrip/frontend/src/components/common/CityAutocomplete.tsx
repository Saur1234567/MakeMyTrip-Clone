import { useState, useEffect, useRef } from 'react'
import { MapPin, Loader2 as Spinner } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

const POPULAR_CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
  'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Goa',
  'Agra', 'Varanasi', 'Udaipur', 'Shimla', 'Manali',
  'Rishikesh', 'Mysore', 'Kochi', 'Chandigarh', 'Surat',
]

interface CityAutocompleteProps {
  value: string
  onChange: (v: string) => void
  onSelect: (city: string) => void
  /** Extra classes for the input element */
  inputClassName?: string
}

export default function CityAutocomplete({
  value,
  onChange,
  onSelect,
  inputClassName = '',
}: CityAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!value.trim()) {
      // Show popular cities when input is empty
      setSuggestions(POPULAR_CITIES.slice(0, 8))
      return
    }

    // Instant local filter
    const localMatches = POPULAR_CITIES.filter(c =>
      c.toLowerCase().includes(value.toLowerCase())
    )
    if (localMatches.length > 0) {
      setSuggestions(localMatches.slice(0, 6))
      setOpen(true)
    }

    // Debounced Nominatim API for broader search
    debounceRef.current = setTimeout(async () => {
      if (value.length < 2) return
      setLoading(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&countrycodes=in&featuretype=city&format=json&limit=6`,
          { headers: { 'Accept-Language': 'en' } }
        )
        const data = await res.json()
        const cities: string[] = data
          .map((item: any) => item.display_name.split(',')[0].trim())
          .filter((c: string, i: number, arr: string[]) => arr.indexOf(c) === i)
          .slice(0, 6)
        if (cities.length > 0) {
          setSuggestions(cities)
          setOpen(true)
        }
      } catch {
        // fallback to local matches already shown
      } finally {
        setLoading(false)
      }
    }, 400)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [value])

  return (
    <div ref={wrapperRef} className="relative w-full">
      <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => {
          setSuggestions(value.trim() ? suggestions : POPULAR_CITIES.slice(0, 8))
          setOpen(true)
        }}
        placeholder="Where are you going?"
        autoComplete="off"
        className={`w-full pl-9 pr-8 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue ${inputClassName}`}
      />
      {loading && (
        <Spinner size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
      )}
      <AnimatePresence>
        {open && suggestions.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden"
          >
            {suggestions.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 flex items-center gap-2 transition-colors"
                  onMouseDown={(e) => { e.preventDefault(); onSelect(s); setOpen(false) }}
                >
                  <MapPin size={13} className="text-gray-400 shrink-0" />
                  {s}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
