'use client'

import { useState, useRef, type ReactNode } from 'react'
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
  facing: string
  sqFt: number
  price: number
  status: string
  roadWidth?: number | null
  attributes?: Record<string, unknown> | null
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
  documents: Array<{ name: string; url: string; uploadedAt?: string; createdAt?: string }>
}

const unitSchema = z.object({
  unitNumber: z.string().min(1, 'Required'),
  sqFt: z.coerce.number().min(1, 'Required'),
  price: z.coerce.number().min(1, 'Required'),
  facing: z.string().optional(),
})

type UnitData = z.infer<typeof unitSchema>

type TabType = 'overview' | 'units' | 'documents'

const MAX_LAYOUT_MB = 4
const MAX_LAYOUT_BYTES = MAX_LAYOUT_MB * 1024 * 1024

function tabStyle(active: boolean) {
  return {
    padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    border: 'none', cursor: 'pointer', transition: 'background 0.15s',
    background: active ? 'white' : 'transparent',
    color: active ? '#1e3c6e' : '#64748b',
    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
  } as const
}

function mapUnit(u: Record<string, unknown>): Unit {
  return {
    id: u.id as string,
    unitNumber: (u.unit_number ?? u.unitNumber ?? '') as string,
    facing: (u.facing ?? '') as string,
    sqFt: ((u.sq_ft ?? u.sqFt ?? 0) as number),
    price: (u.price ?? 0) as number,
    status: (u.status ?? 'Available') as string,
    roadWidth: (u.road_width ?? u.roadWidth ?? null) as number | null,
    attributes: (u.attributes ?? null) as Record<string, unknown> | null,
  }
}

// Prefix relative paths with the backend origin so images/docs load correctly
// regardless of where the web app is hosted.
const BACKEND_ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/api\/?$/, '')

function toAbsoluteUrl(url: string | undefined): string | undefined {
  if (!url) return undefined
  if (url.startsWith('http')) return url
  return `${BACKEND_ORIGIN}${url}`
}

