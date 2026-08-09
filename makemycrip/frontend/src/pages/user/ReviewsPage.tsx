import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Star, MessageSquare, MapPin, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import axiosInstance from '@/lib/axios'

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axiosInstance.get('/api/v1/users/reviews').then(r => {
      setReviews(r.data.data?.content || r.data.data || [])
    }).finally(() => setLoading(false))
  }, [])

  return (
    <>
      <Helmet><title>My Reviews | MakeMyCrip</title></Helmet>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Star size={22} className="text-brand-blue" /> My Reviews
        </h1>

        {loading && <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-brand-blue" /></div>}

        {!loading && reviews.length === 0 && (
          <div className="text-center py-20">
            <MessageSquare size={48} className="text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-700 mb-2">No reviews yet</h3>
            <p className="text-gray-400 text-sm">Complete a stay and share your experience!</p>
          </div>
        )}

        <div className="space-y-4">
          {reviews.map((r: any, i: number) => (
            <div key={r.id || i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-gray-900">{r.hotelName}</p>
                  {r.hotelCity && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <MapPin size={11} /> {r.hotelCity}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="bg-green-600 text-white text-sm font-bold px-2 py-0.5 rounded">
                    {Number(r.overallRating).toFixed(1)}
                  </span>
                </div>
              </div>

              {r.title && <p className="font-semibold text-gray-800 mb-1">{r.title}</p>}
              <p className="text-sm text-gray-700 leading-relaxed mb-3">{r.reviewText}</p>

              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{format(new Date(r.createdAt), 'd MMM yyyy')}</span>
                <span className={`px-2 py-0.5 rounded-full capitalize ${
                  r.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                  r.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {r.status?.toLowerCase()}
                </span>
              </div>

              {r.adminResponse && (
                <div className="mt-3 bg-blue-50 rounded-lg p-3 text-xs">
                  <p className="font-semibold text-brand-blue mb-0.5">Hotel response</p>
                  <p className="text-gray-700">{r.adminResponse}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
