'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { toast } from 'sonner'
import { Share2, Copy } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Lead {
  id: string
  shareToken: string
  shareUrl?: string
  project: { name: string; location: string }
  clicks: number
  conversions: number
  createdAt: string
}

export default function AgentLeadsPage() {
  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ['agent-leads'],
    queryFn: () => api.get('/leads/my').then((r) => (Array.isArray(r.data) ? r.data : [])),
  })

  function copyLink(lead: Lead) {
    const url =
      lead.shareUrl ??
      `${process.env.NEXT_PUBLIC_SHARE_URL ?? globalThis.location.origin}/${lead.shareToken}`
    navigator.clipboard.writeText(url)
    toast.success('Link copied!')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`.tbl-row:hover { background: #f8fafc; } .tbl-row:last-child { border-bottom: none; }`}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, background: '#eff6ff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Share2 size={18} style={{ color: '#2563eb' }} />
        </div>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>My Leads</h2>
          {!isLoading && <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{leads.length} total</p>}
        </div>
      </div>

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
              <Th>Project</Th><Th>Share Token</Th><Th>Clicks</Th><Th>Conversions</Th><Th>Created</Th><Th>Actions</Th>
            </tr>
          </Thead>
          <Tbody>
            {leads.map((lead) => (
              <Tr key={lead.id}>
                <Td>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, color: '#0f172a' }}>{lead.project?.name ?? '—'}</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>{lead.project?.location}</p>
                  </div>
                </Td>
                <Td>
                  <span style={{ fontSize: 11, background: '#f1f5f9', padding: '2px 8px', borderRadius: 4, fontFamily: 'monospace', color: '#374151' }}>
                    {lead.shareToken}
                  </span>
                </Td>
                <Td><span style={{ fontWeight: 600, color: '#0f172a' }}>{lead.clicks ?? 0}</span></Td>
                <Td><span style={{ fontWeight: 600, color: '#059669' }}>{lead.conversions ?? 0}</span></Td>
                <Td>{lead.createdAt ? formatDate(lead.createdAt) : '—'}</Td>
                <Td>
                  <Button size="sm" variant="ghost" onClick={() => copyLink(lead)}>
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
