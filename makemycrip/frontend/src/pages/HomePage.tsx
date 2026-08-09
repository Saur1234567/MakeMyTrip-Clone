import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { Search, Calendar, Users } from 'lucide-react'
import { format, addDays } from 'date-fns'
import { useDispatch } from 'react-redux'
import { setSearch } from '@/store/slices/searchSlice'
import CityAutocomplete from '@/components/common/CityAutocomplete'

const POPULAR_CITIES = [
  { name: 'Mumbai', image: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=400&q=80', hotels: '1,240+' },
  { name: 'Goa', image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=400&q=80', hotels: '890+' },
  { name: 'Delhi', image: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&q=80', hotels: '2,100+' },
  { name: 'Bangalore', image: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=400&q=80', hotels: '1,500+' },
  { name: 'Jaipur', image: 'https://images.unsplash.com/photo-1477587458883-47145ed31ffd?w=400&q=80', hotels: '670+' },
  { name: 'Udaipur', image: 'https://images.unsplash.com/photo-1568745446914-7e2f9c99e0a2?w=400&q=80', hotels: '340+' },
]

export default function HomePage() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const tomorrow = addDays(new Date(), 1)
  const dayAfter = addDays(new Date(), 2)

  const [city, setCity] = useState('')
  const [checkIn, setCheckIn] = useState(format(tomorrow, 'yyyy-MM-dd'))
  const [checkOut, setCheckOut] = useState(format(dayAfter, 'yyyy-MM-dd'))
  const [adults, setAdults] = useState(1)

  const handleSearch = () => {
    if (!city.trim()) return
    dispatch(setSearch({ city, checkIn, checkOut, adults }))
    navigate(`/hotels/search?city=${encodeURIComponent(city)}&checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}`)
  }

  return (
    <>
      <Helmet>
        <title>MakeMyCrip - Hotels, Flights, Trains | Best Travel Deals</title>
        <meta name="description" content="Book hotels at best prices. Compare 500+ hotels across India. Instant confirmation, free cancellation options." />
      </Helmet>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-brand-blue via-blue-700 to-blue-900 text-white">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative max-w-5xl mx-auto px-4 py-16 text-center">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-black mb-4"
          >
            Find Your Perfect <span className="text-brand-orange">Stay</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-blue-100 mb-8"
          >
            500,000+ hotels worldwide. Best price guarantee.
          </motion.p>

          {/* Search Widget */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-4 md:p-6 shadow-2xl text-gray-800"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-1">
                <CityAutocomplete
                  value={city}
                  onChange={setCity}
                  onSelect={(selected) => {
                    setCity(selected)
                    dispatch(setSearch({ city: selected, checkIn, checkOut, adults }))
                    navigate(`/hotels/search?city=${encodeURIComponent(selected)}&checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}`)
                  }}
                  inputClassName="py-3"
                />
              </div>
              <div className="relative">
                <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={checkIn}
                  min={format(tomorrow, 'yyyy-MM-dd')}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </div>
              <div className="relative">
                <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={checkOut}
                  min={format(addDays(new Date(checkIn), 1), 'yyyy-MM-dd')}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </div>
              <button
                onClick={handleSearch}
                className="flex items-center justify-center gap-2 bg-brand-red hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
              >
                <Search size={18} />
                Search Hotels
              </button>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Users size={16} className="text-gray-400" />
              <span className="text-sm text-gray-600">Adults:</span>
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setAdults(n)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    adults === n ? 'bg-brand-blue text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Popular Cities */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Popular Destinations</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {POPULAR_CITIES.map((city, i) => (
            <motion.div
              key={city.name}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => {
                dispatch(setSearch({ city: city.name, checkIn, checkOut, adults }))
                navigate(`/hotels/search?city=${city.name}&checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}`)
              }}
              className="cursor-pointer group"
            >
              <div className="relative overflow-hidden rounded-xl aspect-square">
                <img
                  src={city.image}
                  alt={city.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                  <p className="font-bold text-sm">{city.name}</p>
                  <p className="text-xs text-gray-300">{city.hotels} hotels</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">Why MakeMyCrip?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: 'Best Price Guarantee', desc: 'Find a lower price? We\'ll match it + give ₹500 off your next booking.', emoji: '💰' },
              { title: 'Free Cancellation', desc: 'Plans change. Cancel for free up to 24 hours before check-in.', emoji: '✅' },
              { title: '24/7 Support', desc: 'Our team is here around the clock to help you with any issue.', emoji: '🛎️' },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-xl p-6 shadow-sm text-center">
                <div className="text-4xl mb-3">{f.emoji}</div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
