'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
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
        api.get('/leads/my').then((r) => r.data?.leads ?? r.data),
        api.get('/bookings/my').then((r) => r.data?.bookings ?? r.data),
        api.get('/commissions/my').then((r) => r.data?.commissions ?? r.data),
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
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl h-24 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="My Leads"
          value={data?.stats.totalLeads ?? 0}
          icon={Share2}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          label="Bookings"
          value={data?.stats.totalBookings ?? 0}
          icon={BookOpen}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Total Earned"
          value={formatCurrency(data?.stats.totalCommissions ?? 0)}
          icon={DollarSign}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          label="Pending"
          value={data?.stats.pendingCommissions ?? 0}
          icon={TrendingUp}
          iconBg="bg-red-50"
          iconColor="text-red-500"
        />
      </div>

      {/* Recent Leads */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Recent Leads</h2>
        </div>
        {!data?.recentLeads?.length ? (
          <EmptyState icon={Activity} title="No leads yet" description="Generate share links from the Projects page" />
        ) : (
          <div className="divide-y divide-slate-100">
            {data.recentLeads.map((lead) => (
              <div key={lead.id} className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">{lead.project?.name}</p>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{lead.shareToken}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-600">
                    <span className="font-semibold">{lead.clicks}</span> clicks,{' '}
                    <span className="font-semibold text-emerald-600">{lead.conversions}</span> conv.
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(lead.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
