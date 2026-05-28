'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/stores/authStore'
import {
  LayoutDashboard,
  Building2,
  Users,
  UserCheck,
  BookOpen,
  DollarSign,
  ClipboardList,
  Share2,
  TrendingUp,
  X,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

const adminNav: NavItem[] = [
  { label: 'Dashboard',   href: '/dashboard',       icon: LayoutDashboard },
  { label: 'Projects',    href: '/projects',         icon: Building2 },
  { label: 'Agents',      href: '/agents',           icon: Users },
  { label: 'Owners',      href: '/owners',           icon: UserCheck },
  { label: 'Bookings',    href: '/bookings',         icon: BookOpen },
  { label: 'Commissions', href: '/commissions',      icon: DollarSign },
  { label: 'Audit Log',   href: '/audit-log',        icon: ClipboardList },
]

const agentNav: NavItem[] = [
  { label: 'Dashboard',   href: '/agent/dashboard',  icon: LayoutDashboard },
  { label: 'Projects',    href: '/agent/projects',   icon: Building2 },
  { label: 'My Leads',    href: '/agent/leads',      icon: Share2 },
  { label: 'Bookings',    href: '/agent/bookings',   icon: BookOpen },
  { label: 'Commissions', href: '/agent/commissions',icon: DollarSign },
]

const ownerNav: NavItem[] = [
  { label: 'Dashboard',   href: '/owner/dashboard',  icon: LayoutDashboard },
  { label: 'My Projects', href: '/owner/projects',   icon: Building2 },
  { label: 'Bookings',    href: '/owner/bookings',   icon: BookOpen },
  { label: 'Reports',     href: '/owner/reports',    icon: TrendingUp },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

const NAVY = '#1e3c6e'

export function Sidebar({ open, onClose }: Readonly<SidebarProps>) {
  const { user } = useAuthStore()
  const pathname = usePathname()

  let navItems: NavItem[]
  if (user?.role === 'admin') navItems = adminNav
  else if (user?.role === 'agent') navItems = agentNav
  else navItems = ownerNav

  const isActive = (href: string) => {
    if (href === '/dashboard' || href === '/agent/dashboard' || href === '/owner/dashboard') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-30 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.45)', border: 'none', cursor: 'default', padding: 0 }}
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className="sidebar-panel"
        style={{
          width: 240,
          background: NAVY,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          left: 0,
          top: 0,
          zIndex: 40,
          height: '100%',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, background: 'white', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/aino-logo.png" alt="AINO" style={{ width: 30, height: 30, objectFit: 'contain' }} />
            </div>
            <div>
              <p style={{ color: 'white', fontWeight: 800, fontSize: 16, letterSpacing: 0.5, margin: 0 }}>AINO</p>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, margin: 0 }}>Real Estate</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden"
            style={{ padding: 6, borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* User info */}
        {user && (
          <div style={{ margin: '12px 12px 4px', padding: '12px', borderRadius: 12, background: 'rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                {user.name?.charAt(0)?.toUpperCase() ?? 'U'}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <p style={{ color: 'white', fontWeight: 600, fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: 0, textTransform: 'capitalize' }}>{user.role}</p>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {navItems.map((item) => {
              const active = isActive(item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 10,
                      textDecoration: 'none',
                      fontSize: 13,
                      fontWeight: active ? 700 : 500,
                      color: active ? NAVY : 'rgba(255,255,255,0.7)',
                      background: active ? 'white' : 'transparent',
                      transition: 'background 0.15s, color 0.15s',
                    }}
                    className={active ? '' : 'hover-nav-item'}
                  >
                    <item.icon size={17} style={{ color: active ? NAVY : 'rgba(255,255,255,0.65)', flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, margin: 0 }}>AINO v1.0 &copy; 2025</p>
        </div>
      </aside>

      <style>{`
        .hover-nav-item:hover {
          background: rgba(255,255,255,0.1) !important;
          color: white !important;
        }
        .hover-nav-item:hover svg {
          color: white !important;
        }
        @media (min-width: 1024px) {
          .sidebar-panel {
            position: static !important;
            transform: none !important;
            z-index: auto !important;
            height: 100vh !important;
          }
        }
      `}</style>
    </>
  )
}
