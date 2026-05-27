'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import {
  Building2,
  Users,
  UserCheck,
  BookOpen,
  DollarSign,
  TrendingUp,
  Activity,
} from 'lucide-react'

interface DashboardData {
  stats: {
    totalProjects: number
    totalAgents: number
    totalOwners: number
    totalBookings: number
    totalRevenue: number
    pendingApprovals: number
  }
  recentActivity: Array<{
    id: string
    user: string
    action: string
    createdAt: string
  }>
  recentBookings: Array<{
    id: string
    unit: string
    agent: string
    status: string
    createdAt: string
    amount: number
  }>
}

export default function AdminDashboard() {
  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get('/admin/dashboard').then((r) => r.data),
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl h-24 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <EmptyState
        icon={Activity}
        title="Failed to load dashboard"
        description="Could not fetch dashboard data. Please try again."
      />
    )
  }

  const { stats, recentActivity, recentBookings } = data

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          label="Total Projects"
          value={stats.totalProjects}
          icon={Building2}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          label="Agents"
          value={stats.totalAgents}
          icon={Users}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
        <StatCard
          label="Owners"
          value={stats.totalOwners}
          icon={UserCheck}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
        />
        <StatCard
          label="Bookings"
          value={stats.totalBookings}
          icon={BookOpen}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Revenue"
          value={formatCurrency(stats.totalRevenue ?? 0)}
          icon={DollarSign}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          label="Pending"
          value={stats.pendingApprovals ?? 0}
          icon={TrendingUp}
          iconBg="bg-red-50"
          iconColor="text-red-500"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Recent Bookings</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {recentBookings?.length === 0 && (
              <EmptyState icon={BookOpen} title="No bookings yet" />
            )}
            {recentBookings?.map((b) => (
              <div key={b.id} className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">{b.unit}</p>
                  <p className="text-xs text-slate-400">Agent: {b.agent}</p>
                </div>
                <div className="text-right">
                  <Badge status={b.status} />
                  <p className="text-xs text-slate-400 mt-1">{formatDateTime(b.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Recent Activity</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {recentActivity?.length === 0 && (
              <EmptyState icon={Activity} title="No activity yet" />
            )}
            {recentActivity?.map((a) => (
              <div key={a.id} className="px-5 py-3.5 flex items-start gap-3">
                <div className="w-8 h-8 bg-[#1e3c6e]/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[#1e3c6e] text-xs font-bold">
                    {a.user?.charAt(0)?.toUpperCase() ?? 'U'}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-slate-900">
                    <span className="font-medium">{a.user}</span> {a.action}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(a.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
