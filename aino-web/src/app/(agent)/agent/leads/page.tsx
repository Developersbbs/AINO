'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatCard } from '@/components/ui/StatCard'
import { toast } from 'sonner'
import { Share2, Copy, Phone, Users } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface RawLead {
  id: string
  share_token: string
  shareUrl?: string
  customer_name?: string
  customer_phone?: string
  first_click_at?: string | null
  is_locked: boolean
  project: { id: string; project_name: string; location: string }
}

interface Lead {
  id: string
  shareToken: string
  shareUrl: string
  clientName: string
  clientPhone: string
  firstClickAt: string | null
  isLocked: boolean
  project: { id: string; name: string; location: string }
}

function mapLead(l: RawLead): Lead {
  const base = process.env.NEXT_PUBLIC_SHARE_URL ?? globalThis.location?.origin ?? ''
  return {
    id: l.id,
    shareToken: l.share_token,
    shareUrl: `${base.replace(/\/$/, '')}/${l.share_token}`,
    clientName: l.customer_name ?? '—',
    clientPhone: l.customer_phone ?? '—',
    firstClickAt: l.first_click_at ?? null,
    isLocked: l.is_locked,
    project: {
      id: l.project.id,
      name: l.project.project_name,
      location: l.project.location,
    },
  }
}

export default function AgentLeadsPage() {
  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ['agent-leads'],
    queryFn: () =>
      api.get('/leads/my').then((r) => {
        const list: RawLead[] = Array.isArray(r.data) ? r.data : []
        return list.map(mapLead)
      }),
  })

  function copyLink(lead: Lead) {
    navigator.clipboard.writeText(lead.shareUrl)
    toast.success('Link copied!')
  }

  const clicked = leads.filter((l) => l.firstClickAt !== null).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`.tbl-row:hover { background: #f8fafc; } .tbl-row:last-child { border-bottom: none; }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, background: '#eff6ff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Share2 size={18} style={{ color: '#2563eb' }} />
        </div>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>My Leads</h2>
          {!isLoading && <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{leads.length} total</p>}
        </div>
      </div>

      {/* Stats */}
      {!isLoading && leads.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <StatCard label="Total Leads" value={String(leads.length)} icon={Users} iconBg="#eff6ff" iconColor="#2563eb" />
          <StatCard label="Link Opened" value={String(clicked)} icon={Share2} iconBg="#f0fdf4" iconColor="#059669" />
          <StatCard label="Not Yet Opened" value={String(leads.length - clicked)} icon={Phone} iconBg="#fffbeb" iconColor="#d97706" />
        </div>
      )}

      {isLoading && (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, height: 240 }} className="animate-pulse" />
      )}

      {!isLoading && leads.length === 0 && (
        <EmptyState icon={Share2} title="No leads yet" description="Go to Projects and generate share links to start tracking leads" />
      )}

      {!isLoading && leads.length > 0 && (
        <Table>
          <Thead>
            <tr>
              <Th>Project</Th>
              <Th>Client</Th>
              <Th>Phone</Th>
              <Th>First Opened</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </Thead>
          <Tbody>
            {leads.map((lead) => (
              <Tr key={lead.id}>
                <Td>
                  <div>
                    <p style={{ fontWeight: 600, color: '#0f172a', margin: 0, fontSize: 13 }}>{lead.project.name}</p>
                    <p style={{ color: '#94a3b8', margin: 0, fontSize: 11 }}>{lead.project.location}</p>
                  </div>
                </Td>
                <Td>{lead.clientName}</Td>
                <Td>
                  {lead.clientPhone === '—'
                    ? <span style={{ color: '#94a3b8' }}>—</span>
                    : <span style={{ fontFamily: 'monospace', fontSize: 12 }}>+91 {lead.clientPhone}</span>}
                </Td>
                <Td>{lead.firstClickAt ? formatDate(lead.firstClickAt) : <span style={{ color: '#94a3b8', fontSize: 12 }}>Not opened</span>}</Td>
                <Td>
                  <Badge status={lead.firstClickAt ? 'active' : 'pending'} />
                </Td>
                <Td>
                  <Button size="sm" variant="outline" onClick={() => copyLink(lead)}>
                    <Copy size={13} /> Copy Link
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  )
}
