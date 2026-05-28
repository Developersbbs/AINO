'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { DollarSign, TrendingUp, Clock } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'

interface Commission {
  id: string
  booking: { unit: string; project: string }
  rate: number
  amount: number
  status: 'pending' | 'paid'
  createdAt: string
}

export default function AgentCommissionsPage() {
  const { data: commissions = [], isLoading } = useQuery<Commission[]>({
    queryKey: ['agent-commissions'],
    queryFn: () => api.get('/commissions/my').then((r) => (Array.isArray(r.data) ? r.data : [])),
  })

  const totalEarned = commissions.reduce((sum, c) => sum + (c.amount ?? 0), 0)
  const totalPaid = commissions.filter((c) => c.status === 'paid').reduce((sum, c) => sum + (c.amount ?? 0), 0)
  const totalPending = commissions.filter((c) => c.status === 'pending').reduce((sum, c) => sum + (c.amount ?? 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`.tbl-row:hover { background: #f8fafc; } .tbl-row:last-child { border-bottom: none; }`}</style>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <StatCard label="Total Earned" value={formatCurrency(totalEarned)} icon={DollarSign} iconBg="#f0fdf4" iconColor="#059669" />
        <StatCard label="Paid Out" value={formatCurrency(totalPaid)} icon={TrendingUp} iconBg="#eff6ff" iconColor="#2563eb" />
        <StatCard label="Pending" value={formatCurrency(totalPending)} icon={Clock} iconBg="#fffbeb" iconColor="#d97706" />
      </div>

      {isLoading && (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, height: 240 }} className="animate-pulse" />
      )}
      {!isLoading && commissions.length === 0 && (
        <EmptyState icon={DollarSign} title="No commissions yet" description="Commissions are credited when your bookings are confirmed" />
      )}
      {!isLoading && commissions.length > 0 && (
        <Table>
          <Thead>
            <tr>
              <Th>Booking</Th><Th>Project</Th><Th>Rate</Th><Th>Amount</Th><Th>Status</Th><Th>Date</Th>
            </tr>
          </Thead>
          <Tbody>
            {commissions.map((c) => (
              <Tr key={c.id}>
                <Td><span style={{ fontWeight: 600, color: '#0f172a' }}>{c.booking?.unit ?? '—'}</span></Td>
                <Td>{c.booking?.project ?? '—'}</Td>
                <Td>{c.rate ? `${c.rate}%` : '—'}</Td>
                <Td><span style={{ fontWeight: 600, color: '#059669' }}>{formatCurrency(c.amount)}</span></Td>
                <Td><Badge status={c.status} /></Td>
                <Td>{c.createdAt ? formatDate(c.createdAt) : '—'}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  )
}
