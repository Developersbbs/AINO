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
    queryFn: () => api.get(`/projects/${id}/units`).then((r) => r.data?.units ?? r.data),
  })

  const isLoading = projectLoading || unitsLoading

  if (isLoading) {
    return <div className="bg-white border border-slate-200 rounded-xl h-64 animate-pulse" />
  }

  if (!project) return null

  const available = units.filter((u) => u.status === 'available')
  const booked = units.filter((u) => u.status === 'booked')
  const sold = units.filter((u) => u.status === 'sold')

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-xl font-bold text-slate-900">{project.name}</h1>
          <Badge status={project.status} />
        </div>
        <p className="text-slate-500 text-sm">{project.location}</p>
        {project.description && (
          <p className="text-slate-600 text-sm mt-2">{project.description}</p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100">
          <div>
            <p className="text-xs text-slate-400">Total</p>
            <p className="text-xl font-bold text-slate-900">{project.totalUnits}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Available</p>
            <p className="text-xl font-bold text-emerald-600">{available.length}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Booked</p>
            <p className="text-xl font-bold text-amber-500">{booked.length}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Sold</p>
            <p className="text-xl font-bold text-red-500">{sold.length}</p>
          </div>
        </div>
      </div>

      {/* Unit Grid */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Units</h2>
        </div>
        {units.length === 0 ? (
          <EmptyState icon={Building2} title="No units found" />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Unit</Th>
                <Th>Type</Th>
                <Th>Floor</Th>
                <Th>Facing</Th>
                <Th>Size</Th>
                <Th>Price</Th>
                <Th>Status</Th>
              </tr>
            </Thead>
            <Tbody>
              {units.map((unit) => (
                <Tr key={unit.id}>
                  <Td><span className="font-medium">{unit.unitNumber}</span></Td>
                  <Td>{unit.type}</Td>
                  <Td>{unit.floor}</Td>
                  <Td>{unit.facing}</Td>
                  <Td>{unit.size.toLocaleString()} sqft</Td>
                  <Td>{formatCurrency(unit.price)}</Td>
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
