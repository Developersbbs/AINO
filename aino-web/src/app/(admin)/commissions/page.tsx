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
import { DollarSign, Settings, CheckCircle, Save } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Commission {
  id: string
  agent: { name: string }
  unit: { unit_number: string; project: { project_name: string } }
  amount: number
  status: string
  settled_at: string | null
}

interface CommissionConfig {
  globalRate: number
  projectOverrides: Array<{ projectId: string; projectName: string; rate: number }>
  agentOverrides: Array<{ agentId: string; agentName: string; rate: number }>
}

type TabType = 'logs' | 'config'

function tabStyle(active: boolean) {
  return {
    padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    border: 'none', cursor: 'pointer', transition: 'background 0.15s',
    background: active ? 'white' : 'transparent',
    color: active ? '#1e3c6e' : '#64748b',
    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
  } as const
}

export default function CommissionsPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<TabType>('logs')
  const [globalRate, setGlobalRate] = useState('')

  const { data: commissions = [], isLoading } = useQuery<Commission[]>({
    queryKey: ['admin-commissions'],
    queryFn: async () => {
      const r = await api.get('/commissions')
      return Array.isArray(r.data) ? r.data : []
    },
  })

  const { data: config } = useQuery<CommissionConfig>({
    queryKey: ['commission-config'],
    queryFn: async () => {
      const r = await api.get('/admin/commission-config')
      return r.data as CommissionConfig
    },
    enabled: tab === 'config',
  })

  const payMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/commissions/${id}/pay`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-commissions'] })
      toast.success('Commission marked as paid')
    },
    onError: () => toast.error('Failed to mark as paid'),
  })

  const updateGlobalMutation = useMutation({
    mutationFn: (rate: number) => api.patch('/admin/commission-config/global', { rate }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['commission-config'] })
      toast.success('Global rate updated')
    },
    onError: () => toast.error('Failed to update rate'),
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`.tbl-row:hover { background: #f8fafc; } .tbl-row:last-child { border-bottom: none; }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: '#ecfdf5', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={18} style={{ color: '#059669' }} />
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Commissions</h2>
            {!isLoading && <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{commissions.length} records</p>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 2, background: '#f1f5f9', borderRadius: 10, padding: 4 }}>
          {(['logs', 'config'] as TabType[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={tabStyle(tab === t)}>
              {t === 'logs' ? 'Commission Logs' : 'Configuration'}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Tab */}
      {tab === 'logs' && (
        <>
          {isLoading && (
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, height: 240 }} className="animate-pulse" />
          )}
          {!isLoading && commissions.length === 0 && (
            <EmptyState icon={DollarSign} title="No commissions yet" description="Commissions are generated automatically when bookings are confirmed" />
          )}
          {!isLoading && commissions.length > 0 && (
            <Table>
              <Thead>
                <tr>
                  <Th>Agent</Th>
                  <Th>Unit</Th>
                  <Th>Project</Th>
                  <Th>Rate</Th>
                  <Th>Amount</Th>
                  <Th>Status</Th>
                  <Th>Date</Th>
                  <Th>Action</Th>
                </tr>
              </Thead>
              <Tbody>
                {commissions.map((c) => (
                  <Tr key={c.id}>
                    <Td><span style={{ fontWeight: 600, color: '#0f172a' }}>{c.agent?.name ?? '—'}</span></Td>
                    <Td>{c.unit?.unit_number ?? '—'}</Td>
                    <Td>{c.unit?.project?.project_name ?? '—'}</Td>
                    <Td>—</Td>
                    <Td><span style={{ fontWeight: 600, color: '#059669' }}>{formatCurrency(c.amount)}</span></Td>
                    <Td><Badge status={c.status} /></Td>
                    <Td>{c.settled_at ? formatDate(c.settled_at) : '—'}</Td>
                    <Td>
                      {c.status === 'Unpaid' && (
                        <Button size="sm" variant="success" onClick={() => payMutation.mutate(c.id)} loading={payMutation.isPending}>
                          <CheckCircle size={13} /> Mark Paid
                        </Button>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </>
      )}

      {/* Config Tab */}
      {tab === 'config' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Global Rate */}
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Settings size={16} style={{ color: '#1e3c6e' }} />
              <span style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>Global Commission Rate</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
              <div style={{ maxWidth: 220 }}>
                <Input
                  label="Rate (%)"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder={config ? String(config.globalRate) : '5'}
                  value={globalRate}
                  onChange={(e) => setGlobalRate(e.target.value)}
                />
              </div>
              <Button onClick={() => updateGlobalMutation.mutate(Number.parseFloat(globalRate))} loading={updateGlobalMutation.isPending} disabled={!globalRate}>
                <Save size={14} /> Save
              </Button>
            </div>
            {config && <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>Current rate: {config.globalRate}%</p>}
          </div>

          {/* Project Overrides */}
          {config?.projectOverrides && config.projectOverrides.length > 0 && (
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', padding: 24 }}>
              <p style={{ fontWeight: 600, color: '#0f172a', fontSize: 14, margin: '0 0 12px' }}>Project Overrides</p>
              <Table>
                <Thead><tr><Th>Project</Th><Th>Rate</Th></tr></Thead>
                <Tbody>
                  {config.projectOverrides.map((o) => (
                    <Tr key={o.projectId}><Td>{o.projectName}</Td><Td>{o.rate}%</Td></Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          )}

          {/* Agent Overrides */}
          {config?.agentOverrides && config.agentOverrides.length > 0 && (
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', padding: 24 }}>
              <p style={{ fontWeight: 600, color: '#0f172a', fontSize: 14, margin: '0 0 12px' }}>Agent Overrides</p>
              <Table>
                <Thead><tr><Th>Agent</Th><Th>Rate</Th></tr></Thead>
                <Tbody>
                  {config.agentOverrides.map((o) => (
                    <Tr key={o.agentId}><Td>{o.agentName}</Td><Td>{o.rate}%</Td></Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
