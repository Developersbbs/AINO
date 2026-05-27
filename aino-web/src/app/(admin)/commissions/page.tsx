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
import { useForm } from 'react-hook-form'

interface Commission {
  id: string
  agent: { name: string }
  booking: { unit: string; project: string }
  amount: number
  rate: number
  status: 'pending' | 'paid'
  createdAt: string
}

interface CommissionConfig {
  globalRate: number
  projectOverrides: Array<{ projectId: string; projectName: string; rate: number }>
  agentOverrides: Array<{ agentId: string; agentName: string; rate: number }>
}

type TabType = 'config' | 'logs'

export default function CommissionsPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<TabType>('logs')
  const [globalRate, setGlobalRate] = useState('')

  const { data: commissions = [], isLoading } = useQuery<Commission[]>({
    queryKey: ['admin-commissions'],
    queryFn: () => api.get('/commissions').then((r) => r.data?.commissions ?? r.data),
  })

  const { data: config } = useQuery<CommissionConfig>({
    queryKey: ['commission-config'],
    queryFn: () => api.get('/admin/commission-config').then((r) => r.data),
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
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {(['logs', 'config'] as TabType[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
              tab === t
                ? 'bg-white text-[#1e3c6e] shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'logs' ? 'Commission Logs' : 'Configuration'}
          </button>
        ))}
      </div>

      {/* Logs Tab */}
      {tab === 'logs' && (
        <div>
          {isLoading ? (
            <div className="bg-white border border-slate-200 rounded-xl h-64 animate-pulse" />
          ) : commissions.length === 0 ? (
            <EmptyState icon={DollarSign} title="No commissions yet" />
          ) : (
            <Table>
              <Thead>
                <tr>
                  <Th>Agent</Th>
                  <Th>Booking</Th>
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
                    <Td><span className="font-medium">{c.agent?.name}</span></Td>
                    <Td>
                      <div>
                        <p className="text-sm">{c.booking?.unit}</p>
                        <p className="text-xs text-slate-400">{c.booking?.project}</p>
                      </div>
                    </Td>
                    <Td>{c.rate}%</Td>
                    <Td className="font-semibold text-emerald-700">{formatCurrency(c.amount)}</Td>
                    <Td><Badge status={c.status} /></Td>
                    <Td>{formatDate(c.createdAt)}</Td>
                    <Td>
                      {c.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => payMutation.mutate(c.id)}
                          loading={payMutation.isPending}
                        >
                          <CheckCircle size={13} /> Mark Paid
                        </Button>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </div>
      )}

      {/* Config Tab */}
      {tab === 'config' && (
        <div className="space-y-4">
          {/* Global Rate */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings size={18} className="text-[#1e3c6e]" />
              <h2 className="font-semibold text-slate-900">Global Commission Rate</h2>
            </div>
            <div className="flex items-end gap-3">
              <div className="flex-1 max-w-xs">
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
              <Button
                onClick={() => updateGlobalMutation.mutate(parseFloat(globalRate))}
                loading={updateGlobalMutation.isPending}
                disabled={!globalRate}
              >
                <Save size={14} /> Save
              </Button>
            </div>
            {config && (
              <p className="text-sm text-slate-400 mt-2">Current rate: {config.globalRate}%</p>
            )}
          </div>

          {/* Project Overrides */}
          {config?.projectOverrides && config.projectOverrides.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
              <h2 className="font-semibold text-slate-900 mb-3">Project Overrides</h2>
              <Table>
                <Thead>
                  <tr>
                    <Th>Project</Th>
                    <Th>Rate</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {config.projectOverrides.map((o) => (
                    <Tr key={o.projectId}>
                      <Td>{o.projectName}</Td>
                      <Td>{o.rate}%</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          )}

          {/* Agent Overrides */}
          {config?.agentOverrides && config.agentOverrides.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
              <h2 className="font-semibold text-slate-900 mb-3">Agent Overrides</h2>
              <Table>
                <Thead>
                  <tr>
                    <Th>Agent</Th>
                    <Th>Rate</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {config.agentOverrides.map((o) => (
                    <Tr key={o.agentId}>
                      <Td>{o.agentName}</Td>
                      <Td>{o.rate}%</Td>
                    </Tr>
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
