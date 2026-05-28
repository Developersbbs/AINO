'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Share2, BookOpen, DollarSign, TrendingUp, Activity } from 'lucide-react'

interface AgentDashboard {
  stats: {
    totalLeads: number
    totalBookings: number
    totalCommissions: number
    pendingCommissions: number
  }
  recentLeads: Array<{
    id: string
    shareToken: string
    project: { name: string }
    clicks: number
    conversions: number
    createdAt: string
  }>
}

export default function AgentDashboard() {
  const { data, isLoading } = useQuery<AgentDashboard>({
    queryKey: ['agent-dashboard'],
    queryFn: () =>
      Promise.all([
        api.get('/leads/my').then((r) => (Array.isArray(r.data) ? r.data : [])),
        api.get('/bookings/my').then((r) => (Array.isArray(r.data) ? r.data : [])),
        api.get('/commissions/my').then((r) => (Array.isArray(r.data) ? r.data : [])),
      ]).then(([leads, bookings, commissions]) => ({
        stats: {
          totalLeads: leads?.length ?? 0,
          totalBookings: bookings?.length ?? 0,
          totalCommissions: commissions?.reduce(
            (sum: number, c: { amount: number }) => sum + (c.amount ?? 0),
            0
          ) ?? 0,
          pendingCommissions: commissions?.filter((c: { status: string }) => c.status === 'pending').length ?? 0,
        },
        recentLeads: leads?.slice(0, 5) ?? [],
      })),
  })

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {['s1', 's2', 's3', 's4'].map((k) => (
            <div key={k} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, height: 96 }} className="animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard label="My Leads" value={data?.stats.totalLeads ?? 0} icon={Share2} iconBg="#eff6ff" iconColor="#2563eb" />
        <StatCard label="Bookings" value={data?.stats.totalBookings ?? 0} icon={BookOpen} iconBg="#fffbeb" iconColor="#d97706" />
        <StatCard label="Total Earned" value={formatCurrency(data?.stats.totalCommissions ?? 0)} icon={DollarSign} iconBg="#f0fdf4" iconColor="#059669" />
        <StatCard label="Pending" value={data?.stats.pendingCommissions ?? 0} icon={TrendingUp} iconBg="#fef2f2" iconColor="#ef4444" />
      </div>

      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>Recent Leads</h2>
        </div>
        {data?.recentLeads && data.recentLeads.length > 0 ? (
          <div>
            {data.recentLeads.map((lead, i) => (
              <div
                key={lead.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 20px',
                  borderBottom: i < data.recentLeads.length - 1 ? '1px solid #f1f5f9' : 'none',
                }}
              >
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0 }}>{lead.project?.name}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', marginTop: 2 }}>{lead.shareToken}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 12, color: '#374151', margin: 0 }}>
                    <span style={{ fontWeight: 600 }}>{lead.clicks}</span> clicks,{' '}
                    <span style={{ fontWeight: 600, color: '#059669' }}>{lead.conversions}</span> conv.
                  </p>
                  <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{formatDateTime(lead.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={Activity} title="No leads yet" description="Generate share links from the Projects page" />
        )}
      </div>
    </div>
  )
}
