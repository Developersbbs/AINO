'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { toast } from 'sonner'
import { Plus, Search, Eye, ToggleLeft, ToggleRight, Building2, MapPin, Home, IndianRupee } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'

interface Project {
  id: string
  name: string
  location: string
  status: 'draft' | 'published'
  totalUnits: number
  availableUnits: number
  priceMin?: number
  priceMax?: number
  owner?: { name: string }
}

const createSchema = z.object({
  name: z.string().min(2, 'Name required'),
  location: z.string().min(2, 'Location required'),
  description: z.string().optional(),
  totalUnits: z.coerce.number().min(1, 'Must be at least 1'),
  priceMin: z.coerce.number().optional(),
  priceMax: z.coerce.number().optional(),
})

type CreateData = z.infer<typeof createSchema>

function priceLabel(project: Project): string {
  if (project.priceMin && project.priceMax) {
    return `${formatCurrency(project.priceMin)} – ${formatCurrency(project.priceMax)}`
  }
  if (project.priceMin) return `From ${formatCurrency(project.priceMin)}`
  if (project.priceMax) return `Up to ${formatCurrency(project.priceMax)}`
  return ''
}

function availabilityColor(available: number, total: number): string {
  if (total === 0) return '#94a3b8'
  const pct = available / total
  if (pct > 0.5) return '#059669'
  if (pct > 0.2) return '#d97706'
  return '#ef4444'
}

