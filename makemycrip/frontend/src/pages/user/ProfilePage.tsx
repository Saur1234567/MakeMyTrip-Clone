import { useState, useRef } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { User, Mail, Phone, Calendar, Camera, Save, AlertCircle, CheckCircle, Shield, Gift, Loader2 } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { RootState } from '@/store'
import { updateUser, normalizeUser } from '@/store/slices/authSlice'
import axiosInstance from '@/lib/axios'

const schema = z.object({
  firstName: z.string().min(2, 'Min 2 characters'),
  lastName: z.string().min(1, 'Required'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter valid mobile').optional().or(z.literal('')),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
})

type FormData = z.infer<typeof schema>

const LOYALTY_TIERS: Record<string, { color: string; bg: string; label: string; next: number; current: string }> = {
  BRONZE: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', label: 'Bronze Member', next: 1000, current: '#CD7F32' },
  SILVER: { color: 'text-gray-500', bg: 'bg-gray-50 border-gray-300', label: 'Silver Member', next: 5000, current: '#C0C0C0' },
  GOLD: { color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200', label: 'Gold Member', next: 10000, current: '#FFD700' },
  PLATINUM: { color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', label: 'Platinum Member', next: 0, current: '#E5E4E2' },
}

export default function ProfilePage() {
  const dispatch = useDispatch()
  const user = useSelector((s: RootState) => s.auth.user)
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData, unknown>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone?.replace('+91', '') || '',
      dateOfBirth: user?.dateOfBirth || '',
      gender: (user?.gender as FormData['gender']) || undefined,
    },
  })

  const onSubmit = async (data: FormData) => {
    setServerError('')
    setSuccess(false)
    try {
      const payload: Record<string, unknown> = {
        firstName: data.firstName,
        lastName: data.lastName,
      }
      if (data.phone) payload.phone = `+91${data.phone}`
      if (data.dateOfBirth) payload.dateOfBirth = data.dateOfBirth
      if (data.gender) payload.gender = data.gender

      const res = await axiosInstance.put('/api/v1/users/profile', payload)
      dispatch(updateUser(normalizeUser(res.data.data)))
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      const msg = err?.response?.data?.message
        || err?.response?.data?.errors?.[0]?.message
        || 'Failed to update profile.'
      setServerError(msg)
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type and size (max 2MB)
    if (!file.type.startsWith('image/')) {
      setAvatarError('Please select an image file.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Image must be smaller than 2MB.')
      return
    }

    setAvatarError('')
    setAvatarUploading(true)

    try {
      // Convert to base64 data URL
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const res = await axiosInstance.post('/api/v1/users/profile/picture', { imageDataUrl: dataUrl })
      dispatch(updateUser(res.data.data))
    } catch (err: any) {
      setAvatarError(err?.response?.data?.message || 'Failed to upload picture.')
    } finally {
      setAvatarUploading(false)
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const tier = user?.loyaltyTier || 'BRONZE'
  const tierInfo = LOYALTY_TIERS[tier]
  const points = user?.loyaltyPoints || 0
  const progress = tierInfo.next > 0 ? Math.min((points / tierInfo.next) * 100, 100) : 100

  const avatarInitial = user?.firstName?.charAt(0).toUpperCase() || '?'

  return (
    <>
      <Helmet>
        <title>Profile | MakeMyCrip</title>
      </Helmet>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

        {/* Loyalty card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl p-5 border mb-6 ${tierInfo.bg}`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: tierInfo.current }}>
                <Gift size={18} className="text-white" />
              </div>
              <div>
                <p className={`font-bold ${tierInfo.color}`}>{tierInfo.label}</p>
                <p className="text-xs text-gray-500">{points.toLocaleString('en-IN')} loyalty points</p>
              </div>
            </div>
            <Shield size={20} className={tierInfo.color} />
          </div>
          {tierInfo.next > 0 && (
            <>
              <div className="h-2 bg-white/50 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: tierInfo.current }} />
              </div>
              <p className="text-xs text-gray-500 mt-1.5">
                {(tierInfo.next - points).toLocaleString('en-IN')} more points to next tier
              </p>
            </>
          )}
        </motion.div>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />

            {/* Avatar display */}
            {user?.profilePictureUrl ? (
              <img
                src={user.profilePictureUrl}
                alt={user.firstName}
                className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-brand-blue text-white flex items-center justify-center text-2xl font-black">
                {avatarInitial}
              </div>
            )}

            {/* Camera button */}
            <button
              type="button"
              onClick={handleAvatarClick}
              disabled={avatarUploading}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 disabled:opacity-60 transition-colors"
              title="Change profile picture"
            >
              {avatarUploading
                ? <Loader2 size={13} className="text-gray-600 animate-spin" />
                : <Camera size={13} className="text-gray-600" />
              }
            </button>
          </div>

          <div>
            <p className="font-bold text-gray-900">{user?.firstName} {user?.lastName}</p>
            <p className="text-sm text-gray-500 flex items-center gap-1"><Mail size={13} /> {user?.email}</p>
            {user?.isEmailVerified && (
              <p className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                <CheckCircle size={11} /> Email verified
              </p>
            )}
            {avatarError && (
              <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                <AlertCircle size={11} /> {avatarError}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">Click the camera icon to change your photo (max 2MB)</p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="font-bold text-gray-900 mb-4">Personal Information</h2>

          {serverError && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm">
              <AlertCircle size={15} /> {serverError}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 rounded-xl px-4 py-3 mb-4 text-sm">
              <CheckCircle size={15} /> Profile updated successfully!
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">First name</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input {...register('firstName')}
                    className={`w-full pl-9 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue ${errors.firstName ? 'border-red-400' : 'border-gray-200'}`} />
                </div>
                {errors.firstName && <p className="text-xs text-red-600 mt-1">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Last name</label>
                <input {...register('lastName')}
                  className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue ${errors.lastName ? 'border-red-400' : 'border-gray-200'}`} />
                {errors.lastName && <p className="text-xs text-red-600 mt-1">{errors.lastName.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Mobile number</label>
              <div className="flex">
                <span className="flex items-center gap-1 px-3 py-2.5 bg-gray-100 border border-r-0 border-gray-200 rounded-l-xl text-sm text-gray-600">
                  <Phone size={13} /> +91
                </span>
                <input {...register('phone')} type="tel" maxLength={10}
                  className={`flex-1 px-3 py-2.5 border rounded-r-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue ${errors.phone ? 'border-red-400' : 'border-gray-200'}`} />
              </div>
              {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of birth</label>
                <div className="relative">
                  <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input {...register('dateOfBirth')} type="date"
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Gender</label>
                <select {...register('gender')}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue bg-white">
                  <option value="">Select</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                  <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                </select>
              </div>
            </div>

            <button type="submit" disabled={isSubmitting}
              className="flex items-center justify-center gap-2 bg-brand-blue hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-2.5 px-6 rounded-xl transition-colors text-sm">
              {isSubmitting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
              Save Changes
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
