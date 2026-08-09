import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Component, ErrorInfo, ReactNode } from 'react'
import Layout from '@/components/layout/Layout'
import AdminLayout from '@/components/layout/AdminLayout'
import ProtectedRoute from '@/components/common/ProtectedRoute'
import AdminRoute from '@/components/common/AdminRoute'
import ToastProvider from '@/components/common/ToastProvider'

// Global error boundary — prevents blank white screen on unhandled React errors
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error
      return (
        <div style={{ padding: 32, fontFamily: 'monospace' }}>
          <h2 style={{ color: '#dc2626' }}>Something went wrong</h2>
          <pre style={{ background: '#fef2f2', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 13 }}>
            {err.message}
            {'\n\n'}
            {err.stack}
          </pre>
          <button
            onClick={() => { this.setState({ error: null }); window.location.href = '/' }}
            style={{ marginTop: 16, padding: '8px 16px', background: '#1e3a8a', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
          >
            Go Home
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// Pages
import HomePage from '@/pages/HomePage'
import SearchPage from '@/pages/hotel/SearchPage'
import HotelDetailPage from '@/pages/hotel/HotelDetailPage'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import OAuth2CallbackPage from '@/pages/auth/OAuth2CallbackPage'
import BookingInitiatePage from '@/pages/booking/BookingInitiatePage'
import BookingPaymentPage from '@/pages/booking/BookingPaymentPage'
import BookingConfirmationPage from '@/pages/booking/BookingConfirmationPage'
import MyBookingsPage from '@/pages/user/MyBookingsPage'
import BookingDetailPage from '@/pages/user/BookingDetailPage'
import ProfilePage from '@/pages/user/ProfilePage'
import SecurityPage from '@/pages/user/SecurityPage'
import WalletPage from '@/pages/user/WalletPage'
import WishlistPage from '@/pages/user/WishlistPage'
import ReviewsPage from '@/pages/user/ReviewsPage'
import AdminDashboard from '@/pages/admin/AdminDashboard'
import AdminHotels from '@/pages/admin/AdminHotels'
import AdminBookings from '@/pages/admin/AdminBookings'
import AdminUsers from '@/pages/admin/AdminUsers'
import AdminReviews from '@/pages/admin/AdminReviews'
import AdminPromotions from '@/pages/admin/AdminPromotions'
import AdminPricingRules from '@/pages/admin/AdminPricingRules'
import AdminAuditLogs from '@/pages/admin/AdminAuditLogs'
import AdminRoomTypes from '@/pages/admin/AdminRoomTypes'
import AdminRooms from '@/pages/admin/AdminRooms'
import AdminInventory from '@/pages/admin/AdminInventory'
import AdminTaxConfig from '@/pages/admin/AdminTaxConfig'
import AdminCampaigns from '@/pages/admin/AdminCampaigns'
import NotificationsPage from '@/pages/user/NotificationsPage'
import NotFoundPage from '@/pages/NotFoundPage'

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public routes */}
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/hotels/search" element={<SearchPage />} />
          <Route path="/hotels/:city/:slug" element={<HotelDetailPage />} />
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/oauth2/callback" element={<OAuth2CallbackPage />} />

          {/* Protected user routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/booking/initiate" element={<BookingInitiatePage />} />
            <Route path="/booking/payment" element={<BookingPaymentPage />} />
            <Route path="/booking/confirmation" element={<BookingConfirmationPage />} />
            <Route path="/user/bookings" element={<MyBookingsPage />} />
            <Route path="/user/bookings/:bookingRef" element={<BookingDetailPage />} />
            <Route path="/user/profile" element={<ProfilePage />} />
            <Route path="/user/security" element={<SecurityPage />} />
            <Route path="/user/wallet" element={<WalletPage />} />
            <Route path="/user/wishlist" element={<WishlistPage />} />
            <Route path="/user/reviews" element={<ReviewsPage />} />
            <Route path="/user/notifications" element={<NotificationsPage />} />
          </Route>
        </Route>

        {/* Admin routes */}
        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/hotels" element={<AdminHotels />} />
            <Route path="/admin/bookings" element={<AdminBookings />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/reviews" element={<AdminReviews />} />
            <Route path="/admin/promotions" element={<AdminPromotions />} />
            <Route path="/admin/pricing-rules" element={<AdminPricingRules />} />
            <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
            <Route path="/admin/hotels/:hotelId/room-types" element={<AdminRoomTypes />} />
            <Route path="/admin/hotels/:hotelId/rooms" element={<AdminRooms />} />
            <Route path="/admin/hotels/:hotelId/inventory" element={<AdminInventory />} />
            <Route path="/admin/tax-config" element={<AdminTaxConfig />} />
            <Route path="/admin/campaigns" element={<AdminCampaigns />} />
          </Route>
        </Route>

        {/* Legacy redirects */}
        <Route path="/login" element={<Navigate to="/auth/login" replace />} />
        <Route path="/register" element={<Navigate to="/auth/register" replace />} />
        <Route path="/my-bookings" element={<Navigate to="/user/bookings" replace />} />
        <Route path="/my-profile" element={<Navigate to="/user/profile" replace />} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AnimatedRoutes />
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
