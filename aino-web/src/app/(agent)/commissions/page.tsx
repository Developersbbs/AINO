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
    queryFn: () => api.get('/commissions/my').then((r) => r.data?.commissions ?? r.data),
  })

  const totalEarned = commissions.reduce((sum, c) => sum + (c.amount ?? 0), 0)
  const totalPaid = commissions
    .filter((c) => c.status === 'paid')
    .reduce((sum, c) => sum + (c.amount ?? 0), 0)
  const totalPending = commissions
    .filter((c) => c.status === 'pending')
    .reduce((sum, c) => sum + (c.amount ?? 0), 0)

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Earned"
          value={formatCurrency(totalEarned)}
          icon={DollarSign}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          label="Paid Out"
          value={formatCurrency(totalPaid)}
          icon={TrendingUp}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          label="Pending"
          value={formatCurrency(totalPending)}
          icon={Clock}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-xl h-64 animate-pulse" />
      ) : commissions.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="No commissions yet"
          description="Commissions are credited when your bookings are confirmed"
        />
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Booking</Th>
              <Th>Project</Th>
              <Th>Rate</Th>
              <Th>Amount</Th>
              <Th>Status</Th>
              <Th>Date</Th>
            </tr>
          </Thead>
          <Tbody>
            {commissions.map((c) => (
              <Tr key={c.id}>
                <Td><span className="font-medium">{c.booking?.unit}</span></Td>
                <Td>{c.booking?.project}</Td>
                <Td>{c.rate}%</Td>
                <Td className="font-semibold text-emerald-700">{formatCurrency(c.amount)}</Td>
                <Td><Badge status={c.status} /></Td>
                <Td>{formatDate(c.createdAt)}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  )
}
