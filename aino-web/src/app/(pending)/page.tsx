'use client'

export const dynamic = 'force-dynamic'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { Clock, LogOut } from 'lucide-react'
import api from '@/lib/api'
import { toast } from 'sonner'

export default function PendingPage() {
  const router = useRouter()
  const { user, logout, loadFromStorage, isLoaded } = useAuthStore()

  useEffect(() => { loadFromStorage() }, [loadFromStorage])

  useEffect(() => {
    if (!isLoaded) return
    if (!user) router.push('/login')
  }, [user, isLoaded, router])

  async function handleLogout() {
    try { await api.post('/auth/logout') } catch {}
    logout()
    router.push('/login')
    toast.success('Logged out')
  }

  if (!user) return null

  let roleLabel: string = user.role
  if (user.role === 'agent') roleLabel = 'Agent'
  else if (user.role === 'owner') roleLabel = 'Owner'

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e3c6e 0%, #2a5298 50%, #1e3c6e 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{ background: 'white', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', maxWidth: 448, width: '100%', overflow: 'hidden' }}>

        {/* Header band */}
        <div style={{ background: '#1e3c6e', padding: '32px 32px 28px', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, background: '#fef3c7', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Clock size={32} style={{ color: '#d97706' }} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'white', margin: '0 0 4px' }}>Pending Approval</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', margin: 0 }}>Your account is under review</p>
        </div>

        {/* Body */}
        <div style={{ padding: '28px 32px 32px', textAlign: 'center' }}>

          {/* User chip */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#f1f5f9', borderRadius: 999, padding: '8px 16px 8px 8px', marginBottom: 20 }}>
            <div style={{ width: 32, height: 32, background: '#1e3c6e', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
              {user.name?.charAt(0)?.toUpperCase()}
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0 }}>{user.name}</p>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{roleLabel}</p>
            </div>
          </div>

          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>Awaiting Admin Approval</h2>
          <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, margin: '0 0 24px' }}>
            Your account as a <strong style={{ color: '#0f172a' }}>{roleLabel}</strong> has been created successfully.
            An administrator will review and approve your account shortly.
            You will be notified once approved.
          </p>

          {/* What happens next */}
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '14px 16px', marginBottom: 24, textAlign: 'left' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#92400e', margin: '0 0 10px' }}>What happens next?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                'Admin reviews your profile and credentials',
                'You receive a notification upon approval',
                'Full access granted after approval',
              ].map((step) => (
                <div key={step} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#d97706', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>•</span>
                  <span style={{ fontSize: 12, color: '#92400e', lineHeight: 1.5 }}>{step}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '13px 24px', borderRadius: 12, fontSize: 14, fontWeight: 600,
              background: 'white', color: '#374151', border: '1.5px solid #e2e8f0',
              cursor: 'pointer',
            }}
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
