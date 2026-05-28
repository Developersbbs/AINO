'use client'

import { useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, Upload, Building2, FileText } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

interface Unit {
  id: string
  unitNumber: string
  floor: number
  facing: string
  size: number
  price: number
  status: 'available' | 'booked' | 'sold'
  type: string
}

interface ProjectDetail {
  id: string
  name: string
  location: string
  description: string
  status: string
  totalUnits: number
  availableUnits: number
  priceMin?: number
  priceMax?: number
  owner?: { id: string; name: string }
  layoutUrl?: string
  units: Unit[]
  documents: Array<{ id: string; name: string; url: string; createdAt: string }>
}

const unitSchema = z.object({
  unitNumber: z.string().min(1, 'Required'),
  floor: z.coerce.number().min(0),
  facing: z.string().min(1, 'Required'),
  size: z.coerce.number().min(1),
  price: z.coerce.number().min(1),
  type: z.string().min(1, 'Required'),
})

type UnitData = z.infer<typeof unitSchema>

type TabType = 'overview' | 'units' | 'documents'

function tabStyle(active: boolean) {
  return {
    padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    border: 'none', cursor: 'pointer', transition: 'background 0.15s',
    background: active ? 'white' : 'transparent',
    color: active ? '#1e3c6e' : '#64748b',
    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
  } as const
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [tab, setTab] = useState<TabType>('overview')
  const [addUnitOpen, setAddUnitOpen] = useState(false)
  const layoutInputRef = useRef<HTMLInputElement>(null)
  const docsInputRef = useRef<HTMLInputElement>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)

  const { data: project, isLoading } = useQuery<ProjectDetail>({
    queryKey: ['project', id],
    queryFn: () => api.get(`/projects/${id}`).then((r) => r.data),
  })

  const { data: units = [] } = useQuery<Unit[]>({
    queryKey: ['project-units', id],
    queryFn: () => api.get(`/projects/${id}/units`).then((r) => {
      const d = r.data
      return Array.isArray(d) ? d : (d?.units ?? [])
    }),
  })

  const addUnitMutation = useMutation({
    mutationFn: (data: UnitData) => api.post('/units', { ...data, projectId: id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-units', id] })
      setAddUnitOpen(false)
      reset()
      toast.success('Unit added')
    },
    onError: () => toast.error('Failed to add unit'),
  })

  const uploadLayoutMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData()
      fd.append('layout', file)
      return api.post(`/projects/${id}/layout`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project', id] }); toast.success('Layout uploaded') },
    onError: () => toast.error('Failed to upload layout'),
  })

  const uploadDocsMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData()
      fd.append('document', file)
      return api.post(`/projects/${id}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project', id] }); toast.success('Document uploaded') },
    onError: () => toast.error('Failed to upload document'),
  })

  const bulkCsvMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData()
      fd.append('file', file)
      return api.post('/units/bulk', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['project-units', id] })
      toast.success(`${res.data?.created ?? 'Units'} added from CSV`)
    },
    onError: () => toast.error('Failed to import CSV'),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UnitData>({ resolver: zodResolver(unitSchema) })

  if (isLoading) {
    return <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, height: 384 }} className="animate-pulse" />
  }

  if (!project) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`.tbl-row:hover { background: #f8fafc; } .tbl-row:last-child { border-bottom: none; }`}</style>

      {/* Header Card */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', padding: '20px 24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>{project.name}</h1>
              <Badge status={project.status} />
            </div>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{project.location}</p>
            {project.owner && <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>Owner: {project.owner.name}</p>}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button size="sm" variant="outline" onClick={() => layoutInputRef.current?.click()} loading={uploadLayoutMutation.isPending}>
              <Building2 size={14} /> Upload Layout
            </Button>
            <Button size="sm" variant="outline" onClick={() => docsInputRef.current?.click()} loading={uploadDocsMutation.isPending}>
              <Upload size={14} /> Upload Doc
            </Button>
            <input ref={layoutInputRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) { uploadLayoutMutation.mutate(f) } e.target.value = '' }} />
            <input ref={docsInputRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) { uploadDocsMutation.mutate(f) } e.target.value = '' }} />
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
          <div>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Units</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>{project.totalUnits}</p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Available</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#059669', margin: 0 }}>{project.availableUnits}</p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Price Range</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: 0 }}>
              {project.priceMin && project.priceMax
                ? `${formatCurrency(project.priceMin)} – ${formatCurrency(project.priceMax)}`
                : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, background: '#f1f5f9', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {(['overview', 'units', 'documents'] as TabType[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={tabStyle(tab === t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', padding: 24 }}>
          <p style={{ fontWeight: 600, color: '#0f172a', margin: '0 0 10px' }}>Description</p>
          <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, margin: 0 }}>{project.description ?? 'No description provided.'}</p>
          {project.layoutUrl && (
            <div style={{ marginTop: 20 }}>
              <p style={{ fontWeight: 600, color: '#0f172a', margin: '0 0 10px' }}>Layout</p>
              <img src={project.layoutUrl} alt="Layout" style={{ borderRadius: 10, border: '1px solid #e2e8f0', maxWidth: '100%', maxHeight: 384, objectFit: 'contain' }} />
            </div>
          )}
        </div>
      )}

      {/* Units Tab */}
      {tab === 'units' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button size="sm" variant="outline" onClick={() => csvInputRef.current?.click()} loading={bulkCsvMutation.isPending}>
              <Upload size={14} /> Bulk CSV
            </Button>
            <Button size="sm" onClick={() => setAddUnitOpen(true)}><Plus size={14} /> Add Unit</Button>
            <input ref={csvInputRef} type="file" accept=".csv" style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) { bulkCsvMutation.mutate(f) } e.target.value = '' }} />
          </div>
          {units.length === 0 ? (
            <EmptyState icon={Building2} title="No units yet" description="Add units or bulk import via CSV" />
          ) : (
            <Table>
              <Thead>
                <tr>
                  <Th>Unit No.</Th><Th>Type</Th><Th>Floor</Th><Th>Facing</Th><Th>Size (sqft)</Th><Th>Price</Th><Th>Status</Th>
                </tr>
              </Thead>
              <Tbody>
                {units.map((unit) => (
                  <Tr key={unit.id}>
                    <Td><span style={{ fontWeight: 600, color: '#0f172a' }}>{unit.unitNumber}</span></Td>
                    <Td>{unit.type}</Td>
                    <Td>{unit.floor}</Td>
                    <Td>{unit.facing}</Td>
                    <Td>{unit.size.toLocaleString()}</Td>
                    <Td><span style={{ fontWeight: 600, color: '#059669' }}>{formatCurrency(unit.price)}</span></Td>
                    <Td><Badge status={unit.status} /></Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </div>
      )}

      {/* Documents Tab */}
      {tab === 'documents' && (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', padding: 24 }}>
          {(!project.documents || project.documents.length === 0) && (
            <EmptyState icon={FileText} title="No documents" description="Upload project documents" />
          )}
          {project.documents && project.documents.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {project.documents.map((doc) => (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', border: '1px solid #f1f5f9', borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FileText size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', margin: 0 }}>{doc.name}</p>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{formatDate(doc.createdAt)}</p>
                    </div>
                  </div>
                  <a href={doc.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#1e3c6e', fontWeight: 600, textDecoration: 'none' }}>
                    Download
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Unit Modal */}
      <Modal open={addUnitOpen} onClose={() => setAddUnitOpen(false)} title="Add Unit" size="md">
        <form onSubmit={handleSubmit((d) => addUnitMutation.mutate(d))} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Unit Number" error={errors.unitNumber?.message} {...register('unitNumber')} />
            <Input label="Type (e.g. 2BHK)" error={errors.type?.message} {...register('type')} />
            <Input label="Floor" type="number" error={errors.floor?.message} {...register('floor')} />
            <Input label="Facing" placeholder="North/South/East/West" error={errors.facing?.message} {...register('facing')} />
            <Input label="Size (sqft)" type="number" error={errors.size?.message} {...register('size')} />
            <Input label="Price (₹)" type="number" error={errors.price?.message} {...register('price')} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
            <Button variant="ghost" type="button" onClick={() => setAddUnitOpen(false)}>Cancel</Button>
            <Button type="submit" loading={addUnitMutation.isPending}>Add Unit</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
