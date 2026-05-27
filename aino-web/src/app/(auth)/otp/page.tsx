'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { signInWithPhoneNumber, RecaptchaVerifier, ConfirmationResult } from 'firebase/auth'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import { ShieldCheck, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

declare global {
  interface Window {
    confirmationResult?: ConfirmationResult
    recaptchaVerifier?: RecaptchaVerifier
    registerData?: { name: string; email?: string; role: string }
  }
}

export default function OtpPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [countdown, setCountdown] = useState(30)
  const [canResend, setCanResend] = useState(false)
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const [phone, setPhone] = useState('')

  useEffect(() => {
    const storedPhone = sessionStorage.getItem('otp_phone')
    if (!storedPhone) {
      router.push('/login')
      return
    }
    setPhone(storedPhone)
    // Load register data
    const rd = sessionStorage.getItem('register_data')
    if (rd) window.registerData = JSON.parse(rd)
  }, [router])

  useEffect(() => {
    if (countdown === 0) {
      setCanResend(true)
      return
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  function handleChange(index: number, value: string) {
    if (!/^\d?$/.test(value)) return
    const next = [...otp]
    next[index] = value
    setOtp(next)
    if (value && index < 5) {
      inputs.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length === 6) {
      setOtp(text.split(''))
      inputs.current[5]?.focus()
    }
  }

  async function handleVerify() {
    const code = otp.join('')
    if (code.length !== 6) {
      toast.error('Enter the complete 6-digit OTP')
      return
    }

    if (!window.confirmationResult) {
      toast.error('Session expired. Please request OTP again.')
      return
    }

    setLoading(true)
    try {
      const result = await window.confirmationResult.confirm(code)
      const firebaseIdToken = await result.user.getIdToken()

      const flow = sessionStorage.getItem('otp_flow')
      const registerData = window.registerData

      const body: Record<string, string> = { firebaseIdToken }
      if (flow === 'register' && registerData) {
        if (registerData.name) body.name = registerData.name
        if (registerData.email) body.email = registerData.email
        if (registerData.role) body.role = registerData.role
      }

      const endpoint = flow === 'register' ? '/auth/firebase-verify' : '/auth/firebase-verify'
      const res = await api.post(endpoint, body)
      const { user, accessToken, refreshToken } = res.data

      setAuth(user, accessToken, refreshToken)
      sessionStorage.removeItem('otp_phone')
      sessionStorage.removeItem('otp_flow')
      sessionStorage.removeItem('register_data')

      toast.success(`Welcome, ${user.name}!`)

      if (user.status === 'pending') {
        router.push('/pending')
        return
      }

      switch (user.role) {
        case 'admin':
          router.push('/dashboard')
          break
        case 'agent':
          router.push('/agent/dashboard')
          break
        case 'owner':
          router.push('/owner/dashboard')
          break
        default:
          router.push('/pending')
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : ''
      if (msg.includes('invalid-verification-code')) {
        toast.error('Invalid OTP. Please try again.')
      } else {
        toast.error('Verification failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (!phone) return
    setResendLoading(true)
    try {
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-resend', {
          size: 'invisible',
          callback: () => {},
        })
      }
      const confirmation = await signInWithPhoneNumber(auth, `+91${phone}`, window.recaptchaVerifier)
      window.confirmationResult = confirmation
      setOtp(['', '', '', '', '', ''])
      setCountdown(30)
      setCanResend(false)
      toast.success('OTP resent successfully')
      inputs.current[0]?.focus()
    } catch {
      toast.error('Failed to resend OTP. Try again.')
      window.recaptchaVerifier = undefined
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3c6e] via-[#2a5298] to-[#1e3c6e] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-[#1e3c6e] px-8 py-8 text-center">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="text-[#1e3c6e]" size={28} />
            </div>
            <h1 className="text-2xl font-bold text-white">Verify OTP</h1>
            <p className="text-white/60 text-sm mt-1">
              Sent to +91 {phone}
            </p>
          </div>

          <div className="px-8 py-8">
            <p className="text-slate-600 text-sm text-center mb-6">
              Enter the 6-digit code sent to your phone
            </p>

            {/* OTP inputs */}
            <div className="flex gap-2 justify-center mb-6">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputs.current[index] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className="w-11 h-12 text-center text-xl font-bold border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#1e3c6e] focus:ring-2 focus:ring-[#1e3c6e]/20 transition-all"
                />
              ))}
            </div>

            <Button
              onClick={handleVerify}
              loading={loading}
              className="w-full"
              size="lg"
            >
              Verify & Continue
            </Button>

            <div id="recaptcha-resend" />

            <div className="mt-4 text-center">
              {canResend ? (
                <button
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="text-sm text-[#1e3c6e] font-semibold hover:underline disabled:opacity-50"
                >
                  {resendLoading ? 'Resending...' : 'Resend OTP'}
                </button>
              ) : (
                <p className="text-sm text-slate-400">
                  Resend OTP in <span className="font-medium text-slate-600">{countdown}s</span>
                </p>
              )}
            </div>

            <div className="mt-4 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600"
              >
                <ArrowLeft size={14} /> Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
