'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { BookOpen } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'

interface Booking {
  id: string
  unit: { unitNumber: string; project: { name: string } }
  customer: { name: string; phone: string }
  status: string
  amount: number
  note?: string
  createdAt: string
}

export default function AgentBookingsPage() {
  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ['agent-bookings'],
    queryFn: () => api.get('/bookings/my').then((r) => r.data?.bookings ?? r.data),
  })

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-xl h-64 animate-pulse" />
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No bookings yet"
          description="Bookings made through your share links will appear here"
        />
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Unit</Th>
              <Th>Project</Th>
              <Th>Customer</Th>
              <Th>Amount</Th>
              <Th>Status</Th>
              <Th>Note</Th>
              <Th>Date</Th>
            </tr>
          </Thead>
          <Tbody>
            {bookings.map((b) => (
              <Tr key={b.id}>
                <Td><span className="font-medium">{b.unit?.unitNumber}</span></Td>
                <Td>{b.unit?.project?.name}</Td>
                <Td>
                  <div>
                    <p className="font-medium text-slate-900">{b.customer?.name}</p>
                    <p className="text-xs text-slate-400">{b.customer?.phone}</p>
                  </div>
                </Td>
                <Td>{b.amount ? formatCurrency(b.amount) : '—'}</Td>
                <Td><Badge status={b.status} /></Td>
                <Td className="max-w-xs">
                  <span className="text-slate-500 text-xs truncate block">{b.note ?? '—'}</span>
                </Td>
                <Td>{formatDate(b.createdAt)}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  )
}
