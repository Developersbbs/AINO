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
    queryFn: () => api.get('/bookings/my').then((r) => (Array.isArray(r.data) ? r.data : [])),
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`.tbl-row:hover { background: #f8fafc; } .tbl-row:last-child { border-bottom: none; }`}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, background: '#fffbeb', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BookOpen size={18} style={{ color: '#d97706' }} />
        </div>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>My Bookings</h2>
          {!isLoading && <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{bookings.length} total</p>}
        </div>
      </div>

      {isLoading && (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, height: 240 }} className="animate-pulse" />
      )}
      {!isLoading && bookings.length === 0 && (
        <EmptyState icon={BookOpen} title="No bookings yet" description="Bookings made through your share links will appear here" />
      )}
      {!isLoading && bookings.length > 0 && (
        <Table>
          <Thead>
            <tr>
              <Th>Unit</Th><Th>Project</Th><Th>Customer</Th><Th>Amount</Th><Th>Status</Th><Th>Note</Th><Th>Date</Th>
            </tr>
          </Thead>
          <Tbody>
            {bookings.map((b) => (
              <Tr key={b.id}>
                <Td><span style={{ fontWeight: 600, color: '#0f172a' }}>{b.unit?.unitNumber ?? '—'}</span></Td>
                <Td>{b.unit?.project?.name ?? '—'}</Td>
                <Td>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, color: '#0f172a' }}>{b.customer?.name ?? '—'}</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>{b.customer?.phone}</p>
                  </div>
                </Td>
                <Td><span style={{ fontWeight: 600, color: '#059669' }}>{b.amount ? formatCurrency(b.amount) : '—'}</span></Td>
                <Td><Badge status={b.status} /></Td>
                <Td><span style={{ fontSize: 12, color: '#94a3b8' }}>{b.note ?? '—'}</span></Td>
                <Td>{b.createdAt ? formatDate(b.createdAt) : '—'}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  )
}
