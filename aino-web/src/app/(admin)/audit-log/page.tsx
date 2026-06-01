'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { ClipboardList, Search } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

interface AuditLog {
  id: string
  action: string
  actor_name: string
  target_type?: string
  target_name?: string
  created_at: string
}

export default function AuditLogPage() {
  const [search, setSearch] = useState('')

  const { data: logs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ['audit-log'],
    queryFn: async () => {
      const r = await api.get('/admin/audit-log')
      return Array.isArray(r.data) ? r.data : []
    },
  })

  const filtered = logs.filter(
    (l) =>
      l.actor_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.action?.toLowerCase().includes(search.toLowerCase()) ||
      l.target_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 'auto' }}>
          <div style={{ width: 36, height: 36, background: '#f8fafc', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0' }}>
            <ClipboardList size={18} style={{ color: '#64748b' }} />
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Audit Log</h2>
            {!isLoading && <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{logs.length} entries</p>}
          </div>
        </div>
        <div style={{ width: 240 }}>
          <Input
            placeholder="Search by actor or action…"
            leftAddon={<Search size={13} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      {isLoading && (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, height: 240 }} className="animate-pulse" />
      )}
      {!isLoading && filtered.length === 0 && (
        <EmptyState
          icon={ClipboardList}
          title="No audit logs found"
          description={search ? 'No entries match your search' : 'Platform actions will appear here'}
        />
      )}
      {!isLoading && filtered.length > 0 && (
        <Table>
          <Thead>
            <tr>
              <Th>Actor</Th>
              <Th>Action</Th>
              <Th>Target</Th>
              <Th>Timestamp</Th>
            </tr>
          </Thead>
          <Tbody>
            {filtered.map((log) => (
              <Tr key={log.id}>
                <Td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#4f46e5', flexShrink: 0 }}>
                      {log.actor_name?.charAt(0)?.toUpperCase() ?? '?'}
                    </div>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{log.actor_name ?? '—'}</span>
                  </div>
                </Td>
                <Td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', background: '#f1f5f9', borderRadius: 6, fontSize: 11, fontWeight: 600, color: '#374151', fontFamily: 'monospace' }}>
                    {log.action}
                  </span>
                </Td>
                <Td>
                  {log.target_name ? (
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{log.target_name}</span>
                      {log.target_type && (
                        <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 6 }}>({log.target_type})</span>
                      )}
                    </div>
                  ) : '—'}
                </Td>
                <Td>{log.created_at ? formatDateTime(log.created_at) : '—'}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  )
}
