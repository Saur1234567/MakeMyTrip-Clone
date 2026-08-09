import { useState, useEffect, useCallback } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Loader2, CheckCircle, AlertTriangle, RefreshCw, Ban, UserCheck, Shield, Star, Trash2, LogOut } from 'lucide-react'
import axiosInstance from '@/lib/axios'

const inp = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue'
const lbl = 'block text-xs font-medium text-gray-700 mb-1'

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  HOTEL_MANAGER: 'bg-blue-100 text-blue-700',
  USER: 'bg-gray-100 text-gray-600',
}
const TIER_COLORS: Record<string, string> = {
  BRONZE: 'bg-amber-100 text-amber-700',
  SILVER: 'bg-gray-100 text-gray-600',
  GOLD: 'bg-yellow-100 text-yellow-700',
  PLATINUM: 'bg-cyan-100 text-cyan-700',
}

function UserDetailModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('profile')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [isErr, setIsErr] = useState(false)
  const [pointsAdj, setPointsAdj] = useState('')
  const [pointsReason, setPointsReason] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await axiosInstance.get(`/api/v1/admin/users/${userId}`)
      setUser(res.data.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [userId])

  const flash = (m: string, err = false) => {
    setMsg(m); setIsErr(err)
    setTimeout(() => setMsg(''), 3000)
  }

  const action = async (endpoint: string, method: 'post' | 'patch' | 'delete', body?: any, label = 'Done') => {
    setSaving(true)
    try {
      await (axiosInstance as any)[method](endpoint, body)
      flash(label)
      load()
    } catch (e: any) { flash(e?.response?.data?.message || 'Failed', true) }
    finally { setSaving(false) }
  }

  if (loading) return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-white" />
    </div>
  )

  if (!user) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-blue flex items-center justify-center text-white font-bold text-sm">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </div>
            <div>
              <h2 className="font-bold text-gray-900">{user.firstName} {user.lastName}</h2>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>

        <div className="flex gap-1 px-5 pt-3 pb-2 border-b border-gray-100 overflow-x-auto">
          {['profile','actions','bookings'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 text-xs font-medium rounded-lg capitalize whitespace-nowrap ${tab === t ? 'bg-brand-blue text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{t}</button>
          ))}
        </div>

        {msg && (
          <div className={`mx-5 mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm ${isErr ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {isErr ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}{msg}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'profile' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Phone', user.phone || '—'],
                  ['Role', user.role],
                  ['Loyalty Tier', user.loyaltyTier || 'BRONZE'],
                  ['Loyalty Points', user.loyaltyPoints || 0],
                  ['Status', user.isBanned ? 'BANNED' : user.isActive ? 'ACTIVE' : 'INACTIVE'],
                  ['Email Verified', user.isEmailVerified ? 'Yes' : 'No'],
                  ['Phone Verified', user.isPhoneVerified ? 'Yes' : 'No'],
                  ['Total Bookings', user.totalBookings || 0],
                  ['Total Spent', `₹${(user.totalSpent || 0).toLocaleString('en-IN')}`],
                  ['Joined', user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN') : '—'],
                ].map(([k, v]) => (
                  <div key={k} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500">{k}</p>
                    <p className="font-medium text-gray-800 mt-0.5">{String(v)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'actions' && (
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Account Status</h3>
                <div className="flex gap-2">
                  {user.isBanned ? (
                    <button onClick={() => action(`/api/v1/admin/users/${userId}/unban`, 'post', {}, 'User unbanned')} disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700">
                      <UserCheck size={14} /> Unban User
                    </button>
                  ) : (
                    <button onClick={() => action(`/api/v1/admin/users/${userId}/ban`, 'post', { reason: 'Admin action' }, 'User banned')} disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700">
                      <Ban size={14} /> Ban User
                    </button>
                  )}
                  <button onClick={() => action(`/api/v1/admin/users/${userId}/terminate-sessions`, 'post', {}, 'Sessions terminated')} disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
                    <LogOut size={14} /> Terminate Sessions
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Change Role</h3>
                <div className="flex gap-2 flex-wrap">
                  {['USER','HOTEL_MANAGER','ADMIN'].map(r => (
                    <button key={r} onClick={() => action(`/api/v1/admin/users/${userId}/role`, 'patch', { role: r }, `Role changed to ${r}`)} disabled={saving}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${user.role === r ? 'bg-brand-blue text-white border-brand-blue' : 'border-gray-200 hover:border-brand-blue'}`}>
                      {r.replace('_',' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Set Loyalty Tier</h3>
                <div className="flex gap-2 flex-wrap">
                  {['BRONZE','SILVER','GOLD','PLATINUM'].map(t => (
                    <button key={t} onClick={() => action(`/api/v1/admin/users/${userId}/loyalty-tier`, 'patch', { tier: t }, `Tier set to ${t}`)} disabled={saving}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${user.loyaltyTier === t ? 'bg-brand-blue text-white border-brand-blue' : 'border-gray-200 hover:border-brand-blue'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Adjust Loyalty Points</h3>
                <div className="flex gap-2">
                  <input type="number" value={pointsAdj} onChange={e => setPointsAdj(e.target.value)} className={inp} placeholder="Points (use - for deduction)" />
                  <input value={pointsReason} onChange={e => setPointsReason(e.target.value)} className={inp} placeholder="Reason" />
                  <button onClick={() => action(`/api/v1/admin/users/${userId}/loyalty-points`, 'patch', { points: Number(pointsAdj), reason: pointsReason }, 'Points adjusted')} disabled={saving || !pointsAdj}
                    className="px-4 py-2 bg-brand-blue text-white rounded-xl text-sm font-medium whitespace-nowrap hover:bg-blue-700">
                    Apply
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Verification</h3>
                <div className="flex gap-2">
                  {!user.isEmailVerified && (
                    <button onClick={() => action(`/api/v1/admin/users/${userId}/verify-email`, 'post', {}, 'Email verified')} disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700">
                      <CheckCircle size={14} /> Verify Email
                    </button>
                  )}
                  {!user.isPhoneVerified && (
                    <button onClick={() => action(`/api/v1/admin/users/${userId}/verify-phone`, 'post', {}, 'Phone verified')} disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700">
                      <CheckCircle size={14} /> Verify Phone
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-red-50 rounded-xl p-4 space-y-2">
                <h3 className="text-sm font-semibold text-red-700">Danger Zone</h3>
                <button onClick={() => { if (confirm('Permanently delete this user? This cannot be undone.')) action(`/api/v1/admin/users/${userId}`, 'delete', undefined, 'User deleted') }} disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700">
                  <Trash2 size={14} /> Delete User Account
                </button>
              </div>
            </div>
          )}

          {tab === 'bookings' && (
            <UserBookings userId={userId} />
          )}
        </div>
      </motion.div>
    </div>
  )
}

function UserBookings({ userId }: { userId: string }) {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axiosInstance.get(`/api/v1/admin/users/${userId}/bookings`).then(res => {
      setBookings(res.data.data?.content || [])
    }).finally(() => setLoading(false))
  }, [userId])

  if (loading) return <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-brand-blue" /></div>

  return (
    <div className="space-y-2">
      {bookings.map((b: any) => (
        <div key={b.bookingRef} className="bg-gray-50 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-gray-600">{b.bookingRef}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${b.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : b.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{b.status}</span>
          </div>
          <p className="text-sm font-medium text-gray-800 mt-1">{b.hotelName}</p>
          <p className="text-xs text-gray-500">₹{b.totalAmount?.toLocaleString('en-IN')}</p>
        </div>
      ))}
      {bookings.length === 0 && <p className="text-center py-8 text-gray-400 text-sm">No bookings found.</p>}
    </div>
  )
}

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { page, size: 15 }
      if (search) params.search = search
      if (roleFilter !== 'ALL') params.role = roleFilter
      const res = await axiosInstance.get('/api/v1/admin/users', { params })
      const d = res.data.data
      setUsers(d.content || [])
      setTotalPages(d.totalPages || 0)
      setTotalElements(d.totalElements || 0)
    } finally { setLoading(false) }
  }, [page, search, roleFilter])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  return (
    <>
      <Helmet><title>Manage Users | Admin</title></Helmet>
      <div>
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users</h1>
            <p className="text-sm text-gray-500">{totalElements.toLocaleString('en-IN')} total users</p>
          </div>
          <button onClick={fetchUsers} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-5">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
                placeholder="Search by name, email, phone..." className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
            </div>
            <div className="flex gap-1">
              {['ALL','USER','HOTEL_MANAGER','ADMIN'].map(r => (
                <button key={r} onClick={() => { setRoleFilter(r); setPage(0) }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${roleFilter === r ? 'bg-brand-blue text-white border-brand-blue' : 'border-gray-200 text-gray-600 hover:border-brand-blue'}`}>
                  {r === 'ALL' ? 'All' : r.replace('_',' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['User', 'Role', 'Loyalty', 'Bookings', 'Status', 'Joined', 'Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={7} className="text-center py-16"><Loader2 size={28} className="animate-spin text-brand-blue mx-auto" /></td></tr>}
                {!loading && users.length === 0 && <tr><td colSpan={7} className="text-center py-16 text-gray-400 text-sm">No users found</td></tr>}
                {!loading && users.map((u: any) => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue font-bold text-xs flex-shrink-0">
                          {u.firstName?.[0]}{u.lastName?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{u.firstName} {u.lastName}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-600'}`}>{u.role?.replace('_',' ')}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TIER_COLORS[u.loyaltyTier] || 'bg-gray-100 text-gray-600'}`}>{u.loyaltyTier || 'BRONZE'}</span>
                      <p className="text-xs text-gray-400 mt-0.5">{u.loyaltyPoints || 0} pts</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{u.totalBookings || 0}</td>
                    <td className="px-4 py-3">
                      {u.isBanned ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">Banned</span>
                      ) : (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelectedUser(u.id)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50">Manage</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">Showing {page * 15 + 1}–{Math.min((page + 1) * 15, totalElements)} of {totalElements}</p>
              <div className="flex gap-2">
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs disabled:opacity-40 hover:bg-gray-50">Previous</button>
                <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs disabled:opacity-40 hover:bg-gray-50">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedUser && <UserDetailModal userId={selectedUser} onClose={() => { setSelectedUser(null); fetchUsers() }} />}
      </AnimatePresence>
    </>
  )
}
