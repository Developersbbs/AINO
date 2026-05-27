'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, Bell, ChevronDown, LogOut, User, Settings } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import api from '@/lib/api'
import { toast } from 'sonner'

interface TopBarProps {
  title: string
  onMenuClick: () => void
}

const NAVY = '#1e3c6e'

export function TopBar({ title, onMenuClick }: Readonly<TopBarProps>) {
  const { user, logout } = useAuthStore()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const router = useRouter()

  async function handleLogout() {
    try {
      await api.post('/auth/logout')
    } catch {}
    logout()
    router.push('/login')
    toast.success('Logged out successfully')
  }

  return (
    <header style={{ height: 60, background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden"
          style={{ padding: '6px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', display: 'flex' }}
        >
          <Menu size={20} />
        </button>
        <h1 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>{title}</h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {/* Notifications */}
        <button
          type="button"
          style={{ position: 'relative', padding: 8, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', display: 'flex' }}
        >
          <Bell size={18} />
          <span style={{ position: 'absolute', top: 8, right: 8, width: 7, height: 7, background: '#ef4444', borderRadius: '50%', border: '1.5px solid white' }} />
        </button>

        {/* User dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setDropdownOpen((v) => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px 6px 6px', borderRadius: 12, border: 'none', background: 'transparent', cursor: 'pointer', transition: 'background 0.15s' }}
            className="hover:bg-slate-100"
          >
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
              {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
            </div>
            <div className="hidden sm:block" style={{ textAlign: 'left' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>{user?.name}</p>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, textTransform: 'capitalize' }}>{user?.role}</p>
            </div>
            <ChevronDown size={13} style={{ color: '#94a3b8' }} className="hidden sm:block" />
          </button>

          {dropdownOpen && (
            <>
              <button
                type="button"
                aria-label="Close menu"
                className="fixed inset-0 z-10"
                style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'default' }}
                onClick={() => setDropdownOpen(false)}
              />
              <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 8, width: 192, background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 20, overflow: 'hidden' }}>
                <div style={{ padding: '10px 16px 10px', borderBottom: '1px solid #f1f5f9' }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', margin: 0 }}>{user?.name}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, textTransform: 'capitalize' }}>{user?.role}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setDropdownOpen(false); router.push('/profile') }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', fontSize: 13, color: '#374151', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  className="hover:bg-slate-50"
                >
                  <User size={14} /> Profile
                </button>
                <button
                  type="button"
                  onClick={() => { setDropdownOpen(false); router.push('/settings') }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', fontSize: 13, color: '#374151', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  className="hover:bg-slate-50"
                >
                  <Settings size={14} /> Settings
                </button>
                <div style={{ borderTop: '1px solid #f1f5f9', marginTop: 2, paddingTop: 2 }}>
                  <button
                    type="button"
                    onClick={() => { setDropdownOpen(false); handleLogout() }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', fontSize: 13, color: '#dc2626', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                    className="hover:bg-red-50"
                  >
                    <LogOut size={14} /> Logout
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
