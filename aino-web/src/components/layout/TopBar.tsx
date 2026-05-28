'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Menu, Bell, ChevronDown, LogOut, User, Settings } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useQuery } from '@tanstack/react-query'
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

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['notifications-unread'],
    queryFn: async () => {
      const r = await api.get('/notifications/unread-count')
      return r.data as { count: number }
    },
    enabled: !!user,
    refetchInterval: 30_000,
    staleTime: 10_000,
  })
  const unreadCount = unreadData?.count ?? 0

  let notifHref = '/notifications'
  if (user?.role === 'agent') notifHref = '/agent/notifications'
  else if (user?.role === 'owner') notifHref = '/owner/notifications'

  let settingsHref = '/settings'
  if (user?.role === 'agent') settingsHref = '/agent/settings'
  else if (user?.role === 'owner') settingsHref = '/owner/settings'

  async function handleLogout() {
    try { await api.post('/auth/logout') } catch {}
    logout()
    router.push('/login')
    toast.success('Logged out successfully')
  }

  return (
    <>
      <header style={{ height: 60, background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={onMenuClick}
            className="lg:hidden"
            style={{ padding: 6, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', display: 'flex' }}
          >
            <Menu size={20} />
          </button>
          <h1 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>{title}</h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {/* Notifications */}
          <Link
            href={notifHref}
            style={{ position: 'relative', padding: 8, borderRadius: 8, color: '#64748b', display: 'flex', textDecoration: 'none' }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: 5, right: 5, minWidth: 16, height: 16, background: '#dc2626', color: 'white', borderRadius: 8, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', lineHeight: 1, border: '1.5px solid white' }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>

          {/* User dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px 6px 6px', borderRadius: 12, border: 'none', background: 'transparent', cursor: 'pointer' }}
            >
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
              </div>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>{user?.name}</p>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, textTransform: 'capitalize' }}>{user?.role}</p>
              </div>
              <ChevronDown size={13} style={{ color: '#94a3b8' }} />
            </button>

            {dropdownOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close menu"
                  style={{ position: 'fixed', inset: 0, zIndex: 10, background: 'transparent', border: 'none', padding: 0, cursor: 'default' }}
                  onClick={() => setDropdownOpen(false)}
                />
                <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 8, width: 192, background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 20, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 16px', borderBottom: '1px solid #f1f5f9' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', margin: 0 }}>{user?.name}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, textTransform: 'capitalize' }}>{user?.role}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setDropdownOpen(false); router.push(settingsHref) }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', fontSize: 13, color: '#374151', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <User size={14} /> Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDropdownOpen(false); router.push(settingsHref) }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', fontSize: 13, color: '#374151', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <Settings size={14} /> Settings
                  </button>
                  <div style={{ borderTop: '1px solid #f1f5f9', marginTop: 2, paddingTop: 2 }}>
                    <button
                      type="button"
                      onClick={() => { setDropdownOpen(false); handleLogout() }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', fontSize: 13, color: '#dc2626', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
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

      <style>{`
        .topbar-hover:hover { background: #f1f5f9 !important; }
        .topbar-menu-hover:hover { background: #f8fafc !important; }
        .topbar-menu-danger:hover { background: #fef2f2 !important; }
      `}</style>
    </>
  )
}
