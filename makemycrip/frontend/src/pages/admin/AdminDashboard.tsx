import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import {
  Building2, Calendar, DollarSign, Users, TrendingUp,
  TrendingDown, Activity, Clock, CheckCircle, XCircle, Loader2
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts'
import axiosInstance from '@/lib/axios'

interface DashboardStats {
  totalBookings: number
  bookingsChange: number
  totalRevenue: number
  revenueChange: number
  activeHotels: number
  totalGuests: number
  occupancyRate: number
  avgBookingValue: number
  recentBookings: any[]
  revenueByDay: { date: string; revenue: number; bookings: number }[]
  bookingsByStatus: { status: string; count: number }[]
  topHotels: { name: string; revenue: number; bookings: number }[]
}

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: '#22c55e',
  PENDING: '#f59e0b',
  CHECKED_IN: '#3b82f6',
  CHECKED_OUT: '#6b7280',
  CANCELLED: '#ef4444',
  NO_SHOW: '#f97316',
}

const PIE_COLORS = ['#22c55e', '#f59e0b', '#3b82f6', '#6b7280', '#ef4444']

function StatCard({ label, value, change, icon: Icon, prefix = '', format: fmt }: {
  label: string
  value: number
  change?: number
  icon: any
  prefix?: string
  format?: 'currency' | 'percent' | 'number'
}) {
  const displayValue = fmt === 'currency'
    ? `₹${(value / 100000).toFixed(1)}L`
    : fmt === 'percent'
    ? `${value.toFixed(1)}%`
    : value.toLocaleString('en-IN')

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
          <Icon size={20} className="text-brand-blue" />
        </div>
      </div>
      <p className="text-2xl font-black text-gray-900">{prefix}{displayValue}</p>
      {change !== undefined && (
        <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(change).toFixed(1)}% vs last month
        </div>
      )}
    </motion.div>
  )
}

const MOCK_STATS: DashboardStats = {
  totalBookings: 0,
  bookingsChange: 0,
  totalRevenue: 0,
  revenueChange: 0,
  activeHotels: 0,
  totalGuests: 0,
  occupancyRate: 0,
  avgBookingValue: 0,
  recentBookings: [],
  revenueByDay: [],
  bookingsByStatus: [],
  topHotels: [],
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>(MOCK_STATS)
  const [loading, setLoading] = useState(true)
  const [liveBookings, setLiveBookings] = useState<any[]>([])

  useEffect(() => {
    let cancelled = false
    axiosInstance.get('/api/v1/admin/dashboard/stats')
      .then(r => {
        if (!cancelled) setStats(r.data.data ?? MOCK_STATS)
      })
      .catch(() => {
        if (!cancelled) setStats(MOCK_STATS)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  // WebSocket for live bookings — use correct WS port (8081)
  useEffect(() => {
    let ws: WebSocket | null = null
    try {
      const wsBase = (import.meta.env.VITE_WS_URL || 'ws://localhost:8081')
      ws = new WebSocket(`${wsBase}/ws/admin/bookings`)
      ws.onmessage = (e) => {
        try {
          const booking = JSON.parse(e.data)
          setLiveBookings(prev => [booking, ...prev].slice(0, 10))
        } catch {}
      }
    } catch {}
    return () => { ws?.close() }
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 size={32} className="animate-spin text-brand-blue" />
      </div>
    )
  }

  return (
    <>
      <Helmet><title>Admin Dashboard | MakeMyCrip</title></Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Activity size={14} className="text-green-500 animate-pulse" />
            Live
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Bookings" value={stats.totalBookings} change={stats.bookingsChange} icon={Calendar} />
          <StatCard label="Total Revenue" value={stats.totalRevenue} change={stats.revenueChange} icon={DollarSign} format="currency" />
          <StatCard label="Active Hotels" value={stats.activeHotels} icon={Building2} />
          <StatCard label="Occupancy Rate" value={stats.occupancyRate} icon={TrendingUp} format="percent" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue chart */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-bold text-gray-900 mb-4">Revenue & Bookings (Last 30 days)</h2>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={stats.revenueByDay}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#1e3a8a" fill="url(#revGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Bookings by status pie */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-bold text-gray-900 mb-4">Bookings by Status</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={stats.bookingsByStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={70}>
                  {stats.bookingsByStatus.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.status] || PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend formatter={(v) => <span className="text-xs capitalize">{v.toLowerCase().replace('_', ' ')}</span>} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top hotels */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-bold text-gray-900 mb-4">Top Hotels by Revenue</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.topHotels} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}K`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#1e3a8a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Live + recent bookings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              Recent Bookings
              {liveBookings.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                  <Activity size={11} className="animate-pulse" /> {liveBookings.length} new
                </span>
              )}
            </h2>
            <div className="space-y-2">
              {[...(liveBookings.length > 0 ? liveBookings : []), ...(stats.recentBookings || [])].slice(0, 8).map((b: any, i: number) => (
                <div key={`${b.bookingRef}-${i}`} className={`flex items-center justify-between py-2 border-b border-gray-50 last:border-0 ${i < liveBookings.length ? 'bg-green-50 -mx-2 px-2 rounded-lg' : ''}`}>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{b.hotelName || b.hotel?.name}</p>
                    <p className="text-xs text-gray-500 font-mono">{b.bookingRef}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">₹{Number(b.totalAmount).toLocaleString('en-IN')}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                      b.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                      b.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {b.status}
                    </span>
                  </div>
                </div>
              ))}
              {stats.recentBookings?.length === 0 && liveBookings.length === 0 && (
                <p className="text-center text-gray-400 py-8 text-sm">No recent bookings</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
