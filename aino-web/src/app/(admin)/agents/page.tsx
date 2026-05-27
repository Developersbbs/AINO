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
import { Plus, Search, Users, CheckCircle, XCircle, Ban } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { formatDate } from '@/lib/utils'

interface Agent {
  id: string
  name: string
  phone: string
  email?: string
  status: string
  totalLeads: number
  totalCommissions: number
  createdAt: string
}

const agentSchema = z.object({
  name: z.string().min(2, 'Name required'),
  phone: z.string().min(10).max(10).regex(/^\d+$/),
  email: z.string().email().optional().or(z.literal('')),
})

type AgentData = z.infer<typeof agentSchema>

export default function AgentsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)

  const { data: agents = [], isLoading } = useQuery<Agent[]>({
    queryKey: ['admin-agents'],
    queryFn: async () => {
      const r = await api.get('/admin/agents')
      const raw: Record<string, unknown>[] = r.data?.data ?? r.data ?? []
      return raw.map((a) => ({
        id: a.id as string,
        name: a.name as string,
        phone: a.phone as string,
        email: a.email as string | undefined,
        status: a.is_approved ? 'active' : 'pending',
        totalLeads: (a.totalLeads as number) ?? 0,
        totalCommissions: (a.totalCommissions as number) ?? 0,
        createdAt: a.created_at as string,
      }))
    },
  })

  const addMutation = useMutation({
    mutationFn: (data: AgentData) => api.post('/admin/agents', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-agents'] })
      setAddOpen(false)
      reset()
      toast.success('Agent added')
    },
    onError: () => toast.error('Failed to add agent'),
  })

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      api.post(`/admin/agents/${id}/${action}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-agents'] })
      toast.success('Agent updated')
    },
    onError: () => toast.error('Action failed'),
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AgentData>({ resolver: zodResolver(agentSchema) })

  const filtered = agents.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.phone.includes(search)
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <Input
          placeholder="Search agents..."
          leftAddon={<Search size={14} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={() => setAddOpen(true)}>
          <Plus size={16} /> Add Agent
        </Button>
      </div>

      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-xl h-64 animate-pulse" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No agents found"
          action={<Button onClick={() => setAddOpen(true)}><Plus size={16} /> Add Agent</Button>}
        />
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Name</Th>
              <Th>Phone</Th>
              <Th>Email</Th>
              <Th>Status</Th>
              <Th>Leads</Th>
              <Th>Joined</Th>
              <Th>Actions</Th>
            </tr>
          </Thead>
          <Tbody>
            {filtered.map((agent) => (
              <Tr key={agent.id}>
                <Td><span className="font-medium text-slate-900">{agent.name}</span></Td>
                <Td>{agent.phone}</Td>
                <Td>{agent.email ?? '—'}</Td>
                <Td><Badge status={agent.status} /></Td>
                <Td>{agent.totalLeads ?? 0}</Td>
                <Td>{formatDate(agent.createdAt)}</Td>
                <Td>
                  <div className="flex items-center gap-1.5">
                    {agent.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => actionMutation.mutate({ id: agent.id, action: 'approve' })}
                        >
                          <CheckCircle size={13} /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => actionMutation.mutate({ id: agent.id, action: 'reject' })}
                        >
                          <XCircle size={13} /> Reject
                        </Button>
                      </>
                    )}
                    {(agent.status === 'approved' || agent.status === 'active') && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => actionMutation.mutate({ id: agent.id, action: 'deactivate' })}
                      >
                        <Ban size={13} /> Deactivate
                      </Button>
                    )}
                    {agent.status === 'deactivated' && (
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => actionMutation.mutate({ id: agent.id, action: 'approve' })}
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

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Agent">
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
            <Button type="submit" loading={addMutation.isPending}>Add Agent</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
