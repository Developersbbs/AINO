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
  user: { name: string; role: string }
  action: string
  resource: string
  resourceId?: string
  createdAt: string
  ipAddress?: string
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
    queryFn: () =>
      api
        .get('/admin/audit-log', { params: { page, pageSize: PAGE_SIZE } })
        .then((r) => r.data),
  })

  const logs = data?.logs ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const filtered = logs.filter(
    (l) =>
      l.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
      l.action?.toLowerCase().includes(search.toLowerCase()) ||
      l.resource?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <Input
          placeholder="Search logs..."
          leftAddon={<Search size={14} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <p className="text-sm text-slate-400">{total} total entries</p>
      </div>

      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-xl h-64 animate-pulse" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No audit logs found" />
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>User</Th>
              <Th>Role</Th>
              <Th>Action</Th>
              <Th>Resource</Th>
              <Th>IP Address</Th>
              <Th>Timestamp</Th>
            </tr>
          </Thead>
          <Tbody>
            {filtered.map((log) => (
              <Tr key={log.id}>
                <Td><span className="font-medium text-slate-900">{log.user?.name}</span></Td>
                <Td>
                  <span className="capitalize text-slate-600 text-xs">{log.user?.role}</span>
                </Td>
                <Td>
                  <code className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                    {log.action}
                  </code>
                </Td>
                <Td>
                  <span className="text-slate-600">{log.resource}</span>
                  {log.resourceId && (
                    <span className="text-slate-400 text-xs ml-1">#{log.resourceId.slice(0, 8)}</span>
                  )}
                </Td>
                <Td>{log.ipAddress ?? '—'}</Td>
                <Td className="text-slate-500">{formatDateTime(log.createdAt)}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between py-2">
          <p className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft size={14} /> Prev
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
