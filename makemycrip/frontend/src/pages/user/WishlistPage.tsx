import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Heart, MapPin, Star, Loader2 } from 'lucide-react'
import { useToggleWishlistMutation } from '@/store/api/hotelApi'
import axiosInstance from '@/lib/axios'
import { useEffect, useState } from 'react'

export default function WishlistPage() {
  const navigate = useNavigate()
  // Backend returns Wishlist[] — each item has { id, hotelId, hotel: { id, name, slug, city, neighborhood, starRating, guestRating, primaryImageUrl, startingPrice } }
  const [wishlists, setWishlists] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [toggleWishlist] = useToggleWishlistMutation()

  useEffect(() => {
    axiosInstance.get('/api/v1/users/wishlist').then(r => {
      setWishlists(r.data.data || [])
    }).finally(() => setLoading(false))
  }, [])

  const handleRemove = async (hotelId: string) => {
    await toggleWishlist(hotelId)
    setWishlists(prev => prev.filter(w => (w.hotelId || w.hotel?.id) !== hotelId))
  }

  return (
    <>
      <Helmet><title>My Wishlist | MakeMyCrip</title></Helmet>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Heart size={22} className="fill-red-500 text-red-500" /> My Wishlist
        </h1>

        {loading && (
          <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-brand-blue" /></div>
        )}

        {!loading && wishlists.length === 0 && (
          <div className="text-center py-20">
            <Heart size={48} className="text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-700 mb-2">Your wishlist is empty</h3>
            <p className="text-gray-400 text-sm mb-6">Save hotels you love to plan your next trip</p>
            <button onClick={() => navigate('/')} className="bg-brand-blue text-white px-6 py-3 rounded-xl font-semibold text-sm">
              Explore Hotels
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {wishlists.map((item, i) => {
            // Support both flat hotel object (if backend embeds) and nested hotel field
            const hotel = item.hotel || item
            const hotelId = item.hotelId || hotel.id
            const city = (hotel.city || '').toLowerCase()
            const slug = hotel.slug || ''
            const rating = hotel.guestRating ?? hotel.rating ?? 0
            const starRating = Math.round(Number(hotel.starRating) || 0)
            const price = hotel.startingPrice ?? hotel.basePrice ?? hotel.minPrice
            const imageUrl = hotel.primaryImageUrl
            const locality = hotel.neighborhood || hotel.locality || ''

            return (
              <motion.div key={item.id || hotelId} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="relative h-40 overflow-hidden cursor-pointer group"
                  onClick={() => navigate(`/hotels/${city}/${slug}`)}>
                  <img
                    src={imageUrl || '/placeholder-hotel.svg'}
                    alt={hotel.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-hotel.svg' }}
                  />
                  <button onClick={(e) => { e.stopPropagation(); handleRemove(hotelId) }}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full hover:bg-white">
                    <Heart size={15} className="fill-red-500 text-red-500" />
                  </button>
                </div>
                <div className="p-3 cursor-pointer" onClick={() => navigate(`/hotels/${city}/${slug}`)}>
                  <h3 className="font-bold text-gray-900 text-sm line-clamp-1">{hotel.name}</h3>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <MapPin size={11} /> {locality}{locality && hotel.city ? ', ' : ''}{hotel.city}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    {rating > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="bg-green-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">{Number(rating).toFixed(1)}</span>
                      </span>
                    )}
                    {starRating > 0 && (
                      <div className="flex">
                        {Array.from({ length: starRating }).map((_, j) => (
                          <Star key={j} size={11} className="fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                    )}
                  </div>
                  {price != null && (
                    <p className="font-bold text-gray-900 text-sm mt-1">
                      ₹{Number(price).toLocaleString('en-IN')}<span className="text-xs font-normal text-gray-400">/night</span>
                    </p>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </>
  )
}
