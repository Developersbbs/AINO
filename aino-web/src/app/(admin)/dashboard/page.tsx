'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import Link from 'next/link'
import {
  Building2, Users, UserCheck, BookOpen, DollarSign,
  Clock, ArrowRight, Plus, Activity, TrendingUp,
  CheckCircle2, AlertCircle, LayoutDashboard,
} from 'lucide-react'

interface DashboardData {
  stats: {
    totalProjects: number
    publishedProjects: number
    totalAgents: number
    approvedAgents: number
    totalOwners: number
    totalBookings: number
    totalRevenue: number
    pendingApprovals: number
  }
  recentActivity: Array<{ id: string; user: string; action: string; createdAt: string }>
  recentBookings: Array<{ id: string; unit: string; agent: string; status: string; createdAt: string; amount: number }>
}

function normalise(raw: unknown): DashboardData {
  const p = (raw as Record<string, unknown>) ?? {}
  if (p.stats && typeof p.stats === 'object') return p as unknown as DashboardData
  return {
    stats: {
      totalProjects:    (p.totalProjects    as number) ?? 0,
      publishedProjects:(p.publishedProjects as number) ?? 0,
      totalAgents:      (p.totalAgents      as number) ?? 0,
      approvedAgents:   (p.approvedAgents   as number) ?? 0,
      totalOwners:      (p.totalOwners      as number) ?? 0,
      totalBookings:    (p.totalBookings    as number) ?? 0,
      totalRevenue:     (p.totalRevenue     as number) ?? 0,
      pendingApprovals: (p.pendingApprovals as number) ?? 0,
    },
    recentBookings: [],
    recentActivity: [],
  }
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function todayStr() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

const STAT_CARDS = [
  { label: 'Total Projects',    subKey: 'publishedProjects', subLabel: 'published',       icon: Building2,   iconColor: '#2563eb', bg: '#eff6ff', href: '/projects',     valueKey: 'totalProjects'    },
  { label: 'Agents',            subKey: 'approvedAgents',    subLabel: 'approved',        icon: Users,       iconColor: '#7c3aed', bg: '#f5f3ff', href: '/agents',       valueKey: 'totalAgents'      },
  { label: 'Owners',            subKey: null,                subLabel: 'registered',      icon: UserCheck,   iconColor: '#4f46e5', bg: '#eef2ff', href: '/owners',       valueKey: 'totalOwners'      },
  { label: 'Bookings',          subKey: null,                subLabel: 'all time',        icon: BookOpen,    iconColor: '#d97706', bg: '#fffbeb', href: '/bookings',     valueKey: 'totalBookings'    },
  { label: 'Revenue',           subKey: null,                subLabel: 'from sold units', icon: DollarSign,  iconColor: '#059669', bg: '#ecfdf5', href: '/commissions',  valueKey: 'totalRevenue'     },
  { label: 'Pending Approvals', subKey: null,                subLabel: 'need review',     icon: AlertCircle, iconColor: '#dc2626', bg: '#fef2f2', href: '/agents',       valueKey: 'pendingApprovals' },
] as const

export default function AdminDashboard() {
  const { user } = useAuthStore()

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const r = await api.get('/admin/dashboard')
      return normalise(r.data?.data ?? r.data)
    },
  })

  const s = data?.stats
  const recentBookings = data?.recentBookings ?? []
  const recentActivity = data?.recentActivity ?? []

  // ── Bookings section content ──
  let bookingsContent: React.ReactNode
  if (isLoading) {
    bookingsContent = ['b1', 'b2', 'b3'].map((k) => (
      <div key={k} style={{ padding: '16px 24px', borderBottom: '1px solid #f8fafc', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, background: '#f1f5f9', borderRadius: '50%' }} className="animate-pulse" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ height: 12, background: '#f1f5f9', borderRadius: 4, width: '40%' }} className="animate-pulse" />
          <div style={{ height: 10, background: '#f1f5f9', borderRadius: 4, width: '25%' }} className="animate-pulse" />
        </div>
        <div style={{ height: 20, background: '#f1f5f9', borderRadius: 10, width: 60 }} className="animate-pulse" />
      </div>
    ))
  } else if (recentBookings.length === 0) {
    bookingsContent = (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 24px', gap: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BookOpen size={22} style={{ color: '#fbbf24' }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#475569', margin: 0 }}>No bookings yet</p>
          <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Bookings appear here once agents start booking units.</p>
        </div>
      </div>
    )
  } else {
    bookingsContent = recentBookings.map((b, i) => (
      <div key={b.id} style={{ padding: '14px 24px', borderBottom: i < recentBookings.length - 1 ? '1px solid #f1f5f9' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e8eef8', color: '#1e3c6e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
          {b.agent?.charAt(0)?.toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.unit}</p>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>by {b.agent} · {formatDateTime(b.createdAt)}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <Badge status={b.status} />
          <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', margin: 0 }}>{formatCurrency(b.amount)}</p>
        </div>
      </div>
    ))
  }

  // ── Activity section content ──
  let activityContent: React.ReactNode
  if (isLoading) {
    activityContent = (
      <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {['a1', 'a2', 'a3', 'a4'].map((k) => (
          <div key={k} style={{ display: 'flex', gap: 12 }}>
            <div style={{ width: 28, height: 28, background: '#f1f5f9', borderRadius: '50%', flexShrink: 0 }} className="animate-pulse" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ height: 12, background: '#f1f5f9', borderRadius: 4, width: '80%' }} className="animate-pulse" />
              <div style={{ height: 10, background: '#f1f5f9', borderRadius: 4, width: '33%' }} className="animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    )
  } else if (recentActivity.length === 0) {
    activityContent = (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 24px', gap: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <TrendingUp size={22} style={{ color: '#a78bfa' }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#475569', margin: 0 }}>No activity yet</p>
          <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Platform actions will be logged here.</p>
        </div>
      </div>
    )
  } else {
    activityContent = (
      <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 16, maxHeight: 300, overflowY: 'auto' }}>
        {recentActivity.map((a) => (
          <div key={a.id} style={{ display: 'flex', gap: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e8eef8', color: '#1e3c6e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
              {a.user?.charAt(0)?.toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, color: '#374151', margin: 0, lineHeight: 1.5 }}>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{a.user}</span>{' '}{a.action}
              </p>
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={10} />{formatDateTime(a.createdAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const pendingCount = s?.pendingApprovals ?? 0
  const approvalSuffix = pendingCount === 1 ? '' : 's'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 32 }}>

      {/* ── Welcome banner ── */}
      <div style={{ background: 'linear-gradient(135deg, #1e3c6e 0%, #2a5298 100%)', borderRadius: 16, padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, margin: '0 0 4px' }}>{todayStr()}</p>
            <h2 style={{ color: 'white', fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: -0.3 }}>
              {greeting()}, {user?.name?.split(' ')[0] ?? 'Admin'} 👋
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 4 }}>
              Here&apos;s what&apos;s happening on your platform today.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
            <Link href="/projects" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: 13, fontWeight: 600, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.25)' }}>
              <Plus size={14} /> New Project
            </Link>
            <Link href="/agents" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, background: 'white', color: '#1e3c6e', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
              <Users size={14} /> Manage Agents
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stat cards (3-column grid) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {isLoading
          ? ['p', 'a', 'o', 'b', 'r', 'x'].map((k) => (
              <div key={k} style={{ background: 'white', borderRadius: 16, height: 120, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }} className="animate-pulse" />
            ))
          : STAT_CARDS.map((card) => {
              const value = s?.[card.valueKey] ?? 0
              const subValue = card.subKey ? (s?.[card.subKey] ?? 0) : null
              const displayValue = card.valueKey === 'totalRevenue' ? formatCurrency(value) : value
              const sub = subValue === null ? card.subLabel : `${subValue} ${card.subLabel}`

              return (
                <Link
                  key={card.label}
                  href={card.href}
                  style={{ background: 'white', borderRadius: 16, padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', textDecoration: 'none', display: 'block' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ background: card.bg, borderRadius: 12, padding: '10px', display: 'inline-flex' }}>
                      <card.icon size={20} style={{ color: card.iconColor }} />
                    </div>
                    <ArrowRight size={14} style={{ color: '#cbd5e1', marginTop: 4 }} />
                  </div>
                  <p style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', lineHeight: 1, margin: 0 }}>{displayValue}</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginTop: 6, marginBottom: 0 }}>{card.label}</p>
                  <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2, marginBottom: 0 }}>{sub}</p>
                </Link>
              )
            })
        }
      </div>

      {/* ── Recent Bookings + Activity (3:2 split) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20 }}>

        {/* Recent Bookings */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, background: '#fffbeb', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BookOpen size={14} style={{ color: '#f59e0b' }} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Recent Bookings</span>
            </div>
            <Link href="/bookings" style={{ fontSize: 12, fontWeight: 600, color: '#1e3c6e', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {bookingsContent}
        </div>

        {/* Recent Activity */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, background: '#f5f3ff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={14} style={{ color: '#8b5cf6' }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Recent Activity</span>
          </div>
          {activityContent}
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <LayoutDashboard size={15} style={{ color: '#94a3b8' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Quick Actions</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {([
            { label: 'Add Project',   icon: Building2, href: '/projects',  iconColor: '#2563eb', bg: '#eff6ff', color: '#1d4ed8' },
            { label: 'Add Agent',     icon: Users,     href: '/agents',    iconColor: '#7c3aed', bg: '#f5f3ff', color: '#6d28d9' },
            { label: 'Add Owner',     icon: UserCheck, href: '/owners',    iconColor: '#4f46e5', bg: '#eef2ff', color: '#4338ca' },
            { label: 'View Bookings', icon: BookOpen,  href: '/bookings',  iconColor: '#d97706', bg: '#fffbeb', color: '#b45309' },
          ] as const).map((q) => (
            <Link
              key={q.label}
              href={q.href}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, background: q.bg, color: q.color, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
            >
              <q.icon size={16} style={{ color: q.iconColor }} />
              {q.label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Pending approval banner ── */}
      {!isLoading && pendingCount > 0 && (
        <Link href="/agents" style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 16, padding: '16px 20px', textDecoration: 'none' }}>
          <div style={{ width: 40, height: 40, background: '#fef3c7', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertCircle size={20} style={{ color: '#d97706' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#78350f', margin: 0 }}>
              {pendingCount} pending approval{approvalSuffix}
            </p>
            <p style={{ fontSize: 12, color: '#92400e', marginTop: 2 }}>Agents or owners are waiting for your review.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b45309', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
            Review <ArrowRight size={14} />
          </div>
        </Link>
      )}

      {!isLoading && pendingCount === 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 16, padding: '16px 20px' }}>
          <div style={{ width: 40, height: 40, background: '#dcfce7', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle2 size={20} style={{ color: '#16a34a' }} />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#14532d', margin: 0 }}>All caught up!</p>
            <p style={{ fontSize: 12, color: '#166534', marginTop: 2 }}>No pending approvals — everything is running smoothly.</p>
          </div>
        </div>
      )}

    </div>
  )
}
