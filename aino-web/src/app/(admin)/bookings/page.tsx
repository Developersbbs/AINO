'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { toast } from 'sonner'
import { Search, BookOpen, XCircle } from 'lucide-react'
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

const STATUS_FILTERS = ['all', 'pending', 'confirmed', 'cancelled']

export default function AdminBookingsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ['admin-bookings'],
    queryFn: () => api.get('/bookings').then((r) => r.data?.bookings ?? r.data),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.post(`/bookings/${id}/cancel`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-bookings'] })
      toast.success('Booking cancelled')
    },
    onError: () => toast.error('Failed to cancel booking'),
  })

  const filtered = bookings.filter((b) => {
    const matchSearch =
      b.unit?.unitNumber?.toLowerCase().includes(search.toLowerCase()) ||
      b.unit?.project?.name?.toLowerCase().includes(search.toLowerCase()) ||
      b.agent?.name?.toLowerCase().includes(search.toLowerCase()) ||
      b.customer?.name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || b.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <Input
          placeholder="Search bookings..."
          leftAddon={<Search size={14} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                statusFilter === s
                  ? 'bg-white text-[#1e3c6e] shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-xl h-64 animate-pulse" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={BookOpen} title="No bookings found" />
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
            {filtered.map((b) => (
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
                  {b.status !== 'cancelled' && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => cancelMutation.mutate(b.id)}
                      loading={cancelMutation.isPending}
                    >
                      <XCircle size={13} /> Cancel
                    </Button>
                  )}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  )
}
