'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { auth } from '@/lib/firebase'
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import { Building2, Users, TrendingUp, Shield, ArrowRight, Loader2, Paperclip, X, FileText } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { setPendingDocs } from '@/lib/pendingDocs'

const features = [
  { icon: Building2, text: 'Manage all your real estate projects' },
  { icon: Users, text: 'Connect agents, owners & admin in one place' },
  { icon: TrendingUp, text: 'Track bookings, leads & commissions' },
  { icon: Shield, text: 'Secure role-based access control' },
]

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z
    .string()
    .min(10, 'Enter a 10-digit number')
    .max(10, 'Enter a 10-digit number')
    .regex(/^\d+$/, 'Digits only'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  role: z.enum(['agent', 'owner'], { required_error: 'Select a role' }),
})

type FormData = z.infer<typeof schema>

declare global {
  interface Window {
    registerData?: { name: string; email?: string; role: string }
  }
}

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [docHover, setDocHover] = useState(false)
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null)
  const docInputRef = useRef<HTMLInputElement | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    setSelectedFiles((prev) => [...prev, ...files])
    e.target.value = ''
  }

  function removeFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  async function getVerifier(): Promise<RecaptchaVerifier> {
    if (recaptchaRef.current) return recaptchaRef.current
    const container = document.getElementById('recaptcha-container-register')
    if (container) container.innerHTML = ''
    const verifier = new RecaptchaVerifier(auth, 'recaptcha-container-register', { size: 'invisible' })
    await verifier.render()
    recaptchaRef.current = verifier
    return verifier
  }

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const verifier = await getVerifier()
      const confirmation = await signInWithPhoneNumber(auth, `+91${data.phone}`, verifier)
      ;(globalThis as any).confirmationResult = confirmation
      sessionStorage.setItem('otp_phone', data.phone)
      sessionStorage.setItem('otp_flow', 'register')
      globalThis.window.registerData = { name: data.name, email: data.email || undefined, role: data.role }
      sessionStorage.setItem('register_data', JSON.stringify(globalThis.window.registerData))
      setPendingDocs(selectedFiles)
      router.push('/otp')
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? ''
      const msg = (err as { message?: string })?.message ?? ''
      console.error('[phone-auth]', { code, msg, err })
      if (code === 'auth/invalid-phone-number') toast.error('Invalid phone number')
      else if (code === 'auth/too-many-requests') toast.error('Too many attempts — try again later')
      else if (code.startsWith('appCheck/')) toast.error('App Check not ready — register the debug token in Firebase Console')
      else {
        let fallback = 'Failed to send OTP — check browser console'
        if (code) fallback = `Failed to send OTP (${code})`
        else if (msg) fallback = `Error: ${msg.slice(0, 80)}`
        toast.error(fallback)
      }
      recaptchaRef.current?.clear()
      recaptchaRef.current = null
    } finally {
      setLoading(false)
    }
  }

  const fieldStyle = {
    width: '100%',
    padding: '13px 16px',
    border: '1.5px solid #e2e8f0',
    borderRadius: 12,
    fontSize: 15,
    color: '#0f172a',
    background: 'white',
    outline: 'none',
    transition: 'border-color 0.15s',
    fontFamily: 'inherit',
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* ── Left brand panel ── */}
      <div
        style={{
          flex: '0 0 45%',
          background: 'linear-gradient(160deg, #1e3c6e 0%, #0f2040 100%)',
          padding: '48px 56px',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
        className="auth-left-panel"
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
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', background: '#f8fafc', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          {/* Mobile logo */}
          <div className="auth-mobile-logo" style={{ alignItems: 'center', gap: 10, marginBottom: 32 }}>
            <div style={{ width: 40, height: 40, background: 'white', borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/aino-logo.png" alt="AINO" style={{ width: 34, height: 34, objectFit: 'contain' }} />
            </div>
            <span style={{ color: '#1e3c6e', fontWeight: 800, fontSize: 18 }}>AINO</span>
          </div>

          <div className="auth-form-card" style={{ background: 'white', borderRadius: 20, boxShadow: '0 4px 32px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 6, letterSpacing: -0.5 }}>Create account</h2>
              <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>Join AINO — it only takes a minute</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Full Name */}
              <div>
                <label htmlFor="reg-name" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 7 }}>Full Name</label>
                <input
                  id="reg-name"
                  type="text"
                  placeholder="John Doe"
                  style={{ ...fieldStyle, borderColor: errors.name ? '#ef4444' : '#e2e8f0' }}
                  {...register('name')}
                />
                {errors.name && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 5 }}>{errors.name.message}</p>}
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="reg-phone" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 7 }}>Phone Number</label>
                <div style={{ display: 'flex', border: `1.5px solid ${errors.phone ? '#ef4444' : '#e2e8f0'}`, borderRadius: 12, overflow: 'hidden', background: 'white' }}>
                  <div style={{ padding: '0 16px', background: '#f1f5f9', borderRight: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span style={{ fontSize: 18 }}>🇮🇳</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>+91</span>
                  </div>
                  <input
                    id="reg-phone"
                    type="tel"
                    placeholder="9876543210"
                    maxLength={10}
                    style={{ flex: 1, padding: '13px 16px', border: 'none', outline: 'none', fontSize: 15, color: '#0f172a', background: 'transparent', fontFamily: 'inherit' }}
                    {...register('phone')}
                  />
                </div>
                {errors.phone && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 5 }}>{errors.phone.message}</p>}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="reg-email" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 7 }}>
                  Email <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span>
                </label>
                <input
                  id="reg-email"
                  type="email"
                  placeholder="john@example.com"
                  style={{ ...fieldStyle, borderColor: errors.email ? '#ef4444' : '#e2e8f0' }}
                  {...register('email')}
                />
                {errors.email && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 5 }}>{errors.email.message}</p>}
              </div>

              {/* Role */}
              <div>
                <label htmlFor="reg-role" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 7 }}>Role</label>
                <select
                  id="reg-role"
                  style={{ ...fieldStyle, borderColor: errors.role ? '#ef4444' : '#e2e8f0', cursor: 'pointer' }}
                  {...register('role')}
                >
                  <option value="">Select your role</option>
                  <option value="agent">Agent</option>
                  <option value="owner">Owner</option>
                </select>
                {errors.role && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 5 }}>{errors.role.message}</p>}
              </div>

              {/* Documents */}
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 7 }}>
                  Documents <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span>
                </p>
                <button
                  type="button"
                  onClick={() => docInputRef.current?.click()}
                  onMouseEnter={() => setDocHover(true)}
                  onMouseLeave={() => setDocHover(false)}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    border: `2px dashed ${docHover ? '#1e3c6e' : '#e2e8f0'}`,
                    borderRadius: 12,
                    background: docHover ? '#f0f4ff' : '#f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    transition: 'all 0.15s',
                  }}
                >
                  <Paperclip size={16} color={docHover ? '#1e3c6e' : '#94a3b8'} />
                  <span style={{ fontSize: 13, color: docHover ? '#1e3c6e' : '#64748b', fontWeight: 500 }}>
                    Attach documents or images
                  </span>
                </button>
                <input
                  ref={docInputRef}
                  type="file"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleFilesChange}
                />
                {selectedFiles.length > 0 && (
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {selectedFiles.map((file, i) => (
                      <div key={`${file.name}-${file.lastModified}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: '#f1f5f9', borderRadius: 8 }}>
                        <FileText size={13} color="#64748b" style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                        <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>{(file.size / 1024).toFixed(0)} KB</span>
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', flexShrink: 0 }}
                        >
                          <X size={13} color="#94a3b8" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div id="recaptcha-container-register" />

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
                  marginTop: 4,
                }}
              >
                {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                {loading ? 'Sending OTP…' : 'Send OTP'}
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>

            <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: '#64748b' }}>
                Already have an account?{' '}
                <Link href="/login" style={{ color: '#1e3c6e', fontWeight: 700, textDecoration: 'none' }}>
                  Sign in
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
