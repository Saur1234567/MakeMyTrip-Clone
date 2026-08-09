import { Navigate, Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '@/store'

export default function AdminRoute() {
  const { isAuthenticated, user } = useSelector((s: RootState) => s.auth)

  // In development, allow access without auth for testing
  if (import.meta.env.DEV) return <Outlet />

  if (!isAuthenticated) return <Navigate to="/auth/login" replace />

  // Support both single role (legacy) and roles array (multi-role)
  const userRoles: string[] = user?.roles?.length
    ? user.roles
    : user?.role ? [user.role] : []

  const hasAdminAccess = userRoles.some(r => r === 'ADMIN' || r === 'HOTEL_MANAGER')
  if (!hasAdminAccess) return <Navigate to="/" replace />

  return <Outlet />
}
