'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { BookOpen, CheckCircle, Clock } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'

// Matches the actual Prisma/backend response shape
interface Booking {
  id: string
  customer_name: string
  customer_phone: string
  booking_date: string
  status: string          // BookingStatus: Pending | Confirmed | Sold
  confirmed_at: string | null
  sold_at: string | null
  unit: {
    unit_number: string
    price: number
    status: string
    project: { id: string; project_name: string }
  }
}

export default function AgentBookingsPage() {
  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ['agent-bookings'],
    queryFn: () => api.get('/bookings/my').then((r) => (Array.isArray(r.data) ? r.data : [])),
  })

  const confirmed = bookings.filter((b) => b.status === 'Confirmed' || b.status === 'Sold').length
  const pending   = bookings.filter((b) => b.status === 'Pending').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, background: '#fffbeb', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BookOpen size={18} style={{ color: '#d97706' }} />
        </div>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>My Bookings</h2>
          {!isLoading && <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{bookings.length} total</p>}
        </div>
      </div>

      {/* Stats */}
      {!isLoading && bookings.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <StatCard label="Total Bookings" value={bookings.length} icon={BookOpen}     iconBg="#fffbeb" iconColor="#d97706" />
          <StatCard label="Confirmed"      value={confirmed}       icon={CheckCircle}  iconBg="#f0fdf4" iconColor="#059669" />
          <StatCard label="Pending"        value={pending}         icon={Clock}        iconBg="#fef2f2" iconColor="#ef4444" />
        </div>
      )}

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
              <Th>Plot</Th>
              <Th>Project</Th>
              <Th>Customer</Th>
              <Th>Plot Price</Th>
              <Th>Status</Th>
              <Th>Booking Date</Th>
            </tr>
          </Thead>
          <Tbody>
            {bookings.map((b) => (
              <Tr key={b.id}>
                <Td>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>
                    {b.unit?.unit_number ?? '—'}
                  </span>
                </Td>
                <Td>{b.unit?.project?.project_name ?? '—'}</Td>
                <Td>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, color: '#0f172a', fontSize: 13 }}>{b.customer_name}</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{b.customer_phone}</p>
                  </div>
                </Td>
                <Td>
                  <span style={{ fontWeight: 600, color: '#059669' }}>
                    {b.unit?.price ? formatCurrency(b.unit.price) : '—'}
                  </span>
                </Td>
                <Td><Badge status={b.status} /></Td>
                <Td>{b.booking_date ? formatDate(b.booking_date) : '—'}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  )
}
