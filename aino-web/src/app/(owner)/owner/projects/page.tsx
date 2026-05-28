'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Building2, MapPin, ChevronRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface Project {
  id: string
  name: string
  location: string
  status: string
  totalUnits: number
  availableUnits: number
  soldUnits: number
  priceMin?: number
  priceMax?: number
  description?: string
}

function priceLabel(project: Project): string {
  if (project.priceMin && project.priceMax) {
    return `${formatCurrency(project.priceMin)} – ${formatCurrency(project.priceMax)}`
  }
  if (project.priceMin) return `From ${formatCurrency(project.priceMin)}`
  return ''
}

export default function OwnerProjectsPage() {
  const router = useRouter()

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['owner-projects'],
    queryFn: () => api.get('/owner/projects').then((r) => (Array.isArray(r.data) ? r.data : [])),
  })

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {['p1', 'p2', 'p3'].map((k) => (
          <div key={k} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, height: 128 }} className="animate-pulse" />
        ))}
      </div>
    )
  }

  if (projects.length === 0) {
    return <EmptyState icon={Building2} title="No projects assigned" description="Contact admin to assign projects to you" />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {projects.map((project) => {
        const price = priceLabel(project)
        return (
          <button
            key={project.id}
            type="button"
            onClick={() => router.push(`/owner/projects/${project.id}`)}
            style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', padding: '20px', cursor: 'pointer', width: '100%', textAlign: 'left' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>{project.name}</h3>
                  <Badge status={project.status} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#94a3b8', fontSize: 12, marginBottom: 6 }}>
                  <MapPin size={11} />
                  <span>{project.location}</span>
                </div>
                {project.description && (
                  <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{project.description}</p>
                )}
              </div>
              <ChevronRight size={18} style={{ color: '#cbd5e1', flexShrink: 0 }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
              <div>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>{project.totalUnits}</p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Available</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#059669', margin: 0 }}>{project.availableUnits}</p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sold</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#ef4444', margin: 0 }}>{project.soldUnits ?? 0}</p>
              </div>
            </div>

            {price && (
              <p style={{ fontSize: 12, color: '#64748b', marginTop: 10, marginBottom: 0 }}>Price: {price}</p>
            )}
          </button>
        )
      })}
    </div>
  )
}
