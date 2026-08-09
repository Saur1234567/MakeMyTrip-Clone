import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { setCredentials, normalizeUser } from '@/store/slices/authSlice'
import { CheckCircle, AlertCircle } from 'lucide-react'

/**
 * Handles the redirect from the backend after a successful Google OAuth2 login.
 * The backend redirects to:
 *   /auth/oauth2/callback?accessToken=...&refreshToken=...&userId=...&email=...&firstName=...&lastName=...&role=...&loyaltyTier=...
 *
 * This page reads those params, stores them in Redux + localStorage, then
 * redirects the user to the home page (or wherever they came from).
 */
export default function OAuth2CallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [error, setError] = useState('')

  useEffect(() => {
    const accessToken = searchParams.get('accessToken')
    const refreshToken = searchParams.get('refreshToken')
    const userId = searchParams.get('userId')
    const email = searchParams.get('email')
    const firstName = searchParams.get('firstName')
    const lastName = searchParams.get('lastName')
    const role = searchParams.get('role') || 'USER'
    const loyaltyTier = searchParams.get('loyaltyTier') || 'BRONZE'
    const errorParam = searchParams.get('error')

    if (errorParam) {
      setError(decodeURIComponent(errorParam))
      setTimeout(() => navigate('/auth/login', { replace: true }), 3000)
      return
    }

    if (!accessToken || !userId || !email) {
      setError('Invalid OAuth2 callback — missing required parameters.')
      setTimeout(() => navigate('/auth/login', { replace: true }), 3000)
      return
    }

    const user = normalizeUser({
      id: userId,
      email,
      firstName: firstName || email.split('@')[0],
      lastName: lastName || '',
      role,
      roles: [role],
      loyaltyTier,
      loyaltyPoints: 0,
      isEmailVerified: true,
    })

    dispatch(setCredentials({
      user,
      accessToken,
      refreshToken: refreshToken || undefined,
    }))

    // Redirect to home after storing credentials
    navigate('/', { replace: true })
  }, [searchParams, dispatch, navigate])

  if (error) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-8 max-w-md w-full text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Login Failed</h2>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <p className="text-xs text-gray-400">Redirecting to login page...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={36} className="text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Signing you in...</h2>
        <p className="text-sm text-gray-500">Please wait while we complete your Google login.</p>
        <div className="mt-4 flex justify-center">
          <div className="w-8 h-8 border-4 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin" />
        </div>
      </div>
    </div>
  )
}
