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

export default function OwnerProjectsPage() {
  const router = useRouter()

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['owner-projects'],
    queryFn: () => api.get('/owner/projects').then((r) => r.data?.projects ?? r.data),
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl h-32 animate-pulse" />
        ))}
      </div>
    )
  }

  if (projects.length === 0) {
    return <EmptyState icon={Building2} title="No projects assigned" description="Contact admin to assign projects to you" />
  }

  return (
    <div className="space-y-3">
      {projects.map((project) => (
        <div
          key={project.id}
          className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => router.push(`/owner/projects/${project.id}`)}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-slate-900">{project.name}</h3>
                <Badge status={project.status} />
              </div>
              <div className="flex items-center gap-1 text-slate-400 text-xs mb-2">
                <MapPin size={11} />
                {project.location}
              </div>
              {project.description && (
                <p className="text-slate-500 text-sm line-clamp-2">{project.description}</p>
              )}
            </div>
            <ChevronRight size={18} className="text-slate-300 flex-shrink-0 mt-1" />
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
            <div>
              <p className="text-xs text-slate-400">Total Units</p>
              <p className="font-semibold text-slate-900">{project.totalUnits}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Available</p>
              <p className="font-semibold text-emerald-600">{project.availableUnits}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Sold</p>
              <p className="font-semibold text-red-500">{project.soldUnits ?? 0}</p>
            </div>
          </div>

          {(project.priceMin || project.priceMax) && (
            <p className="text-xs text-slate-500 mt-2">
              Price:{' '}
              {project.priceMin && project.priceMax
                ? `${formatCurrency(project.priceMin)} – ${formatCurrency(project.priceMax)}`
                : project.priceMin
                ? `From ${formatCurrency(project.priceMin)}`
                : ''}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