export default function ProjectsPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [createOpen, setCreateOpen] = useState(false)

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['admin-projects'],
    queryFn: async () => {
      const r = await api.get('/admin/projects')
      const raw: Record<string, unknown>[] = Array.isArray(r.data) ? r.data : []
      return raw.map((p) => ({
        id: p.id as string,
        name: (p.project_name as string) ?? (p.name as string) ?? '—',
        location: (p.location as string) ?? '—',
        status: p.is_published ? 'published' : 'draft',
        totalUnits: ((p._count as Record<string, number>)?.units ?? (p.totalUnits as number)) ?? 0,
        availableUnits: (p.availableUnits as number) ?? 0,
        priceMin: (p.price_min as number) ?? (p.priceMin as number) ?? undefined,
        priceMax: (p.price_max as number) ?? (p.priceMax as number) ?? undefined,
        owner: p.owner as { name: string } | undefined,
      })) as Project[]
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateData) => api.post('/projects', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-projects'] })
      setCreateOpen(false)
      reset()
      toast.success('Project created successfully')
    },
    onError: () => toast.error('Failed to create project'),
  })

  const publishMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'publish' | 'unpublish' }) =>
      api.post(`/projects/${id}/${action}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-projects'] })
      toast.success('Project status updated')
    },
    onError: () => toast.error('Failed to update project status'),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateData>({
    resolver: zodResolver(createSchema),
  })

  const filtered = projects.filter((p) => {
    const matchSearch =
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.location?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    return matchSearch && matchStatus
  })

  const publishedCount = projects.filter((p) => p.status === 'published').length
  const draftCount = projects.filter((p) => p.status === 'draft').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Title block */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 'auto' }}>
          <div style={{ width: 38, height: 38, background: '#eff6ff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Building2 size={18} style={{ color: '#2563eb' }} />
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Projects</h2>
            {!isLoading && (
              <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                {projects.length} total
                {publishedCount > 0 && <span style={{ color: '#059669' }}> · {publishedCount} published</span>}
                {draftCount > 0 && <span> · {draftCount} draft</span>}
              </p>
            )}
          </div>
        </div>

        {/* Search */}
        <div style={{ width: 220 }}>
          <Input
            placeholder="Search projects…"
            leftAddon={<Search size={13} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 2, background: '#f1f5f9', borderRadius: 10, padding: 4, flexShrink: 0 }}>
          {(['all', 'published', 'draft'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: 'none', cursor: 'pointer',
                background: statusFilter === s ? 'white' : 'transparent',
                color: statusFilter === s ? '#1e3c6e' : '#64748b',
                boxShadow: statusFilter === s ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Create button */}
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', borderRadius: 10, flexShrink: 0,
            background: '#1e3c6e', color: 'white',
            fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
          }}
        >
          <Plus size={15} /> Create Project
        </button>
      </div>

      {/* ── Loading skeleton ── */}
      {isLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {['s1', 's2', 's3', 's4', 's5', 's6'].map((k) => (
            <div key={k} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 16, height: 200 }} className="animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!isLoading && filtered.length === 0 && (
        <EmptyState
          icon={Building2}
          title="No projects found"
          description={search || statusFilter !== 'all' ? 'Try adjusting your search or filter' : 'Create your first project to get started'}
          action={<Button onClick={() => setCreateOpen(true)}><Plus size={15} /> Create Project</Button>}
        />
      )}

      {/* ── Card grid ── */}
      {!isLoading && filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filtered.map((project) => {
            const price = priceLabel(project)
            const availColor = availabilityColor(project.availableUnits, project.totalUnits)
            const soldUnits = project.totalUnits - project.availableUnits
            const soldPct = project.totalUnits > 0 ? (soldUnits / project.totalUnits) * 100 : 0

            return (
              <div
                key={project.id}
                style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
              >
                {/* Card header gradient */}
                <div style={{ background: 'linear-gradient(135deg, #1e3c6e 0%, #2a5298 100%)', padding: '18px 20px', position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: 'white', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
                        <MapPin size={11} />
                        <span>{project.location}</span>
                      </div>
                    </div>
                    <Badge status={project.status} />
                  </div>

                  {/* Owner badge */}
                  {project.owner && (
                    <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.12)', borderRadius: 8, padding: '3px 10px' }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'white' }}>
                        {project.owner.name.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{project.owner.name}</span>
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Unit stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <div style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</p>
                      <p style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>{project.totalUnits}</p>
                    </div>
                    <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avail</p>
                      <p style={{ fontSize: 18, fontWeight: 700, color: availColor, margin: 0 }}>{project.availableUnits}</p>
                    </div>
                    <div style={{ background: '#fef2f2', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sold</p>
                      <p style={{ fontSize: 18, fontWeight: 700, color: '#ef4444', margin: 0 }}>{soldUnits}</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>Sales progress</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{Math.round(soldPct)}%</span>
                    </div>
                    <div style={{ height: 6, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${soldPct}%`, background: 'linear-gradient(90deg, #1e3c6e, #2a5298)', borderRadius: 999, transition: 'width 0.3s' }} />
                    </div>
                  </div>

                  {/* Price */}
                  {price ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: '#f8fafc', borderRadius: 8 }}>
                      <IndianRupee size={12} style={{ color: '#059669', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{price}</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: '#f8fafc', borderRadius: 8 }}>
                      <Home size={12} style={{ color: '#94a3b8', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>Price not set</span>
                    </div>
                  )}
                </div>

                {/* Card footer */}
                <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 8 }}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/projects/${project.id}`)}
                    style={{ flex: 1 }}
                  >
                    <Eye size={13} /> View Details
                  </Button>
                  <Button
                    size="sm"
                    variant={project.status === 'published' ? 'outline' : 'primary'}
                    onClick={() => publishMutation.mutate({ id: project.id, action: project.status === 'published' ? 'unpublish' : 'publish' })}
                    loading={publishMutation.isPending}
                    style={{ flex: 1 }}
                  >
                    {project.status === 'published'
                      ? <><ToggleRight size={13} /> Unpublish</>
                      : <><ToggleLeft size={13} /> Publish</>}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Create Project Modal ── */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create New Project" size="lg">
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <Input label="Project Name" error={errors.name?.message} {...register('name')} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <Input label="Location" error={errors.location?.message} {...register('location')} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="proj-description" style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Description <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
            <textarea
              id="proj-description"
              style={{ width: '100%', borderRadius: 8, border: '1px solid #e2e8f0', padding: '10px 12px', fontSize: 13, minHeight: 80, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
              placeholder="Brief description of this project…"
              {...register('description')}
            />
          </div>
          <Input label="Total Units" type="number" error={errors.totalUnits?.message} {...register('totalUnits')} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Min Price (₹)" type="number" error={errors.priceMin?.message} {...register('priceMin')} />
            <Input label="Max Price (₹)" type="number" error={errors.priceMax?.message} {...register('priceMax')} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
            <Button variant="ghost" type="button" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>Create Project</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
