'use client'

export const dynamic = 'force-dynamic'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import Link from 'next/link'
import { Building2, Users, TrendingUp, Shield, ArrowRight, Loader2 } from 'lucide-react'

const features = [
  { icon: Building2, text: 'Manage all your real estate projects' },
  { icon: Users, text: 'Connect agents, owners & admin in one place' },
  { icon: TrendingUp, text: 'Track bookings, leads & commissions' },
  { icon: Shield, text: 'Secure role-based access control' },
]

export default function LoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null)

  async function getVerifier(): Promise<RecaptchaVerifier> {
    if (recaptchaRef.current) return recaptchaRef.current
    const container = document.getElementById('recaptcha-container')
    if (container) container.innerHTML = ''
    const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' })
    await verifier.render()
    recaptchaRef.current = verifier
    return verifier
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const digits = phone.replace(/\D/g, '')
    if (digits.length !== 10) {
      setError('Enter a valid 10-digit phone number')
      return
    }
    setLoading(true)
    try {
      const verifier = await getVerifier()
      const confirmation = await signInWithPhoneNumber(auth, `+91${digits}`, verifier)
      ;(globalThis as any).confirmationResult = confirmation
      sessionStorage.setItem('otp_phone', digits)
      sessionStorage.setItem('otp_flow', 'login')
      router.push('/otp')
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? ''
      const msg = (err as { message?: string })?.message ?? ''
      console.error('[phone-auth]', { code, msg, err })
      if (code === 'auth/invalid-phone-number') setError('Invalid phone number')
      else if (code === 'auth/too-many-requests') setError('Too many attempts — try again later')
      else if (code.startsWith('appCheck/')) setError('App Check not ready — register the debug token in Firebase Console')
      else {
        let fallback = 'Failed to send OTP — check browser console'
        if (code) fallback = `Failed to send OTP (${code})`
        else if (msg) fallback = `Error: ${msg.slice(0, 80)}`
        setError(fallback)
      }
      recaptchaRef.current?.clear()
      recaptchaRef.current = null
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* ── Left brand panel ── */}
      <div
        className="auth-left-panel"
        style={{
          flex: '0 0 45%',
          background: 'linear-gradient(160deg, #1e3c6e 0%, #0f2040 100%)',
          padding: '48px 56px',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, background: 'white', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/aino-logo.png" alt="AINO" style={{ width: 38, height: 38, objectFit: 'contain' }} />
          </div>
          <div>
            <div style={{ color: 'white', fontWeight: 800, fontSize: 20, letterSpacing: -0.5 }}>AINO</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: 0.5 }}>REAL ESTATE PLATFORM</div>
          </div>
        </div>

        {/* Center content */}
        <div>
          <h1 style={{ color: 'white', fontSize: 40, fontWeight: 800, lineHeight: 1.15, marginBottom: 16, letterSpacing: -1 }}>
            The Genuine<br />Property Bank
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, lineHeight: 1.7, marginBottom: 40 }}>
            India&apos;s most trusted real estate management platform for agents, owners and administrators.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {features.map(({ icon: Icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} color="rgba(255,255,255,0.8)" />
                </div>
                <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 32 }}>
          {[['500+', 'Projects'], ['12K+', 'Plots Sold'], ['3K+', 'Agents']].map(([val, label]) => (
            <div key={label}>
              <div style={{ color: 'white', fontSize: 24, fontWeight: 800 }}>{val}</div>
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
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 6, letterSpacing: -0.5 }}>Welcome back</h2>
              <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>Sign in with your registered phone number</p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label htmlFor="phone-input" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                  Phone Number
                </label>
                <div style={{ display: 'flex', border: `1.5px solid ${error ? '#ef4444' : '#e2e8f0'}`, borderRadius: 12, overflow: 'hidden', background: 'white', transition: 'border-color 0.15s' }}>
                  <div style={{ padding: '0 16px', background: '#f1f5f9', borderRight: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span style={{ fontSize: 18 }}>🇮🇳</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>+91</span>
                  </div>
                  <input
                    id="phone-input"
                    type="tel"
                    value={phone}
                    onChange={e => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setError('') }}
                    placeholder="9876543210"
                    style={{ flex: 1, padding: '14px 16px', border: 'none', outline: 'none', fontSize: 15, color: '#0f172a', background: 'transparent' }}
                  />
                </div>
                {error && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 6 }}>{error}</p>}
              </div>

              <div id="recaptcha-container" />

              <button
                type="submit"
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
                {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                {loading ? 'Sending OTP…' : 'Send OTP'}
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>

            <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: '#64748b' }}>
                New to AINO?{' '}
                <Link href="/register" style={{ color: '#1e3c6e', fontWeight: 700, textDecoration: 'none' }}>
                  Create account
                </Link>
              </p>
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
