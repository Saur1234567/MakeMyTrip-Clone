import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '@/store'
import { logout } from '@/store/slices/authSlice'
import { motion } from 'framer-motion'
import { Plane, Train, Car, Building2, User, LogOut, Heart, BookOpen, Settings } from 'lucide-react'
import NotificationBell from '@/components/layout/NotificationBell'

export default function Navbar() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useSelector((s: RootState) => s.auth)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => {
    setDropdownOpen(false)
    dispatch(logout())
    navigate('/')
  }

  const tabs = [
    { id: 'hotels', label: 'Hotels', icon: Building2, href: '/', active: true },
    { id: 'flights', label: 'Flights', icon: Plane, href: '#', active: false },
    { id: 'trains', label: 'Trains', icon: Train, href: '#', active: false },
    { id: 'cabs', label: 'Cabs', icon: Car, href: '#', active: false },
  ]

  return (
    <nav className="bg-brand-blue text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        {/* Top row */}
        <div className="flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-black text-white">
              Make<span className="text-brand-red">My</span>Crip
            </span>
          </Link>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link to="/user/bookings" className="flex items-center gap-1 text-sm hover:text-brand-orange transition-colors">
                  <BookOpen size={16} /> My Bookings
                </Link>
                <Link to="/user/wishlist" className="flex items-center gap-1 text-sm hover:text-brand-orange transition-colors">
                  <Heart size={16} /> Wishlist
                </Link>
                <NotificationBell />
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(v => !v)}
                    className="flex items-center gap-1 text-sm hover:text-brand-orange transition-colors"
                  >
                    <User size={16} /> {user?.firstName}
                  </button>
                  {dropdownOpen && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white text-gray-800 rounded-lg shadow-xl border z-50">
                      <Link
                        to="/user/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 text-sm"
                      >
                        <User size={14} /> Profile
                      </Link>
                      <Link
                        to="/user/security"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 text-sm"
                      >
                        <Settings size={14} /> Security
                      </Link>
                      {(user?.role === 'ADMIN' || user?.role === 'HOTEL_MANAGER' ||
                        user?.roles?.includes('ADMIN') || user?.roles?.includes('HOTEL_MANAGER')) && (
                        <Link
                          to="/admin/dashboard"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 text-sm"
                        >
                          <Settings size={14} /> Admin Panel
                        </Link>
                      )}
                      <hr className="my-1" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 text-sm w-full text-left text-red-600"
                      >
                        <LogOut size={14} /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/auth/login" className="text-sm hover:text-brand-orange transition-colors">Login</Link>
                <Link to="/auth/register" className="bg-white text-brand-blue px-3 py-1 rounded-full text-sm font-semibold hover:bg-brand-orange hover:text-white transition-colors">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Tab row */}
        <div className="flex gap-1 -mb-px">
          {tabs.map((tab) => (
            <div key={tab.id} className="relative">
              {tab.active ? (
                <Link
                  to={tab.href}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-white text-brand-blue rounded-t-lg"
                >
                  <tab.icon size={15} />
                  {tab.label}
                </Link>
              ) : (
                <button
                  disabled
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white/60 cursor-not-allowed relative"
                  title="Coming Soon"
                >
                  <tab.icon size={15} />
                  {tab.label}
                  <span className="absolute -top-1 -right-1 bg-brand-orange text-white text-[9px] px-1 rounded-full">
                    Soon
                  </span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </nav>
  )
}
