'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import axios from 'axios'
import api from '@/lib/api'
import { useAuthStore, type AuthUser } from '@/stores/authStore'
import { toast } from 'sonner'
import { ShieldCheck, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { getPendingDocs, clearPendingDocs } from '@/lib/pendingDocs'

declare global {
  interface Window {
    confirmationResult?: import('firebase/auth').ConfirmationResult
    registerData?: { name: string; email?: string; role: string }
  }
}

function clearSession() {
  sessionStorage.removeItem('otp_phone')
  sessionStorage.removeItem('otp_flow')
  sessionStorage.removeItem('register_data')
}

async function uploadPendingDocs(accessToken: string): Promise<number> {
  const docs = getPendingDocs()
  if (docs.length === 0) return 0
  let uploaded = 0
  for (const file of docs) {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('docType', file.name)
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/me/documents`, formData, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      uploaded++
    } catch {
      // non-fatal — continue with remaining files
    }
  }
  clearPendingDocs()
  return uploaded
}

type NavRouter = { push: (href: string) => void }
type SetAuthFn = (user: AuthUser, accessToken: string, refreshToken: string) => void

async function handleApprovalFlow(data: Record<string, unknown>, router: NavRouter) {
  if (data.accessToken) {
    toast.info('Uploading documents…')
    const uploaded = await uploadPendingDocs(data.accessToken as string)
    if (uploaded > 0) toast.success(`${uploaded} document${uploaded > 1 ? 's' : ''} uploaded`)
  }
  clearSession()
  toast.success('Registration successful! Waiting for admin approval.')
  router.push('/pending')
}

function handleLoginFlow(data: Record<string, unknown>, setAuth: SetAuthFn, router: NavRouter) {
  const rawUser = data.user as Record<string, unknown>
  const role = (rawUser.role as string).toLowerCase() as 'admin' | 'agent' | 'owner'
  const normalizedUser: AuthUser = {
    id: rawUser.id as string,
    name: rawUser.name as string,
    phone: rawUser.phone as string,
    email: rawUser.email as string | undefined,
    role,
    status: rawUser.isApproved ? ('active' as const) : ('pending' as const),
    avatar: rawUser.avatar as string | undefined,
  }
  setAuth(normalizedUser, data.accessToken as string, data.refreshToken as string)
  clearSession()
  toast.success(`Welcome, ${normalizedUser.name}!`)
  const routes: Record<string, string> = { admin: '/dashboard', agent: '/agent/dashboard', owner: '/owner/dashboard' }
  router.push(rawUser.isApproved ? (routes[role] ?? '/pending') : '/pending')
}

function buildVerifyBody(firebaseIdToken: string): Record<string, string> {
  const body: Record<string, string> = { firebaseIdToken }
  const flow = sessionStorage.getItem('otp_flow')
  const rd = globalThis.window?.registerData
  if (flow === 'register' && rd) {
    if (rd.name) body.name = rd.name
    if (rd.email) body.email = rd.email
    if (rd.role) body.role = rd.role.charAt(0).toUpperCase() + rd.role.slice(1)
  }
  return body
}

const OTP_SLOTS = ['s0', 's1', 's2', 's3', 's4', 's5'] as const

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
  const resendVerifierRef = useRef<RecaptchaVerifier | null>(null)

  useEffect(() => {
    const storedPhone = sessionStorage.getItem('otp_phone')
    if (!storedPhone) { router.push('/login'); return }
    setPhone(storedPhone)
    const rd = sessionStorage.getItem('register_data')
    if (rd) globalThis.window.registerData = JSON.parse(rd)
  }, [router])

  useEffect(() => {
    if (countdown === 0) { setCanResend(true); return }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  function handleChange(index: number, value: string) {
    if (!/^\d?$/.test(value)) return
    const next = [...otp]
    next[index] = value
    setOtp(next)
    if (value && index < 5) inputs.current[index + 1]?.focus()
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) inputs.current[index - 1]?.focus()
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length === 6) { setOtp(text.split('')); inputs.current[5]?.focus() }
  }

  async function handleVerify() {
    const code = otp.join('')
    if (code.length !== 6) { toast.error('Enter the complete 6-digit OTP'); return }
    if (!globalThis.window?.confirmationResult) {
      toast.error('Session expired. Please go back and request a new OTP.')
      return
    }
    setLoading(true)
    try {
      const result = await globalThis.window.confirmationResult.confirm(code)
      const firebaseIdToken = await result.user.getIdToken()
      const res = await api.post('/auth/firebase-verify', buildVerifyBody(firebaseIdToken))
      const data = res.data as Record<string, unknown>
      if (data.requiresRegistration) {
        toast.info('Phone not registered. Please create an account.')
        router.push('/register')
        return
      }
      if (data.requiresApproval) {
        await handleApprovalFlow(data, router)
        return
      }
      handleLoginFlow(data, setAuth, router)
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? ''
      toast.error(msg.includes('invalid-verification-code') ? 'Invalid OTP. Please try again.' : 'Verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function getResendVerifier(): Promise<RecaptchaVerifier> {
    if (resendVerifierRef.current) return resendVerifierRef.current
    const container = document.getElementById('recaptcha-resend')
    if (container) container.innerHTML = ''
    const verifier = new RecaptchaVerifier(auth, 'recaptcha-resend', { size: 'invisible' })
    await verifier.render()
    resendVerifierRef.current = verifier
    return verifier
  }

  async function handleResend() {
    if (!phone) return
    setResendLoading(true)
    try {
      const verifier = await getResendVerifier()
      const confirmation = await signInWithPhoneNumber(auth, `+91${phone}`, verifier)
      ;(globalThis as any).confirmationResult = confirmation
      setOtp(['', '', '', '', '', ''])
      setCountdown(30)
      setCanResend(false)
      toast.success('OTP resent successfully')
      inputs.current[0]?.focus()
    } catch {
      toast.error('Failed to resend OTP. Try again.')
      resendVerifierRef.current?.clear()
      resendVerifierRef.current = null
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* ── Left brand panel ── */}
      <div
        style={{
          flex: '0 0 45%',
          background: 'linear-gradient(160deg, #1e3c6e 0%, #0f2040 100%)',
          padding: '48px 56px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 32,
        }}
        className="auth-left-panel"
      >
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 72, height: 72, background: 'white', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/aino-logo.png" alt="AINO" style={{ width: 64, height: 64, objectFit: 'contain' }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'white', fontWeight: 800, fontSize: 28, letterSpacing: -1 }}>AINO</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, letterSpacing: 1, marginTop: 4 }}>REAL ESTATE PLATFORM</div>
          </div>
        </div>

        {/* Shield icon with text */}
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <div style={{ width: 64, height: 64, background: 'rgba(255,255,255,0.1)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <ShieldCheck size={32} color="rgba(255,255,255,0.9)" />
          </div>
          <h2 style={{ color: 'white', fontSize: 26, fontWeight: 800, lineHeight: 1.3, marginBottom: 12, letterSpacing: -0.5 }}>
            Secure Verification
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 1.7 }}>
            We use one-time passwords to keep your account safe. Each code expires in 10 minutes.
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 32 }}>
          {[['500+', 'Projects'], ['12K+', 'Plots Sold'], ['3K+', 'Agents']].map(([val, label]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ color: 'white', fontSize: 22, fontWeight: 800 }}>{val}</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', background: '#f8fafc' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          {/* Mobile logo */}
          <div className="auth-mobile-logo" style={{ alignItems: 'center', gap: 10, marginBottom: 32 }}>
            <div style={{ width: 40, height: 40, background: 'white', borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/aino-logo.png" alt="AINO" style={{ width: 34, height: 34, objectFit: 'contain' }} />
            </div>
            <span style={{ color: '#1e3c6e', fontWeight: 800, fontSize: 18 }}>AINO</span>
          </div>

          <div className="auth-form-card" style={{ background: 'white', borderRadius: 20, boxShadow: '0 4px 32px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ width: 56, height: 56, background: '#eff6ff', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <ShieldCheck size={26} color="#1e3c6e" />
              </div>
              <h2 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', marginBottom: 6, letterSpacing: -0.5 }}>Verify OTP</h2>
              <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>
                Enter the 6-digit code sent to{' '}
                <span style={{ color: '#0f172a', fontWeight: 600 }}>+91 {phone}</span>
              </p>
            </div>

            {/* OTP inputs */}
            <div className="otp-container" style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 28 }}>
              {OTP_SLOTS.map((slot, index) => {
                const digit = otp[index]
                return (
                <input
                  key={slot}
                  className="otp-input"
                  ref={(el) => { inputs.current[index] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  style={{
                    width: 48,
                    height: 54,
                    textAlign: 'center',
                    fontSize: 22,
                    fontWeight: 700,
                    color: '#0f172a',
                    border: `2px solid ${digit ? '#1e3c6e' : '#e2e8f0'}`,
                    borderRadius: 12,
                    outline: 'none',
                    background: digit ? '#eff6ff' : 'white',
                    transition: 'all 0.15s',
                    fontFamily: 'inherit',
                  }}
                />
                )
              })}
            </div>

            {/* Verify button */}
            <button
              onClick={handleVerify}
              disabled={loading}
              style={{
                width: '100%',
                padding: '15px 24px',
                background: loading ? '#94a3b8' : '#1e3c6e',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'background 0.15s',
              }}
            >
              {loading && <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />}
              {loading ? 'Verifying…' : 'Verify & Continue'}
            </button>

            <div id="recaptcha-resend" />

            {/* Resend */}
            <div style={{ marginTop: 20, textAlign: 'center' }}>
              {canResend ? (
                <button
                  onClick={handleResend}
                  disabled={resendLoading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#1e3c6e',
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: resendLoading ? 'not-allowed' : 'pointer',
                    opacity: resendLoading ? 0.5 : 1,
                    fontFamily: 'inherit',
                  }}
                >
                  {resendLoading ? 'Resending…' : 'Resend OTP'}
                </button>
              ) : (
                <p style={{ fontSize: 14, color: '#94a3b8' }}>
                  Resend OTP in <span style={{ fontWeight: 600, color: '#64748b' }}>{countdown}s</span>
                </p>
              )}
            </div>

            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <Link
                href="/login"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#94a3b8', textDecoration: 'none' }}
              >
                <ArrowLeft size={14} /> Back to Login
              </Link>
            </div>
          </div>

          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, marginTop: 24 }}>
            © 2025 AINO. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
