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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {['s1', 's2', 's3', 's4'].map((k) => (
            <div key={k} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, height: 96 }} className="animate-pulse" />
          ))}
        </div>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, height: 256 }} className="animate-pulse" />
      </div>
    )
  }

  if (!data) {
    return <EmptyState icon={BarChart2} title="No report data available" />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard label="Total Revenue" value={formatCurrency(data.summary.totalRevenue ?? 0)} icon={DollarSign} iconBg="#f0fdf4" iconColor="#059669" />
        <StatCard label="Units Sold" value={data.summary.totalSold ?? 0} icon={Home} iconBg="#eff6ff" iconColor="#2563eb" />
        <StatCard label="Total Bookings" value={data.summary.totalBookings ?? 0} icon={TrendingUp} iconBg="#faf5ff" iconColor="#9333ea" />
        <StatCard label="Avg. Price" value={formatCurrency(data.summary.averagePrice ?? 0)} icon={BarChart2} iconBg="#fffbeb" iconColor="#d97706" />
      </div>

      {data.monthlySales?.length > 0 && (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', padding: 24 }}>
          <p style={{ fontWeight: 700, color: '#0f172a', fontSize: 14, margin: '0 0 16px' }}>Monthly Sales</p>
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
              <Line type="monotone" dataKey="sold" stroke="#3b82f6" strokeWidth={2} name="sold" dot={{ r: 4 }} />
              <Line type="monotone" dataKey="revenue" stroke="#1e3c6e" strokeWidth={2} name="revenue" dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {data.projectBreakdown?.length > 0 && (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', padding: 24 }}>
          <p style={{ fontWeight: 700, color: '#0f172a', fontSize: 14, margin: '0 0 16px' }}>Project Breakdown</p>
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
