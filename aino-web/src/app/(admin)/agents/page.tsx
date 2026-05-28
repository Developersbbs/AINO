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
      const raw: Record<string, unknown>[] = Array.isArray(r.data) ? r.data : []
      return raw.map((a) => ({
        id: a.id as string,
        name: a.name as string,
        phone: a.phone as string,
        email: a.email as string | undefined,
        status: a.is_approved ? 'active' : 'pending',
        totalLeads: (a.totalLeads as number) ?? 0,
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

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AgentData>({
    resolver: zodResolver(agentSchema),
  })

  const filtered = agents.filter(
    (a) =>
      a.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.phone?.includes(search)
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`.tbl-row:hover { background: #f8fafc; } .tbl-row:last-child { border-bottom: none; }`}</style>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 'auto' }}>
          <div style={{ width: 38, height: 38, background: '#f5f3ff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Users size={18} style={{ color: '#7c3aed' }} />
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Agents</h2>
            {!isLoading && <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{agents.length} total</p>}
          </div>
        </div>
        <div style={{ width: 220 }}>
          <Input
            placeholder="Search agents…"
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
          <Plus size={15} /> Add Agent
        </button>
      </div>

      {/* Content */}
      {isLoading && (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="animate-pulse" style={{ width: '60%', height: 12, background: '#f1f5f9', borderRadius: 6 }} />
        </div>
      )}
      {!isLoading && filtered.length === 0 && (
        <EmptyState
          icon={Users}
          title="No agents found"
          description={search ? 'No agents match your search' : 'Add your first agent to get started'}
          action={<Button onClick={() => setAddOpen(true)}><Plus size={15} /> Add Agent</Button>}
        />
      )}
      {!isLoading && filtered.length > 0 && (
        <Table>
          <Thead>
            <tr>
              <Th>Agent</Th>
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
                <Td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#7c3aed', flexShrink: 0 }}>
                      {agent.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{agent.name}</span>
                  </div>
                </Td>
                <Td>{agent.phone}</Td>
                <Td>{agent.email ?? '—'}</Td>
                <Td><Badge status={agent.status} /></Td>
                <Td>{agent.totalLeads ?? 0}</Td>
                <Td>{formatDate(agent.createdAt)}</Td>
                <Td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {agent.status === 'pending' && (
                      <>
                        <button type="button" onClick={() => actionMutation.mutate({ id: agent.id, action: 'approve' })}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: '#f0fdf4', color: '#15803d' }}>
                          <CheckCircle size={13} /> Approve
                        </button>
                        <button type="button" onClick={() => actionMutation.mutate({ id: agent.id, action: 'reject' })}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: '#fef2f2', color: '#dc2626' }}>
                          <XCircle size={13} /> Reject
                        </button>
                      </>
                    )}
                    {(agent.status === 'approved' || agent.status === 'active') && (
                      <button type="button" onClick={() => actionMutation.mutate({ id: agent.id, action: 'deactivate' })}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: '#fef2f2', color: '#dc2626' }}>
                        <Ban size={13} /> Deactivate
                      </button>
                    )}
                    {agent.status === 'deactivated' && (
                      <button type="button" onClick={() => actionMutation.mutate({ id: agent.id, action: 'approve' })}
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

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Agent">
        <form onSubmit={handleSubmit((d) => addMutation.mutate(d))} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="Full Name" error={errors.name?.message} {...register('name')} />
          <Input label="Phone" leftAddon="+91" maxLength={10} inputMode="numeric" error={errors.phone?.message} {...register('phone')} />
          <Input label="Email (optional)" type="email" error={errors.email?.message} {...register('email')} />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="ghost" type="button" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit" loading={addMutation.isPending}>Add Agent</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
