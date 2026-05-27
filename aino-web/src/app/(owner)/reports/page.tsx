'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, DollarSign, Home, BarChart2 } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts'

interface SalesReport {
  summary: {
    totalRevenue: number
    totalSold: number
    totalBookings: number
    averagePrice: number
  }
  monthlySales: Array<{ month: string; sold: number; revenue: number }>
  projectBreakdown: Array<{
    projectName: string
    totalUnits: number
    sold: number
    revenue: number
  }>
}

export default function OwnerReportsPage() {
  const { data, isLoading } = useQuery<SalesReport>({
    queryKey: ['owner-reports'],
    queryFn: () => api.get('/owner/reports').then((r) => r.data),
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl h-24 animate-pulse" />
          ))}
        </div>
        <div className="bg-white border border-slate-200 rounded-xl h-64 animate-pulse" />
      </div>
    )
  }

  if (!data) {
    return <EmptyState icon={BarChart2} title="No report data available" />
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Revenue"
          value={formatCurrency(data.summary.totalRevenue ?? 0)}
          icon={DollarSign}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          label="Units Sold"
          value={data.summary.totalSold ?? 0}
          icon={Home}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          label="Total Bookings"
          value={data.summary.totalBookings ?? 0}
          icon={TrendingUp}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
        <StatCard
          label="Avg. Price"
          value={formatCurrency(data.summary.averagePrice ?? 0)}
          icon={BarChart2}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
      </div>

      {/* Monthly Sales Chart */}
      {data.monthlySales?.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Monthly Sales</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.monthlySales}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value, name) => [
                  name === 'revenue' ? formatCurrency(Number(value)) : value,
                  name === 'revenue' ? 'Revenue' : 'Units Sold',
                ]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="sold"
                stroke="#3b82f6"
                strokeWidth={2}
                name="sold"
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#1e3c6e"
                strokeWidth={2}
                name="revenue"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Project Breakdown */}
      {data.projectBreakdown?.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Project Breakdown</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.projectBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="projectName" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="totalUnits" fill="#e2e8f0" name="Total Units" radius={[4, 4, 0, 0]} />
              <Bar dataKey="sold" fill="#1e3c6e" name="Sold" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
