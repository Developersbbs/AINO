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
    queryFn: () => api.get('/owner/bookings').then((r) => r.data?.bookings ?? r.data),
  })

  const verifyMutation = useMutation({
    mutationFn: (id: string) => api.post(`/owner/bookings/${id}/verify`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-bookings'] })
      toast.success('Booking verified')
    },
    onError: () => toast.error('Failed to verify booking'),
  })

  const soldMutation = useMutation({
    mutationFn: (id: string) => api.post(`/owner/bookings/${id}/sold`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-bookings'] })
      toast.success('Unit marked as sold')
    },
    onError: () => toast.error('Failed to mark as sold'),
  })

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-xl h-64 animate-pulse" />
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No bookings yet"
          description="Bookings for your projects will appear here"
        />
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Unit</Th>
              <Th>Project</Th>
              <Th>Customer</Th>
              <Th>Agent</Th>
              <Th>Amount</Th>
              <Th>Status</Th>
              <Th>Date</Th>
              <Th>Actions</Th>
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
                <Td>{b.agent?.name}</Td>
                <Td>{b.amount ? formatCurrency(b.amount) : '—'}</Td>
                <Td><Badge status={b.status} /></Td>
                <Td>{formatDate(b.createdAt)}</Td>
                <Td>
                  <div className="flex gap-1.5">
                    {b.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => verifyMutation.mutate(b.id)}
                        loading={verifyMutation.isPending}
                      >
                        <CheckCircle size={13} /> Verify
                      </Button>
                    )}
                    {b.status === 'confirmed' && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => soldMutation.mutate(b.id)}
                        loading={soldMutation.isPending}
                      >
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
