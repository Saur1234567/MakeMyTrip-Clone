import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, User, Phone, AlertCircle, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react'
import { useDispatch } from 'react-redux'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRegisterMutation, useVerifyEmailMutation } from '@/store/api/authApi'
import { setCredentials, normalizeUser } from '@/store/slices/authSlice'

// ─── Schemas ─────────────────────────────────────────────────────────────────

const step1Schema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

const step2Schema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must be numeric'),
})

const step3Schema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number').optional().or(z.literal('')),
})

type Step1Data = z.infer<typeof step1Schema>
type Step2Data = z.infer<typeof step2Schema>
type Step3Data = z.infer<typeof step3Schema>

// ─── Password Strength ────────────────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'At least 8 characters', pass: password.length >= 8 },
    { label: 'Uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'Number', pass: /[0-9]/.test(password) },
    { label: 'Special character', pass: /[^a-zA-Z0-9]/.test(password) },
  ]
  const score = checks.filter(c => c.pass).length

  if (!password) return null

  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${
            i <= score
              ? score <= 1 ? 'bg-red-500' : score <= 2 ? 'bg-orange-400' : score <= 3 ? 'bg-yellow-400' : 'bg-green-500'
              : 'bg-gray-200'
          }`} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1">
        {checks.map(({ label, pass }) => (
          <span key={label} className={`text-xs flex items-center gap-1 ${pass ? 'text-green-600' : 'text-gray-400'}`}>
            <CheckCircle size={10} className={pass ? 'fill-green-600 text-white' : ''} /> {label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── OTP Input ───────────────────────────────────────────────────────────────

function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '')

  const handleChange = (idx: number, val: string) => {
    if (!/^\d?$/.test(val)) return
    const next = digits.map((d, i) => (i === idx ? val : d)).join('')
    onChange(next)
    if (val && idx < 5) {
      const nextInput = document.getElementById(`otp-${idx + 1}`) as HTMLInputElement
      nextInput?.focus()
    }
  }

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      const prev = document.getElementById(`otp-${idx - 1}`) as HTMLInputElement
      prev?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    onChange(pasted.padEnd(6, '').slice(0, 6))
  }

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          id={`otp-${i}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          className="w-11 h-12 text-center text-xl font-bold border-2 rounded-xl focus:outline-none focus:border-brand-blue transition-colors"
          style={{ borderColor: d ? '#1e3a8a' : undefined }}
        />
      ))}
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [serverError, setServerError] = useState('')
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [resendTimer, setResendTimer] = useState(0)

  const [register, { isLoading: registering }] = useRegisterMutation()
  const [verifyEmail, { isLoading: verifying }] = useVerifyEmailMutation()

  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
  })
  const step3Form = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
  })

  const password = step1Form.watch('password', '')

  // Step 1: register
  const onStep1Submit = async (data: Step1Data) => {
    setServerError('')
    try {
      await register({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
      }).unwrap()
      setRegisteredEmail(data.email)
      setStep(2)
      startResendTimer()
    } catch (err: any) {
      setServerError(err?.data?.message || 'Registration failed. Please try again.')
    }
  }

  // Step 2: verify OTP
  const onVerifyOtp = async () => {
    setOtpError('')
    if (otp.length < 6) { setOtpError('Please enter the 6-digit code'); return }
    try {
      const res = await verifyEmail({ email: registeredEmail, otp }).unwrap()
      dispatch(setCredentials({
        user: normalizeUser(res.data.user),
        accessToken: res.data.accessToken,
        refreshToken: res.data.refreshToken,
      }))
      setStep(3)
    } catch (err: any) {
      setOtpError(err?.data?.message || 'Invalid or expired OTP. Please try again.')
    }
  }

  // Step 3: phone (optional) — skip or save
  const onStep3Submit = async (_data: Step3Data) => {
    navigate('/')
  }

  const startResendTimer = () => {
    setResendTimer(60)
    const interval = setInterval(() => {
      setResendTimer(t => {
        if (t <= 1) { clearInterval(interval); return 0 }
        return t - 1
      })
    }, 1000)
  }

  const handleResend = async () => {
    if (resendTimer > 0) return
    try {
      await register({
        firstName: step1Form.getValues('firstName'),
        lastName: step1Form.getValues('lastName'),
        email: registeredEmail,
        password: step1Form.getValues('password'),
      }).unwrap()
      startResendTimer()
    } catch {
      startResendTimer()
    }
  }

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/oauth2/authorization/google`
  }

  const STEP_LABELS = ['Create Account', 'Verify Email', 'Add Phone']

  return (
    <>
      <Helmet>
        <title>Create Account | MakeMyCrip</title>
      </Helmet>

      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-md p-8"
        >
          {/* Logo */}
          <div className="text-center mb-6">
            <Link to="/" className="inline-flex items-center gap-1 text-2xl font-black">
              <span className="text-brand-blue">Make</span>
              <span className="text-brand-red">My</span>
              <span className="text-brand-blue">Crip</span>
            </Link>
          </div>

          {/* Steps indicator */}
          <div className="flex items-center mb-8">
            {STEP_LABELS.map((label, i) => {
              const stepNum = i + 1
              const active = stepNum === step
              const done = stepNum < step
              return (
                <div key={label} className={`flex items-center ${i < STEP_LABELS.length - 1 ? 'flex-1' : ''}`}>
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      done ? 'bg-green-500 text-white' : active ? 'bg-brand-blue text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {done ? <CheckCircle size={14} /> : stepNum}
                    </div>
                    <span className={`text-xs mt-1 ${active ? 'text-brand-blue font-medium' : 'text-gray-400'}`}>{label}</span>
                  </div>
                  {i < STEP_LABELS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 mb-4 ${done ? 'bg-green-500' : 'bg-gray-200'}`} />
                  )}
                </div>
              )
            })}
          </div>

          <AnimatePresence mode="wait">
            {/* ─── Step 1: Name/Email/Password ─── */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Create your account</h2>
                <p className="text-sm text-gray-500 mb-6">Join millions of happy travelers</p>

                <button
                  onClick={handleGoogleLogin}
                  type="button"
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 mb-4"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign up with Google
                </button>

                <div className="relative mb-4">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                  <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400">or sign up with email</span></div>
                </div>

                {serverError && (
                  <div className="flex items-start gap-2 bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" /> {serverError}
                  </div>
                )}

                <form onSubmit={step1Form.handleSubmit(onStep1Submit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">First name</label>
                      <div className="relative">
                        <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          {...step1Form.register('firstName')}
                          placeholder="John"
                          className={`w-full pl-9 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue ${step1Form.formState.errors.firstName ? 'border-red-400' : 'border-gray-200'}`}
                        />
                      </div>
                      {step1Form.formState.errors.firstName && (
                        <p className="text-xs text-red-600 mt-1">{step1Form.formState.errors.firstName.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Last name</label>
                      <input
                        {...step1Form.register('lastName')}
                        placeholder="Doe"
                        className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue ${step1Form.formState.errors.lastName ? 'border-red-400' : 'border-gray-200'}`}
                      />
                      {step1Form.formState.errors.lastName && (
                        <p className="text-xs text-red-600 mt-1">{step1Form.formState.errors.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        {...step1Form.register('email')}
                        type="email"
                        placeholder="you@example.com"
                        className={`w-full pl-9 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue ${step1Form.formState.errors.email ? 'border-red-400' : 'border-gray-200'}`}
                      />
                    </div>
                    {step1Form.formState.errors.email && (
                      <p className="text-xs text-red-600 mt-1">{step1Form.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        {...step1Form.register('password')}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create a strong password"
                        className={`w-full pl-9 pr-10 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue ${step1Form.formState.errors.password ? 'border-red-400' : 'border-gray-200'}`}
                      />
                      <button type="button" onClick={() => setShowPassword(x => !x)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    <PasswordStrength password={password} />
                    {step1Form.formState.errors.password && (
                      <p className="text-xs text-red-600 mt-1">{step1Form.formState.errors.password.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        {...step1Form.register('confirmPassword')}
                        type={showConfirm ? 'text' : 'password'}
                        placeholder="Repeat your password"
                        className={`w-full pl-9 pr-10 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue ${step1Form.formState.errors.confirmPassword ? 'border-red-400' : 'border-gray-200'}`}
                      />
                      <button type="button" onClick={() => setShowConfirm(x => !x)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {step1Form.formState.errors.confirmPassword && (
                      <p className="text-xs text-red-600 mt-1">{step1Form.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <p className="text-xs text-gray-500">
                    By signing up, you agree to our{' '}
                    <Link to="/terms" className="text-brand-blue hover:underline">Terms</Link> and{' '}
                    <Link to="/privacy" className="text-brand-blue hover:underline">Privacy Policy</Link>.
                  </p>

                  <button
                    type="submit"
                    disabled={registering}
                    className="w-full flex items-center justify-center gap-2 bg-brand-blue hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-3 rounded-xl transition-colors"
                  >
                    {registering ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <> Create Account <ArrowRight size={16} /> </>
                    )}
                  </button>
                </form>

                <p className="text-center text-sm text-gray-600 mt-4">
                  Already have an account?{' '}
                  <Link to="/auth/login" className="text-brand-blue font-semibold hover:underline">Sign in</Link>
                </p>
              </motion.div>
            )}

            {/* ─── Step 2: OTP Verification ─── */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail size={28} className="text-brand-blue" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Verify your email</h2>
                  <p className="text-sm text-gray-500">
                    We sent a 6-digit code to <strong className="text-gray-700">{registeredEmail}</strong>
                  </p>
                </div>

                {otpError && (
                  <div className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm">
                    <AlertCircle size={16} /> {otpError}
                  </div>
                )}

                <div className="mb-6">
                  <OtpInput value={otp} onChange={setOtp} />
                </div>

                <button
                  onClick={onVerifyOtp}
                  disabled={verifying || otp.length < 6}
                  className="w-full flex items-center justify-center gap-2 bg-brand-blue hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-3 rounded-xl transition-colors mb-4"
                >
                  {verifying ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <> Verify Email <ArrowRight size={16} /> </>
                  )}
                </button>

                <div className="text-center">
                  <p className="text-sm text-gray-500">
                    Didn't receive the code?{' '}
                    {resendTimer > 0 ? (
                      <span className="text-gray-400">Resend in {resendTimer}s</span>
                    ) : (
                      <button onClick={handleResend} className="text-brand-blue hover:underline font-medium">Resend</button>
                    )}
                  </p>
                </div>

                <button
                  onClick={() => setStep(1)}
                  className="mt-4 w-full flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                >
                  <ArrowLeft size={14} /> Back to registration
                </button>
              </motion.div>
            )}

            {/* ─── Step 3: Phone (optional) ─── */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={28} className="text-green-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Email verified!</h2>
                  <p className="text-sm text-gray-500">Add your phone for faster support (optional)</p>
                </div>

                <form onSubmit={step3Form.handleSubmit(onStep3Submit)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Mobile number</label>
                    <div className="relative flex">
                      <span className="flex items-center gap-1 px-3 py-2.5 bg-gray-100 border border-r-0 border-gray-200 rounded-l-xl text-sm text-gray-600">
                        <Phone size={14} /> +91
                      </span>
                      <input
                        {...step3Form.register('phone')}
                        type="tel"
                        placeholder="9876543210"
                        maxLength={10}
                        className={`flex-1 px-3 py-2.5 border rounded-r-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue ${step3Form.formState.errors.phone ? 'border-red-400' : 'border-gray-200'}`}
                      />
                    </div>
                    {step3Form.formState.errors.phone && (
                      <p className="text-xs text-red-600 mt-1">{step3Form.formState.errors.phone.message}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-brand-blue hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    Continue <ArrowRight size={16} />
                  </button>
                </form>

                <button
                  onClick={() => navigate('/')}
                  className="mt-3 w-full text-sm text-gray-400 hover:text-gray-600 py-2"
                >
                  Skip for now
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  )
}
