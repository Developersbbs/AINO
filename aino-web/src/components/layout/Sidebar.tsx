'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
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
  ChevronRight,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

const adminNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Projects', href: '/projects', icon: Building2 },
  { label: 'Agents', href: '/agents', icon: Users },
  { label: 'Owners', href: '/owners', icon: UserCheck },
  { label: 'Bookings', href: '/bookings', icon: BookOpen },
  { label: 'Commissions', href: '/commissions', icon: DollarSign },
  { label: 'Audit Log', href: '/audit-log', icon: ClipboardList },
]

const agentNav: NavItem[] = [
  { label: 'Dashboard', href: '/agent/dashboard', icon: LayoutDashboard },
  { label: 'Projects', href: '/agent/projects', icon: Building2 },
  { label: 'My Leads', href: '/agent/leads', icon: Share2 },
  { label: 'Bookings', href: '/agent/bookings', icon: BookOpen },
  { label: 'Commissions', href: '/agent/commissions', icon: DollarSign },
]

const ownerNav: NavItem[] = [
  { label: 'Dashboard', href: '/owner/dashboard', icon: LayoutDashboard },
  { label: 'My Projects', href: '/owner/projects', icon: Building2 },
  { label: 'Bookings', href: '/owner/bookings', icon: BookOpen },
  { label: 'Reports', href: '/owner/reports', icon: TrendingUp },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuthStore()
  const pathname = usePathname()

  const navItems =
    user?.role === 'admin' ? adminNav : user?.role === 'agent' ? agentNav : ownerNav

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
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-full w-64 bg-[#1e3c6e] flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-[#1e3c6e] font-black text-sm">A</span>
            </div>
            <div>
              <span className="text-white font-bold text-lg tracking-wide">AINO</span>
              <p className="text-white/50 text-xs -mt-0.5">Real Estate</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* User info */}
        {user && (
          <div className="px-4 py-3 mx-3 mt-3 rounded-xl bg-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                {user.name?.charAt(0)?.toUpperCase() ?? 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-white font-medium text-sm truncate">{user.name}</p>
                <p className="text-white/50 text-xs capitalize">{user.role}</p>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group',
                      active
                        ? 'bg-white text-[#1e3c6e]'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <item.icon size={18} className={active ? 'text-[#1e3c6e]' : ''} />
                    <span className="flex-1">{item.label}</span>
                    {active && <ChevronRight size={14} className="text-[#1e3c6e]/50" />}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-white/10">
          <p className="text-white/30 text-xs text-center">AINO v1.0 &copy; 2025</p>
        </div>
      </aside>
    </>
  )
}
