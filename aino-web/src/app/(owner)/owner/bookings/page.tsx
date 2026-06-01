'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { toast } from 'sonner'
import { BookOpen, CheckCircle, ShoppingBag } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'

interface Booking {
  id: string
  unit: { unitNumber: string; project: { name: string } }
  agent: { name: string }
  customer: { name: string; phone: string }
  status: string
  amount: number
  createdAt: string
}

export default function OwnerBookingsPage() {
  const qc = useQueryClient()

  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ['owner-bookings'],
    queryFn: () => api.get('/owner/bookings').then((r) => (Array.isArray(r.data) ? r.data : [])),
  })

  const verifyMutation = useMutation({
    mutationFn: (id: string) => api.post(`/owner/bookings/${id}/verify`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['owner-bookings'] }); toast.success('Booking verified') },
    onError: () => toast.error('Failed to verify booking'),
  })

  const soldMutation = useMutation({
    mutationFn: (id: string) => api.post(`/owner/bookings/${id}/sold`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['owner-bookings'] }); toast.success('Unit marked as sold') },
    onError: () => toast.error('Failed to mark as sold'),
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, background: '#fffbeb', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BookOpen size={18} style={{ color: '#d97706' }} />
        </div>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Bookings</h2>
          {!isLoading && <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{bookings.length} total</p>}
        </div>
      </div>

      {isLoading && (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, height: 240 }} className="animate-pulse" />
      )}
      {!isLoading && bookings.length === 0 && (
        <EmptyState icon={BookOpen} title="No bookings yet" description="Bookings for your projects will appear here" />
      )}
      {!isLoading && bookings.length > 0 && (
        <Table>
          <Thead>
            <tr>
              <Th>Unit</Th><Th>Project</Th><Th>Customer</Th><Th>Agent</Th><Th>Amount</Th><Th>Status</Th><Th>Date</Th><Th>Actions</Th>
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
                <Td>{b.agent?.name ?? '—'}</Td>
                <Td><span style={{ fontWeight: 600, color: '#059669' }}>{b.amount ? formatCurrency(b.amount) : '—'}</span></Td>
                <Td><Badge status={b.status} /></Td>
                <Td>{b.createdAt ? formatDate(b.createdAt) : '—'}</Td>
                <Td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {b.status === 'pending' && (
                      <Button size="sm" variant="success" onClick={() => verifyMutation.mutate(b.id)} loading={verifyMutation.isPending}>
                        <CheckCircle size={13} /> Verify
                      </Button>
                    )}
                    {b.status === 'confirmed' && (
                      <Button size="sm" variant="primary" onClick={() => soldMutation.mutate(b.id)} loading={soldMutation.isPending}>
                        <ShoppingBag size={13} /> Mark Sold
                      </Button>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  )
}
