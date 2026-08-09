import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useForgotPasswordMutation, useResetPasswordMutation } from '@/store/api/authApi'

const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
})

const resetSchema = z.object({
  otp: z.string().length(6, '6-digit code required').regex(/^\d+$/, 'Numeric only'),
  newPassword: z.string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Needs uppercase')
    .regex(/[0-9]/, 'Needs a number'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type EmailData = z.infer<typeof emailSchema>
type ResetData = z.infer<typeof resetSchema>

export default function ForgotPasswordPage() {
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState<'email' | 'reset' | 'done'>('email')
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [serverError, setServerError] = useState('')

  const [forgotPassword, { isLoading: sending }] = useForgotPasswordMutation()
  const [resetPassword, { isLoading: resetting }] = useResetPasswordMutation()

  const emailForm = useForm<EmailData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email },
  })

  const resetForm = useForm<ResetData>({
    resolver: zodResolver(resetSchema),
  })

  const onEmailSubmit = async (data: EmailData) => {
    setServerError('')
    try {
      await forgotPassword({ email: data.email }).unwrap()
      setEmail(data.email)
      setStep('reset')
    } catch (err: any) {
      setServerError(err?.data?.message || 'Could not send reset email. Please try again.')
    }
  }

  const onResetSubmit = async (data: ResetData) => {
    setServerError('')
    try {
      await resetPassword({ email, otp: data.otp, newPassword: data.newPassword }).unwrap()
      setStep('done')
    } catch (err: any) {
      setServerError(err?.data?.message || 'Invalid or expired code. Please try again.')
    }
  }

  return (
    <>
      <Helmet>
        <title>Reset Password | MakeMyCrip</title>
      </Helmet>

      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-md p-8"
        >
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-1 text-2xl font-black">
              <span className="text-brand-blue">Make</span>
              <span className="text-brand-red">My</span>
              <span className="text-brand-blue">Crip</span>
            </Link>
          </div>

          <AnimatePresence mode="wait">
            {/* ─── Step 1: Enter email ─── */}
            {step === 'email' && (
              <motion.div key="email" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lock size={28} className="text-brand-blue" />
                  </div>
                  <h1 className="text-xl font-bold text-gray-900 mb-1">Forgot your password?</h1>
                  <p className="text-sm text-gray-500">
                    Enter your email and we'll send you a reset code.
                  </p>
                </div>

                {serverError && (
                  <div className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm">
                    <AlertCircle size={16} /> {serverError}
                  </div>
                )}

                <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        {...emailForm.register('email')}
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue ${emailForm.formState.errors.email ? 'border-red-400' : 'border-gray-200'}`}
                      />
                    </div>
                    {emailForm.formState.errors.email && (
                      <p className="text-xs text-red-600 mt-1">{emailForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full flex items-center justify-center gap-2 bg-brand-blue hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-3 rounded-xl transition-colors"
                  >
                    {sending ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <> Send Reset Code <ArrowRight size={16} /> </>
                    )}
                  </button>
                </form>

                <div className="text-center mt-4">
                  <Link to="/auth/login" className="text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1">
                    <ArrowLeft size={14} /> Back to login
                  </Link>
                </div>
              </motion.div>
            )}

            {/* ─── Step 2: Enter OTP + new password ─── */}
            {step === 'reset' && (
              <motion.div key="reset" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail size={28} className="text-brand-blue" />
                  </div>
                  <h1 className="text-xl font-bold text-gray-900 mb-1">Check your email</h1>
                  <p className="text-sm text-gray-500">
                    Enter the 6-digit code sent to <strong className="text-gray-700">{email}</strong> and your new password.
                  </p>
                </div>

                {serverError && (
                  <div className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm">
                    <AlertCircle size={16} /> {serverError}
                  </div>
                )}

                <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Reset code</label>
                    <input
                      {...resetForm.register('otp')}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="123456"
                      className={`w-full text-center tracking-[0.5em] text-xl font-bold px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue ${resetForm.formState.errors.otp ? 'border-red-400' : 'border-gray-200'}`}
                    />
                    {resetForm.formState.errors.otp && (
                      <p className="text-xs text-red-600 mt-1">{resetForm.formState.errors.otp.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">New password</label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        {...resetForm.register('newPassword')}
                        type={showPw ? 'text' : 'password'}
                        placeholder="New password"
                        className={`w-full pl-9 pr-10 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue ${resetForm.formState.errors.newPassword ? 'border-red-400' : 'border-gray-200'}`}
                      />
                      <button type="button" onClick={() => setShowPw(x => !x)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {resetForm.formState.errors.newPassword && (
                      <p className="text-xs text-red-600 mt-1">{resetForm.formState.errors.newPassword.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm new password</label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        {...resetForm.register('confirmPassword')}
                        type={showConfirm ? 'text' : 'password'}
                        placeholder="Repeat new password"
                        className={`w-full pl-9 pr-10 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue ${resetForm.formState.errors.confirmPassword ? 'border-red-400' : 'border-gray-200'}`}
                      />
                      <button type="button" onClick={() => setShowConfirm(x => !x)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {resetForm.formState.errors.confirmPassword && (
                      <p className="text-xs text-red-600 mt-1">{resetForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={resetting}
                    className="w-full flex items-center justify-center gap-2 bg-brand-blue hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-3 rounded-xl transition-colors"
                  >
                    {resetting ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <> Reset Password <ArrowRight size={16} /> </>
                    )}
                  </button>
                </form>

                <button
                  onClick={() => setStep('email')}
                  className="mt-4 w-full text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1"
                >
                  <ArrowLeft size={14} /> Use different email
                </button>
              </motion.div>
            )}

            {/* ─── Done ─── */}
            {step === 'done' && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={40} className="text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Password reset!</h2>
                <p className="text-sm text-gray-500 mb-8">Your password has been updated. You can now sign in with your new password.</p>
                <Link
                  to="/auth/login"
                  className="inline-flex items-center justify-center gap-2 w-full bg-brand-blue hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  Sign In Now <ArrowRight size={16} />
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  )
}
