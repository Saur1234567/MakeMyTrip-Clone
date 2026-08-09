import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Hotel, BookOpen, Users, Star,
  Tag, TrendingUp, FileText, LogOut, Layers, Megaphone
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDispatch } from 'react-redux'
import { logout } from '@/store/slices/authSlice'

interface NavItem {
  label: string
  href: string
  icon: any
  children?: { label: string; href: string; icon: any }[]
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Hotels', href: '/admin/hotels', icon: Hotel },
  { label: 'Bookings', href: '/admin/bookings', icon: BookOpen },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Reviews', href: '/admin/reviews', icon: Star },
  { label: 'Promotions', href: '/admin/promotions', icon: Tag },
  { label: 'Campaigns', href: '/admin/campaigns', icon: Megaphone },
  { label: 'Pricing Rules', href: '/admin/pricing-rules', icon: TrendingUp },
  { label: 'Tax Config', href: '/admin/tax-config', icon: Layers },
  { label: 'Audit Logs', href: '/admin/audit-logs', icon: FileText },
]

export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const handleLogout = () => {
    dispatch(logout())
    navigate('/auth/login')
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-gray-900 text-white flex flex-col overflow-y-auto">
        <div className="p-4 border-b border-gray-700 shrink-0">
          <Link to="/" className="text-xl font-bold">
            MMC <span className="text-red-400">Admin</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map((item) => {
            const active = location.pathname === item.href ||
              (item.href !== '/admin/dashboard' && location.pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                )}
              >
                <item.icon size={17} />
                {item.label}
              </Link>
            )
          })}

          {/* Hotel sub-pages note */}
          <div className="pt-3 pb-1">
            <p className="text-xs text-gray-500 uppercase tracking-wider px-3 mb-1">Hotel Management</p>
            <p className="text-xs text-gray-600 px-3">
              Room Types, Rooms &amp; Inventory are accessible from the Hotels page.
            </p>
          </div>
        </nav>
        <div className="p-3 border-t border-gray-700 shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white w-full transition-colors"
          >
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
