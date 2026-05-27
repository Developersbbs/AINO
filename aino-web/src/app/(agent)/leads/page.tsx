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
    queryFn: () => api.get('/leads/my').then((r) => r.data?.leads ?? r.data),
  })

  function copyLink(lead: Lead) {
    const url =
      lead.shareUrl ??
      `${process.env.NEXT_PUBLIC_SHARE_URL ?? window.location.origin}/${lead.shareToken}`
    navigator.clipboard.writeText(url)
    toast.success('Link copied!')
  }

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-xl h-64 animate-pulse" />
      ) : leads.length === 0 ? (
        <EmptyState
          icon={Share2}
          title="No leads yet"
          description="Go to Projects and generate share links to start tracking leads"
        />
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Project</Th>
              <Th>Share Token</Th>
              <Th>Clicks</Th>
              <Th>Conversions</Th>
              <Th>Created</Th>
              <Th>Actions</Th>
            </tr>
          </Thead>
          <Tbody>
            {leads.map((lead) => (
              <Tr key={lead.id}>
                <Td>
                  <div>
                    <p className="font-medium text-slate-900">{lead.project?.name}</p>
                    <p className="text-xs text-slate-400">{lead.project?.location}</p>
                  </div>
                </Td>
                <Td>
                  <code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-700">
                    {lead.shareToken}
                  </code>
                </Td>
                <Td>
                  <span className="font-semibold text-slate-900">{lead.clicks ?? 0}</span>
                </Td>
                <Td>
                  <span className="font-semibold text-emerald-600">{lead.conversions ?? 0}</span>
                </Td>
                <Td>{formatDate(lead.createdAt)}</Td>
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