function mapProject(p: Record<string, unknown>): ProjectDetail {
  const rawUnits = (p.units as Record<string, unknown>[] | undefined) ?? []
  const prices = rawUnits.map((u) => (u.price ?? 0) as number).filter((v) => v > 0)
  const availableCount = rawUnits.filter((u) => {
    const s = u.status
    return typeof s === 'string' && s.toLowerCase() === 'available'
  }).length
  const docs = (p.documents as Array<Record<string, unknown>> | undefined) ?? []
  return {
    id: p.id as string,
    name: (p.project_name ?? p.name ?? '') as string,
    location: (p.location ?? '') as string,
    description: (p.description ?? '') as string,
    status: (p.status ?? '') as string,
    totalUnits: rawUnits.length,
    availableUnits: availableCount,
    priceMin: prices.length ? Math.min(...prices) : undefined,
    priceMax: prices.length ? Math.max(...prices) : undefined,
    owner: p.owner as ProjectDetail['owner'],
    layoutUrl: toAbsoluteUrl((p.layout_image_url ?? p.layoutUrl) as string | undefined),
    documents: docs.map((d) => ({
      name: (d.name ?? d.docType ?? 'Document') as string,
      url: toAbsoluteUrl(d.url as string) ?? '',
      uploadedAt: d.uploadedAt as string | undefined,
      createdAt: d.createdAt as string | undefined,
    })),
  }
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [tab, setTab] = useState<TabType>('overview')
  const [addUnitOpen, setAddUnitOpen] = useState(false)
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null)
  const layoutInputRef = useRef<HTMLInputElement>(null)
  const docsInputRef = useRef<HTMLInputElement>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)

  const { data: project, isLoading } = useQuery<ProjectDetail>({
    queryKey: ['project', id],
    queryFn: () => api.get(`/projects/${id}`).then((r) => mapProject(r.data as Record<string, unknown>)),
  })

  const { data: units = [] } = useQuery<Unit[]>({
    queryKey: ['project-units', id],
    queryFn: () => api.get(`/projects/${id}/units`).then((r) => {
      const raw = r.data as Record<string, unknown>
      const list: Record<string, unknown>[] = Array.isArray(raw) ? raw : ((raw?.units ?? []) as Record<string, unknown>[])
      return list.map(mapUnit)
    }),
  })

  const addUnitMutation = useMutation({
    mutationFn: (data: UnitData) => api.post('/units', {
      unitNumber: data.unitNumber,
      sqFt: data.sqFt,
      price: data.price,
      facing: data.facing || undefined,
      projectId: id,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-units', id] })
      qc.invalidateQueries({ queryKey: ['project', id] })
      setAddUnitOpen(false)
      reset()
      toast.success('Unit added')
    },
    onError: () => toast.error('Failed to add unit'),
  })

  const uploadLayoutMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData()
      fd.append('image', file)   // backend: layoutUpload.single('image')
      return api.post(`/projects/${id}/layout`, fd, { headers: { 'Content-Type': undefined } })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project', id] }); toast.success('Layout uploaded') },
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 413) {
        toast.error(`File too large — max ${MAX_LAYOUT_MB} MB. Reduce the image size and try again.`)
      } else {
        toast.error('Failed to upload layout')
      }
    },
  })

  const uploadDocsMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData()
      fd.append('file', file)    // backend: documentUpload.single('file')
      return api.post(`/projects/${id}/documents`, fd, { headers: { 'Content-Type': undefined } })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project', id] }); toast.success('Document uploaded') },
    onError: () => toast.error('Failed to upload document'),
  })

  const bulkCsvMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData()
      fd.append('file', file)
      return api.post('/units/bulk', fd)
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['project-units', id] })
      toast.success(`${res.data?.created ?? 'Units'} added from CSV`)
    },
    onError: () => toast.error('Failed to import CSV'),
  })

  function handleLayoutFile(file: File) {
    if (file.size > MAX_LAYOUT_BYTES) {
      toast.error(`Image is ${(file.size / 1024 / 1024).toFixed(1)} MB — max ${MAX_LAYOUT_MB} MB. Please compress it first.`)
      return
    }
    uploadLayoutMutation.mutate(file)
  }

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UnitData>({ resolver: zodResolver(unitSchema) })

  if (isLoading) {
    return <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, height: 384 }} className="animate-pulse" />
  }

  if (!project) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
              onChange={(e) => { const f = e.target.files?.[0]; if (f) { handleLayoutFile(f) } e.target.value = '' }} />
            <input ref={docsInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" style={{ display: 'none' }}
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
              {project.priceMin != null && project.priceMax != null
                ? `${formatCurrency(project.priceMin)} – ${formatCurrency(project.priceMax)}`
                : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, background: '#f1f5f9', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {(['overview', 'units', 'documents'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={tabStyle(tab === t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', padding: 24 }}>
          <p style={{ fontWeight: 600, color: '#0f172a', margin: '0 0 10px' }}>Description</p>
          <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, margin: 0 }}>{project.description || 'No description provided.'}</p>
          {project.layoutUrl && (
            <div style={{ marginTop: 20 }}>
              <p style={{ fontWeight: 600, color: '#0f172a', margin: '0 0 10px' }}>Layout</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
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
            <>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 10px' }}>Click any row to view full plot details</p>
            <Table>
              <Thead>
                <tr>
                  <Th>Plot No.</Th><Th>Status</Th><Th>Size (sqft)</Th><Th>Price</Th><Th>Facing</Th><Th>Road Width</Th>
                </tr>
              </Thead>
              <Tbody>
                {units.map((unit) => (
                  <Tr key={unit.id} onClick={() => setSelectedUnit(unit)}>
                    <Td><span style={{ fontWeight: 700, color: '#0f172a' }}>{unit.unitNumber}</span></Td>
                    <Td><Badge status={unit.status} /></Td>
                    <Td>{unit.sqFt?.toLocaleString() ?? '—'}</Td>
                    <Td><span style={{ fontWeight: 600, color: '#059669' }}>{formatCurrency(unit.price)}</span></Td>
                    <Td>{unit.facing || '—'}</Td>
                    <Td>{unit.roadWidth ? `${unit.roadWidth} ft` : '—'}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
            </>
          )}
        </div>
      )}

      {/* Documents Tab */}
      {tab === 'documents' && (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', padding: 24 }}>
          {project.documents.length === 0 && (
            <EmptyState icon={FileText} title="No documents" description="Upload project documents" />
          )}
          {project.documents.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {project.documents.map((doc, i) => (
                <div key={`${doc.name}-${i}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', border: '1px solid #f1f5f9', borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FileText size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', margin: 0 }}>{doc.name}</p>
                      {(doc.createdAt ?? doc.uploadedAt) && (
                        <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{formatDate((doc.createdAt ?? doc.uploadedAt)!)}</p>
                      )}
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

      {/* Plot Detail Modal */}
      {selectedUnit && (() => {
        const u = selectedUnit
        const a = u.attributes ?? {}
        const calcRate = u.sqFt > 0 ? Math.round(u.price / u.sqFt) : 0
        const AMENITIES_DISPLAY = [
          { key: 'water', label: 'Water Supply' }, { key: 'electricity', label: 'Electricity' },
          { key: 'drainage', label: 'Underground Drainage' }, { key: 'streetLights', label: 'Street Lights' },
          { key: 'compoundWall', label: 'Compound Wall' }, { key: 'park', label: 'Park Area' },
          { key: 'clubhouse', label: 'Clubhouse' }, { key: 'security', label: '24/7 Security' },
        ]
        const activeAmenities = AMENITIES_DISPLAY.filter(({ key }) => Boolean(a[key]))

        const Row = ({ label, value }: { label: string; value: string }) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{value}</span>
          </div>
        )
        const Section = ({ title, children }: { title: string; children: ReactNode }) => (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: '#0a0f1c', letterSpacing: '0.07em', textTransform: 'uppercase', margin: '0 0 12px', paddingBottom: 6, borderBottom: '1px solid #f1f5f9' }}>{title}</p>
            {children}
          </div>
        )

        return (
          <Modal open onClose={() => setSelectedUnit(null)} title={`Plot ${u.unitNumber}`} size="lg">
            {/* Stats strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
              {[
                { label: 'Area', value: `${u.sqFt.toLocaleString()} sqft` },
                { label: 'Price', value: formatCurrency(u.price) },
                ...(calcRate > 0 ? [{ label: 'Rate / sqft', value: formatCurrency(calcRate) }] : []),
              ].map(({ label, value }) => (
                <div key={label} style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>{label}</p>
                  <p style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Plot Info */}
            <Section title="Plot Info">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                <Row label="Status" value={u.status} />
                {u.facing ? <Row label="Facing" value={u.facing} /> : null}
                {u.roadWidth ? <Row label="Road Width" value={`${u.roadWidth} ft`} /> : null}
                {a.plotType ? <Row label="Plot Type" value={String(a.plotType)} /> : null}
                {a.plotShape ? <Row label="Shape" value={String(a.plotShape)} /> : null}
                {a.cornerPlot ? <Row label="Corner Plot" value="Yes" /> : null}
                {a.roadType ? <Row label="Road Type" value={String(a.roadType)} /> : null}
                {a.plotColorStatus ? <Row label="Color Status" value={String(a.plotColorStatus)} /> : null}
              </div>
            </Section>

            {/* Dimensions */}
            {(a.length || a.width || a.ratePerSqft) ? (
              <Section title="Dimensions">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                  {a.length ? <Row label={`Length (${String(a.dimensionFormat ?? 'Feet')})`} value={String(a.length)} /> : null}
                  {a.width ? <Row label={`Width (${String(a.dimensionFormat ?? 'Feet')})`} value={String(a.width)} /> : null}
                  {a.ratePerSqft ? <Row label="Rate / sqft" value={formatCurrency(Number(a.ratePerSqft))} /> : null}
                </div>
              </Section>
            ) : null}

            {/* Financial */}
            {(a.bookingAmount || a.commissionPercentage || a.registrationReady) ? (
              <Section title="Financial">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                  {a.bookingAmount ? <Row label="Booking Amount" value={formatCurrency(Number(a.bookingAmount))} /> : null}
                  {a.commissionPercentage ? <Row label="Commission" value={`${String(a.commissionPercentage)}%`} /> : null}
                  {a.registrationReady ? <Row label="Reg. Ready" value="Yes" /> : null}
                </div>
              </Section>
            ) : null}

            {/* Amenities */}
            {activeAmenities.length > 0 ? (
              <Section title="Amenities">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {activeAmenities.map(({ key, label }) => (
                    <span key={key} style={{ fontSize: 12, fontWeight: 600, color: '#059669', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6, padding: '4px 10px' }}>{label}</span>
                  ))}
                </div>
              </Section>
            ) : null}

            {/* Nearby */}
            {(a.landmark || a.nearbySchools || a.nearbyHospitals || a.nearbyTransport || a.distanceFromMainRoad) ? (
              <Section title="Nearby">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'Landmark', key: 'landmark' }, { label: 'Schools', key: 'nearbySchools' },
                    { label: 'Hospitals', key: 'nearbyHospitals' }, { label: 'Transport', key: 'nearbyTransport' },
                    { label: 'Main Road Distance', key: 'distanceFromMainRoad' },
                  ].filter(({ key }) => a[key]).map(({ label, key }) => (
                    <div key={key} style={{ display: 'flex', gap: 12, fontSize: 13, borderBottom: '1px solid #f8fafc', paddingBottom: 6 }}>
                      <span style={{ fontWeight: 700, color: '#64748b', minWidth: 130 }}>{label}</span>
                      <span style={{ color: '#0f172a' }}>{String(a[key])}</span>
                    </div>
                  ))}
                </div>
              </Section>
            ) : null}

            {/* Notes */}
            {a.bookingNotes ? (
              <Section title="Notes">
                <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, margin: 0 }}>{String(a.bookingNotes)}</p>
              </Section>
            ) : null}
          </Modal>
        )
      })()}

      {/* Add Unit Modal */}
      <Modal open={addUnitOpen} onClose={() => setAddUnitOpen(false)} title="Add Unit" size="md">
        <form onSubmit={handleSubmit((d) => addUnitMutation.mutate(d))} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Unit Number" error={errors.unitNumber?.message} {...register('unitNumber')} />
            <Input label="Facing" placeholder="North / South / East / West" error={errors.facing?.message} {...register('facing')} />
            <Input label="Size (sqft)" type="number" error={errors.sqFt?.message} {...register('sqFt')} />
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
