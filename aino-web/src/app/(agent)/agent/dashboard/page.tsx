'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Share2, BookOpen, DollarSign, TrendingUp, Activity, Clock } from 'lucide-react'

// Raw shapes from backend
interface RawLead {
  id: string
  share_token: string
  customer_name?: string | null
  customer_phone?: string | null
  first_click_at?: string | null
  is_locked: boolean
  project: { id: string; project_name: string; location: string }
}

interface RawBooking {
  id: string
  customer_name: string
  customer_phone: string
  booking_date: string
  status: string
  unit: { unit_number: string; price: number; project: { id: string; project_name: string } }
}

interface RawCommission {
  id: string
  amount: number
  status: string
}

interface DashboardData {
  leads: RawLead[]
  bookings: RawBooking[]
  commissions: RawCommission[]
}

export default function AgentDashboard() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['agent-dashboard'],
    queryFn: () =>
      Promise.all([
        api.get('/leads/my').then((r) => (Array.isArray(r.data) ? r.data : []) as RawLead[]),
        api.get('/bookings/my').then((r) => (Array.isArray(r.data) ? r.data : []) as RawBooking[]),
        api.get('/commissions/my').then((r) => (Array.isArray(r.data) ? r.data : []) as RawCommission[]),
      ]).then(([leads, bookings, commissions]) => ({ leads, bookings, commissions })),
  })

  const leads       = data?.leads       ?? []
  const bookings    = data?.bookings    ?? []
  const commissions = data?.commissions ?? []

  const totalEarned   = commissions.reduce((s, c) => s + (c.amount ?? 0), 0)
  const pendingPayout = commissions.filter((c) => c.status === 'Unpaid').reduce((s, c) => s + (c.amount ?? 0), 0)
  const leadsOpened   = leads.filter((l) => l.first_click_at).length

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {['s1', 's2', 's3', 's4'].map((k) => (
            <div key={k} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, height: 96 }} className="animate-pulse" />
          ))}
        </div>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, height: 280 }} className="animate-pulse" />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard label="My Leads"      value={leads.length}               icon={Share2}    iconBg="#eff6ff" iconColor="#2563eb" />
        <StatCard label="Link Opened"   value={leadsOpened}                icon={Activity}  iconBg="#f0fdf4" iconColor="#059669" />
        <StatCard label="Bookings"       value={bookings.length}            icon={BookOpen}  iconBg="#fffbeb" iconColor="#d97706" />
        <StatCard label="Total Earned"  value={formatCurrency(totalEarned)} icon={DollarSign} iconBg="#fef2f2" iconColor="#ef4444" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Recent Leads */}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Share2 size={15} color="#2563eb" />
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>Recent Leads</h2>
          </div>
          {leads.length === 0 ? (
            <EmptyState icon={Activity} title="No leads yet" description="Generate share links from Projects" />
          ) : (
            leads.slice(0, 5).map((lead, i) => (
              <div key={lead.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 20px',
                borderBottom: i < Math.min(leads.length, 5) - 1 ? '1px solid #f1f5f9' : 'none',
              }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0 }}>
                    {lead.project?.project_name ?? '—'}
                  </p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
                    {lead.customer_name ?? 'Unknown client'} · {lead.customer_phone ?? '—'}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Badge status={lead.first_click_at ? 'active' : 'pending'} />
                  <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                    {lead.first_click_at ? formatDate(lead.first_click_at) : 'Not opened'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Recent Bookings */}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={15} color="#d97706" />
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>Recent Bookings</h2>
          </div>
          {bookings.length === 0 ? (
            <EmptyState icon={BookOpen} title="No bookings yet" description="Bookings from your leads appear here" />
          ) : (
            bookings.slice(0, 5).map((b, i) => (
              <div key={b.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 20px',
                borderBottom: i < Math.min(bookings.length, 5) - 1 ? '1px solid #f1f5f9' : 'none',
              }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0 }}>
                    Plot {b.unit?.unit_number} — {b.unit?.project?.project_name ?? '—'}
                  </p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
                    {b.customer_name} · {b.customer_phone}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Badge status={b.status} />
                  <p style={{ fontSize: 11, color: '#059669', fontWeight: 600, marginTop: 4 }}>
                    {formatCurrency(b.unit?.price ?? 0)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pending payout banner */}
      {pendingPayout > 0 && (
        <div style={{
          background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12,
          padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <Clock size={18} color="#d97706" style={{ flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#92400e', margin: 0 }}>
              Pending Payout: {formatCurrency(pendingPayout)}
            </p>
            <p style={{ fontSize: 12, color: '#b45309', margin: '2px 0 0' }}>
              Commission is released after the owner confirms the booking.
            </p>
          </div>
          <TrendingUp size={32} color="#fcd34d" style={{ marginLeft: 'auto', flexShrink: 0 }} />
        </div>
      )}

    </div>
  )
}
