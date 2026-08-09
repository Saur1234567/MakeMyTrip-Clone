import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Shield, Eye, EyeOff, Laptop, Smartphone, Tablet, X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import axiosInstance from '@/lib/axios'
import { useEffect } from 'react'

const pwSchema = z.object({
  currentPassword: z.string().min(1, 'Required'),
  newPassword: z.string().min(8, 'At least 8 characters').regex(/[A-Z]/, 'Needs uppercase').regex(/[0-9]/, 'Needs a number'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] })

type PwData = z.infer<typeof pwSchema>

const DEVICE_ICONS: Record<string, any> = {
  DESKTOP: Laptop,
  MOBILE: Smartphone,
  TABLET: Tablet,
}

export default function SecurityPage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwSuccess, setPwSuccess] = useState(false)
  const [pwError, setPwError] = useState('')

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PwData>({
    resolver: zodResolver(pwSchema),
  })

  useEffect(() => {
    axiosInstance.get('/api/v1/users/sessions').then(r => {
      setSessions(r.data.data || [])
    }).finally(() => setSessionsLoading(false))
  }, [])

  const onChangePassword = async (data: PwData) => {
    setPwError('')
    setPwSuccess(false)
    try {
      await axiosInstance.post('/api/v1/users/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })
      setPwSuccess(true)
      reset()
      setTimeout(() => setPwSuccess(false), 4000)
    } catch (err: any) {
      setPwError(err?.response?.data?.message || 'Failed to change password.')
    }
  }

  const revokeSession = async (sessionId: string) => {
    await axiosInstance.delete(`/api/v1/users/sessions/${sessionId}`)
    setSessions(prev => prev.filter(s => s.id !== sessionId))
  }

  const revokeAllSessions = async () => {
    await axiosInstance.post('/api/v1/users/logout-all')
    setSessions([])
  }

  return (
    <>
      <Helmet><title>Security | MakeMyCrip</title></Helmet>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield size={22} className="text-brand-blue" /> Security
        </h1>

        {/* Change password */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="font-bold text-gray-900 mb-4">Change Password</h2>

          {pwError && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm">
              <AlertCircle size={14} /> {pwError}
            </div>
          )}
          {pwSuccess && (
            <div className="flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 rounded-xl px-4 py-3 mb-4 text-sm">
              <CheckCircle size={14} /> Password changed successfully!
            </div>
          )}

          <form onSubmit={handleSubmit(onChangePassword)} className="space-y-4">
            {([
              { field: 'currentPassword' as const, label: 'Current password', show: showCurrent, toggle: () => setShowCurrent(x => !x) },
              { field: 'newPassword' as const, label: 'New password', show: showNew, toggle: () => setShowNew(x => !x) },
              { field: 'confirmPassword' as const, label: 'Confirm new password', show: showConfirm, toggle: () => setShowConfirm(x => !x) },
            ]).map(({ field, label, show, toggle }) => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                <div className="relative">
                  <input {...register(field)} type={show ? 'text' : 'password'}
                    className={`w-full px-3 pr-10 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue ${errors[field] ? 'border-red-400' : 'border-gray-200'}`} />
                  <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {errors[field] && <p className="text-xs text-red-600 mt-1">{errors[field]?.message}</p>}
              </div>
            ))}

            <button type="submit" disabled={isSubmitting}
              className="flex items-center gap-2 bg-brand-blue hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-colors">
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
              Update Password
            </button>
          </form>
        </div>

        {/* Active sessions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Active Sessions</h2>
            {sessions.length > 1 && (
              <button onClick={revokeAllSessions} className="text-xs text-red-600 hover:underline">
                Sign out all other sessions
              </button>
            )}
          </div>

          {sessionsLoading && <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-brand-blue" /></div>}

          <div className="space-y-3">
            {sessions.map(session => {
                const Icon = DEVICE_ICONS[session.deviceType] || Laptop
                return (
                  <div key={session.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center">
                        <Icon size={18} className="text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {session.deviceName || session.deviceType}
                          {session.current && (
                            <span className="ml-2 text-xs text-green-600 font-normal">● This device</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400">
                          {session.city && `${session.city}, `}{session.country} · Last active {session.lastActive && format(new Date(session.lastActive), 'd MMM')}
                        </p>
                      </div>
                    </div>
                    {!session.current && (
                      <button onClick={() => revokeSession(session.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                        <X size={15} className="text-red-500" />
                      </button>
                    )}
                  </div>
                )
              })}
            {!sessionsLoading && sessions.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No active sessions</p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
