import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '@/store'

export default function ProtectedRoute() {
  const { isAuthenticated } = useSelector((s: RootState) => s.auth)
  const location = useLocation()
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />
  }
  return <Outlet />
}
