'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { ClipboardList, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

interface AuditLog {
  id: string
  action: string
  actor_name: string
  created_at: string
}

interface AuditResponse {
  logs: AuditLog[]
  total: number
  page: number
  pageSize: number
}

const PAGE_SIZE = 20

export default function AuditLogPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery<AuditResponse>({
    queryKey: ['audit-log', page],
    queryFn: async () => {
      const r = await api.get('/admin/audit-log', { params: { page, pageSize: PAGE_SIZE } })
      const d = r.data as AuditResponse
      return { logs: d?.logs ?? [], total: d?.total ?? 0, page: d?.page ?? 1, pageSize: d?.pageSize ?? PAGE_SIZE }
    },
  })

  const logs = data?.logs ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const filtered = logs.filter(
    (l) =>
      l.actor_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.action?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`.tbl-row:hover { background: #f8fafc; } .tbl-row:last-child { border-bottom: none; }`}</style>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: '#f8fafc', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0' }}>
            <ClipboardList size={18} style={{ color: '#64748b' }} />
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Audit Log</h2>
            <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{total} total entries</p>
          </div>
        </div>
        <Input
          placeholder="Search logs…"
          leftAddon={<Search size={13} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Content */}
      {isLoading && (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, height: 240 }} className="animate-pulse" />
      )}
      {!isLoading && filtered.length === 0 && (
        <EmptyState icon={ClipboardList} title="No audit logs found" description="Platform actions will be recorded here" />
      )}
      {!isLoading && filtered.length > 0 && (
        <Table>
          <Thead>
            <tr>
              <Th>Actor</Th>
              <Th>Action</Th>
              <Th>Timestamp</Th>
            </tr>
          </Thead>
          <Tbody>
            {filtered.map((log) => (
              <Tr key={log.id}>
                <Td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#64748b', flexShrink: 0 }}>
                      {log.actor_name?.charAt(0)?.toUpperCase() ?? '?'}
                    </div>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{log.actor_name ?? '—'}</span>
                  </div>
                </Td>
                <Td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', background: '#f1f5f9', borderRadius: 6, fontSize: 11, fontWeight: 600, color: '#374151', fontFamily: 'monospace' }}>
                    {log.action}
                  </span>
                </Td>
                <Td>{log.created_at ? formatDateTime(log.created_at) : '—'}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Page {page} of {totalPages}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft size={14} /> Prev
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Next <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
