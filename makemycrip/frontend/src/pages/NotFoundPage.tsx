import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { Home, Search, ArrowLeft } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <>
      <Helmet>
        <title>404 – Page Not Found | MakeMyCrip</title>
      </Helmet>

      <div className="min-h-[calc(100vh-128px)] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-lg"
        >
          {/* Big 404 */}
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.6 }}
            className="relative mb-8"
          >
            <p className="text-[120px] font-black text-gray-100 leading-none select-none">404</p>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-4xl mb-2">🏨</p>
                <p className="text-sm font-semibold text-gray-500">Room not found</p>
              </div>
            </div>
          </motion.div>

          <h1 className="text-2xl font-black text-gray-900 mb-3">Oops! This page checked out.</h1>
          <p className="text-gray-500 mb-8 text-sm leading-relaxed">
            The page you're looking for has been moved, deleted, or never existed.
            Let's get you back on track.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="flex items-center justify-center gap-2 bg-brand-blue hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              <Home size={18} /> Go Home
            </Link>
            <button
              onClick={() => window.history.back()}
              className="flex items-center justify-center gap-2 border border-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl hover:bg-gray-50 transition-colors text-sm"
            >
              <ArrowLeft size={16} /> Go Back
            </button>
          </div>
        </motion.div>
      </div>
    </>
  )
}
