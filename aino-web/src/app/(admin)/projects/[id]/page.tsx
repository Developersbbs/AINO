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
import { Plus, Upload, Image, Building2, FileText } from 'lucide-react'
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
    queryFn: () => api.get(`/projects/${id}/units`).then((r) => r.data?.units ?? r.data),
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
      return api.post(`/projects/${id}/layout`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', id] })
      toast.success('Layout uploaded')
    },
    onError: () => toast.error('Failed to upload layout'),
  })

  const uploadDocsMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData()
      fd.append('document', file)
      return api.post(`/projects/${id}/documents`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', id] })
      toast.success('Document uploaded')
    },
    onError: () => toast.error('Failed to upload document'),
  })

  const bulkCsvMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData()
      fd.append('file', file)
      return api.post('/units/bulk', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['project-units', id] })
      toast.success(`${res.data?.created ?? 'Units'} added from CSV`)
    },
    onError: () => toast.error('Failed to import CSV'),
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UnitData>({ resolver: zodResolver(unitSchema) })

  if (isLoading) {
    return <div className="bg-white border border-slate-200 rounded-xl h-96 animate-pulse" />
  }

  if (!project) return null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-slate-900">{project.name}</h1>
              <Badge status={project.status} />
            </div>
            <p className="text-slate-500 text-sm">{project.location}</p>
            {project.owner && (
              <p className="text-xs text-slate-400 mt-1">Owner: {project.owner.name}</p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => layoutInputRef.current?.click()}
              loading={uploadLayoutMutation.isPending}
            >
              <Image size={14} /> Upload Layout
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => docsInputRef.current?.click()}
              loading={uploadDocsMutation.isPending}
            >
              <Upload size={14} /> Upload Doc
            </Button>
            <input
              ref={layoutInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) uploadLayoutMutation.mutate(f)
                e.target.value = ''
              }}
            />
            <input
              ref={docsInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) uploadDocsMutation.mutate(f)
                e.target.value = ''
              }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
          <div>
            <p className="text-xs text-slate-400">Total Units</p>
            <p className="text-lg font-bold text-slate-900">{project.totalUnits}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Available</p>
            <p className="text-lg font-bold text-emerald-600">{project.availableUnits}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Price Range</p>
            <p className="text-sm font-semibold text-slate-900">
              {project.priceMin && project.priceMax
                ? `${formatCurrency(project.priceMin)} – ${formatCurrency(project.priceMax)}`
                : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {(['overview', 'units', 'documents'] as TabType[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              tab === t
                ? 'bg-white text-[#1e3c6e] shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-slate-900 mb-3">Description</h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            {project.description ?? 'No description provided.'}
          </p>
          {project.layoutUrl && (
            <div className="mt-4">
              <h2 className="font-semibold text-slate-900 mb-3">Layout</h2>
              <img
                src={project.layoutUrl}
                alt="Layout"
                className="rounded-xl border border-slate-200 max-w-full max-h-96 object-contain"
              />
            </div>
          )}
        </div>
      )}

      {/* Units Tab */}
      {tab === 'units' && (
        <div className="space-y-3">
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => csvInputRef.current?.click()}
              loading={bulkCsvMutation.isPending}
            >
              <Upload size={14} /> Bulk CSV
            </Button>
            <Button size="sm" onClick={() => setAddUnitOpen(true)}>
              <Plus size={14} /> Add Unit
            </Button>
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) bulkCsvMutation.mutate(f)
                e.target.value = ''
              }}
            />
          </div>
          {units.length === 0 ? (
            <EmptyState icon={Building2} title="No units yet" description="Add units or bulk import via CSV" />
          ) : (
            <Table>
              <Thead>
                <tr>
                  <Th>Unit No.</Th>
                  <Th>Type</Th>
                  <Th>Floor</Th>
                  <Th>Facing</Th>
                  <Th>Size (sqft)</Th>
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
                    <Td>{unit.size.toLocaleString()}</Td>
                    <Td>{formatCurrency(unit.price)}</Td>
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
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          {(!project.documents || project.documents.length === 0) ? (
            <EmptyState icon={FileText} title="No documents" description="Upload project documents" />
          ) : (
            <div className="space-y-2">
              {project.documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <FileText size={16} className="text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{doc.name}</p>
                      <p className="text-xs text-slate-400">{formatDate(doc.createdAt)}</p>
                    </div>
                  </div>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[#1e3c6e] hover:underline font-medium"
                  >
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
        <form onSubmit={handleSubmit((d) => addUnitMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Unit Number" error={errors.unitNumber?.message} {...register('unitNumber')} />
            <Input label="Type (e.g. 2BHK)" error={errors.type?.message} {...register('type')} />
            <Input label="Floor" type="number" error={errors.floor?.message} {...register('floor')} />
            <Input label="Facing" placeholder="North/South/East/West" error={errors.facing?.message} {...register('facing')} />
            <Input label="Size (sqft)" type="number" error={errors.size?.message} {...register('size')} />
            <Input label="Price (₹)" type="number" error={errors.price?.message} {...register('price')} />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" type="button" onClick={() => setAddUnitOpen(false)}>Cancel</Button>
            <Button type="submit" loading={addUnitMutation.isPending}>Add Unit</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
