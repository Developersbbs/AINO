'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { toast } from 'sonner'
import { Plus, Search, UserCheck, CheckCircle, Ban } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { formatDate } from '@/lib/utils'

interface Owner {
  id: string
  name: string
  phone: string
  email?: string
  status: string
  projectCount: number
  createdAt: string
}

const ownerSchema = z.object({
  name: z.string().min(2, 'Name required'),
  phone: z.string().min(10).max(10).regex(/^\d+$/),
  email: z.string().email().optional().or(z.literal('')),
})

type OwnerData = z.infer<typeof ownerSchema>

export default function OwnersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)

  const { data: owners = [], isLoading } = useQuery<Owner[]>({
    queryKey: ['admin-owners'],
    queryFn: async () => {
      const r = await api.get('/admin/owners')
      const raw: Record<string, unknown>[] = Array.isArray(r.data) ? r.data : []
      return raw.map((o) => {
        let status = 'pending'
        if (o.is_approved) status = 'active'
        else if (o.is_deactivated) status = 'deactivated'
        return {
          id: o.id as string,
          name: o.name as string,
          phone: o.phone as string,
          email: o.email as string | undefined,
          status,
          projectCount: (o.projectCount as number) ?? 0,
          createdAt: o.created_at as string,
        }
      })
    },
  })

  const addMutation = useMutation({
    mutationFn: (data: OwnerData) => api.post('/admin/owners', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-owners'] })
      setAddOpen(false)
      reset()
      toast.success('Owner added')
    },
    onError: () => toast.error('Failed to add owner'),
  })

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      api.post(`/admin/owners/${id}/${action}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-owners'] })
      toast.success('Owner updated')
    },
    onError: () => toast.error('Action failed'),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<OwnerData>({
    resolver: zodResolver(ownerSchema),
  })

  const filtered = owners.filter(
    (o) =>
      o.name?.toLowerCase().includes(search.toLowerCase()) ||
      o.phone?.includes(search)
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 'auto' }}>
          <div style={{ width: 38, height: 38, background: '#eef2ff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <UserCheck size={18} style={{ color: '#4f46e5' }} />
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Owners</h2>
            {!isLoading && <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{owners.length} total</p>}
          </div>
        </div>
        <div style={{ width: 220 }}>
          <Input
            placeholder="Search owners…"
            leftAddon={<Search size={13} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', borderRadius: 10, flexShrink: 0,
            background: '#1e3c6e', color: 'white',
            fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
          }}
        >
          <Plus size={15} /> Add Owner
        </button>
      </div>

      {/* Content */}
      {isLoading && (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, height: 240 }} className="animate-pulse" />
      )}
      {!isLoading && filtered.length === 0 && (
        <EmptyState
          icon={UserCheck}
          title="No owners found"
          description={search ? 'No owners match your search' : 'Add your first owner to get started'}
          action={<Button onClick={() => setAddOpen(true)}><Plus size={15} /> Add Owner</Button>}
        />
      )}
      {!isLoading && filtered.length > 0 && (
        <Table>
          <Thead>
            <tr>
              <Th>Owner</Th>
              <Th>Phone</Th>
              <Th>Email</Th>
              <Th>Status</Th>
              <Th>Projects</Th>
              <Th>Joined</Th>
              <Th>Actions</Th>
            </tr>
          </Thead>
          <Tbody>
            {filtered.map((owner) => (
              <Tr key={owner.id}>
                <Td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#4f46e5', flexShrink: 0 }}>
                      {owner.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{owner.name}</span>
                  </div>
                </Td>
                <Td>{owner.phone}</Td>
                <Td>{owner.email ?? '—'}</Td>
                <Td><Badge status={owner.status} /></Td>
                <Td>{owner.projectCount ?? 0}</Td>
                <Td>{formatDate(owner.createdAt)}</Td>
                <Td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {owner.status === 'pending' && (
                      <button type="button" onClick={() => actionMutation.mutate({ id: owner.id, action: 'approve' })}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: '#f0fdf4', color: '#15803d' }}>
                        <CheckCircle size={13} /> Approve
                      </button>
                    )}
                    {(owner.status === 'approved' || owner.status === 'active') && (
                      <button type="button" onClick={() => actionMutation.mutate({ id: owner.id, action: 'deactivate' })}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: '#fef2f2', color: '#dc2626' }}>
                        <Ban size={13} /> Deactivate
                      </button>
                    )}
                    {owner.status === 'deactivated' && (
                      <button type="button" onClick={() => actionMutation.mutate({ id: owner.id, action: 'approve' })}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: '#f0fdf4', color: '#15803d' }}>
                        <CheckCircle size={13} /> Reactivate
                      </button>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Owner">
        <form onSubmit={handleSubmit((d) => addMutation.mutate(d))} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="Full Name" error={errors.name?.message} {...register('name')} />
          <Input label="Phone" leftAddon="+91" maxLength={10} inputMode="numeric" error={errors.phone?.message} {...register('phone')} />
          <Input label="Email (optional)" type="email" error={errors.email?.message} {...register('email')} />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="ghost" type="button" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit" loading={addMutation.isPending}>Add Owner</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
