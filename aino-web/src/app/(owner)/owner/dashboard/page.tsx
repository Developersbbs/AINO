'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/lib/utils'
import { Building2, Home, CheckCircle, TrendingUp } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface OwnerProject {
  id: string
  name: string
  location: string
  status: string
  totalUnits: number
  availableUnits: number
  soldUnits: number
  priceMin?: number
  priceMax?: number
}

function priceLabel(p: OwnerProject): string {
  if (p.priceMin && p.priceMax) return `${formatCurrency(p.priceMin)} – ${formatCurrency(p.priceMax)}`
  if (p.priceMin) return `From ${formatCurrency(p.priceMin)}`
  return ''
}

export default function OwnerDashboard() {
  const router = useRouter()

  const { data: projects = [], isLoading } = useQuery<OwnerProject[]>({
    queryKey: ['owner-projects'],
    queryFn: () =>
      api.get('/owner/projects').then((r) => {
        const raw: any[] = Array.isArray(r.data) ? r.data : []
        return raw.map((p) => ({
          id: p.id,
          name: p.project_name ?? p.name ?? '',
          location: p.location ?? '',
          status: p.is_published ? 'published' : 'draft',
          totalUnits: p.unitSummary?.total ?? p.totalUnits ?? 0,
          availableUnits: p.unitSummary?.available ?? p.availableUnits ?? 0,
          soldUnits: p.unitSummary?.sold ?? p.soldUnits ?? 0,
        }))
      }),
  })

  const totalUnits = projects.reduce((s, p) => s + (p.totalUnits ?? 0), 0)
  const soldUnits = projects.reduce((s, p) => s + (p.soldUnits ?? 0), 0)
  const availableUnits = projects.reduce((s, p) => s + (p.availableUnits ?? 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard label="My Projects" value={projects.length} icon={Building2} iconBg="#eff6ff" iconColor="#2563eb" />
        <StatCard label="Total Units" value={totalUnits} icon={Home} iconBg="#faf5ff" iconColor="#9333ea" />
        <StatCard label="Sold" value={soldUnits} icon={CheckCircle} iconBg="#f0fdf4" iconColor="#059669" />
        <StatCard label="Available" value={availableUnits} icon={TrendingUp} iconBg="#fffbeb" iconColor="#d97706" />
      </div>

      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>My Projects</h2>
        </div>
        {isLoading && (
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {['p1', 'p2', 'p3'].map((k) => (
              <div key={k} style={{ height: 64, background: '#f1f5f9', borderRadius: 10 }} className="animate-pulse" />
            ))}
          </div>
        )}
        {!isLoading && projects.length === 0 && (
          <EmptyState icon={Building2} title="No projects assigned" description="Contact admin to get projects assigned to you" />
        )}
        {!isLoading && projects.length > 0 && (
          <div>
            {projects.map((project, i) => {
              const price = priceLabel(project)
              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => router.push(`/owner/projects/${project.id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderBottom: i < projects.length - 1 ? '1px solid #f1f5f9' : 'none',
                    cursor: 'pointer',
                    background: 'white',
                    border: 'none',
                    width: '100%',
                    textAlign: 'left',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0 }}>{project.name}</p>
                      <Badge status={project.status} />
                    </div>
                    <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>{project.location}</p>
                    {price && <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>{price}</p>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 14, margin: 0 }}>
                      <span style={{ fontWeight: 700, color: '#059669' }}>{project.availableUnits}</span>
                      <span style={{ color: '#94a3b8' }}> / {project.totalUnits}</span>
                    </p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>available units</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
