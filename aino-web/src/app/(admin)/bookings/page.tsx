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

function tabStyle(active: boolean) {
  return {
    padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
    border: 'none', cursor: 'pointer', transition: 'background 0.15s',
    background: active ? 'white' : 'transparent',
    color: active ? '#1e3c6e' : '#64748b',
    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
  } as const
}

export default function AdminBookingsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ['admin-bookings'],
    queryFn: async () => {
      const r = await api.get('/bookings')
      return Array.isArray(r.data) ? r.data : []
    },
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`.tbl-row:hover { background: #f8fafc; } .tbl-row:last-child { border-bottom: none; }`}</style>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: '#fffbeb', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={18} style={{ color: '#d97706' }} />
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Bookings</h2>
            {!isLoading && <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{bookings.length} total</p>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Input
            placeholder="Search bookings…"
            leftAddon={<Search size={13} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 2, background: '#f1f5f9', borderRadius: 10, padding: 4 }}>
            {STATUS_FILTERS.map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)} style={tabStyle(statusFilter === s)}>
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading && (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, height: 240 }} className="animate-pulse" />
      )}
      {!isLoading && filtered.length === 0 && (
        <EmptyState icon={BookOpen} title="No bookings found" description={search || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Bookings will appear here once agents start booking units'} />
      )}
      {!isLoading && filtered.length > 0 && (
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
                  {b.status !== 'cancelled' && (
                    <Button size="sm" variant="danger" onClick={() => cancelMutation.mutate(b.id)} loading={cancelMutation.isPending}>
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
