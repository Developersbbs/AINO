'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { Building2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Unit {
  id: string
  unitNumber: string
  floor: number
  facing: string
  size: number
  price: number
  type: string
  status: 'available' | 'booked' | 'sold'
}

interface ProjectDetail {
  id: string
  name: string
  location: string
  status: string
  totalUnits: number
  availableUnits: number
  description?: string
  priceMin?: number
  priceMax?: number
}

export default function OwnerProjectDetailPage() {
  const { id } = useParams<{ id: string }>()

  const { data: project, isLoading: projectLoading } = useQuery<ProjectDetail>({
    queryKey: ['owner-project', id],
    queryFn: () => api.get(`/owner/projects/${id}`).then((r) => r.data),
  })

  const { data: units = [], isLoading: unitsLoading } = useQuery<Unit[]>({
    queryKey: ['owner-project-units', id],
    queryFn: () => api.get(`/projects/${id}/units`).then((r) => {
      const d = r.data
      return Array.isArray(d) ? d : (d?.units ?? [])
    }),
  })

  const isLoading = projectLoading || unitsLoading

  if (isLoading) {
    return <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, height: 256 }} className="animate-pulse" />
  }

  if (!project) return null

  const available = units.filter((u) => u.status === 'available')
  const booked = units.filter((u) => u.status === 'booked')
  const sold = units.filter((u) => u.status === 'sold')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`.tbl-row:hover { background: #f8fafc; } .tbl-row:last-child { border-bottom: none; }`}</style>

      {/* Header */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>{project.name}</h1>
          <Badge status={project.status} />
        </div>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{project.location}</p>
        {project.description && (
          <p style={{ fontSize: 13, color: '#374151', margin: '8px 0 0' }}>{project.description}</p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, paddingTop: 16, marginTop: 16, borderTop: '1px solid #f1f5f9' }}>
          <div>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 }}>{project.totalUnits}</p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Available</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#059669', margin: 0 }}>{available.length}</p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Booked</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#d97706', margin: 0 }}>{booked.length}</p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sold</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#ef4444', margin: 0 }}>{sold.length}</p>
          </div>
        </div>
      </div>

      {/* Units */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>Units</h2>
        </div>
        {units.length === 0 ? (
          <EmptyState icon={Building2} title="No units found" />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Unit</Th><Th>Type</Th><Th>Floor</Th><Th>Facing</Th><Th>Size</Th><Th>Price</Th><Th>Status</Th>
              </tr>
            </Thead>
            <Tbody>
              {units.map((unit) => (
                <Tr key={unit.id}>
                  <Td><span style={{ fontWeight: 600, color: '#0f172a' }}>{unit.unitNumber}</span></Td>
                  <Td>{unit.type}</Td>
                  <Td>{unit.floor}</Td>
                  <Td>{unit.facing}</Td>
                  <Td>{unit.size.toLocaleString()} sqft</Td>
                  <Td><span style={{ fontWeight: 600, color: '#059669' }}>{formatCurrency(unit.price)}</span></Td>
                  <Td><Badge status={unit.status} /></Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>
    </div>
  )
}
