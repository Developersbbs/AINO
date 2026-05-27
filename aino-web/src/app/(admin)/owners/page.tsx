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
    queryFn: () => api.get('/admin/owners').then((r) => r.data?.owners ?? r.data),
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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OwnerData>({ resolver: zodResolver(ownerSchema) })

  const filtered = owners.filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.phone.includes(search)
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <Input
          placeholder="Search owners..."
          leftAddon={<Search size={14} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={() => setAddOpen(true)}>
          <Plus size={16} /> Add Owner
        </Button>
      </div>

      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-xl h-64 animate-pulse" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title="No owners found"
          action={<Button onClick={() => setAddOpen(true)}><Plus size={16} /> Add Owner</Button>}
        />
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Name</Th>
              <Th>Phone</Th>
              <Th>Email</Th>
              <Th>Projects</Th>
              <Th>Status</Th>
              <Th>Joined</Th>
              <Th>Actions</Th>
            </tr>
          </Thead>
          <Tbody>
            {filtered.map((owner) => (
              <Tr key={owner.id}>
                <Td><span className="font-medium text-slate-900">{owner.name}</span></Td>
                <Td>{owner.phone}</Td>
                <Td>{owner.email ?? '—'}</Td>
                <Td>{owner.projectCount ?? 0}</Td>
                <Td><Badge status={owner.status} /></Td>
                <Td>{formatDate(owner.createdAt)}</Td>
                <Td>
                  <div className="flex items-center gap-1.5">
                    {owner.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => actionMutation.mutate({ id: owner.id, action: 'approve' })}
                      >
                        <CheckCircle size={13} /> Approve
                      </Button>
                    )}
                    {(owner.status === 'approved' || owner.status === 'active') && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => actionMutation.mutate({ id: owner.id, action: 'deactivate' })}
                      >
                        <Ban size={13} /> Deactivate
                      </Button>
                    )}
                    {owner.status === 'deactivated' && (
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => actionMutation.mutate({ id: owner.id, action: 'approve' })}
                      >
                        <CheckCircle size={13} /> Reactivate
                      </Button>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Owner">
        <form onSubmit={handleSubmit((d) => addMutation.mutate(d))} className="space-y-4">
          <Input label="Full Name" error={errors.name?.message} {...register('name')} />
          <Input
            label="Phone"
            leftAddon="+91"
            maxLength={10}
            inputMode="numeric"
            error={errors.phone?.message}
            {...register('phone')}
          />
          <Input label="Email (optional)" type="email" error={errors.email?.message} {...register('email')} />
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" type="button" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit" loading={addMutation.isPending}>Add Owner</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
