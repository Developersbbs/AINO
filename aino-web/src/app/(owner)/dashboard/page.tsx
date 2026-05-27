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

export default function OwnerDashboard() {
  const router = useRouter()

  const { data: projects = [], isLoading } = useQuery<OwnerProject[]>({
    queryKey: ['owner-projects'],
    queryFn: () => api.get('/owner/projects').then((r) => r.data?.projects ?? r.data),
  })

  const totalUnits = projects.reduce((s, p) => s + (p.totalUnits ?? 0), 0)
  const soldUnits = projects.reduce((s, p) => s + (p.soldUnits ?? 0), 0)
  const availableUnits = projects.reduce((s, p) => s + (p.availableUnits ?? 0), 0)

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="My Projects"
          value={projects.length}
          icon={Building2}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          label="Total Units"
          value={totalUnits}
          icon={Home}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
        <StatCard
          label="Sold"
          value={soldUnits}
          icon={CheckCircle}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          label="Available"
          value={availableUnits}
          icon={TrendingUp}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
      </div>

      {/* Projects */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">My Projects</h2>
        </div>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState icon={Building2} title="No projects assigned" description="Contact admin to get projects assigned to you" />
        ) : (
          <div className="divide-y divide-slate-100">
            {projects.map((project) => (
              <div
                key={project.id}
                className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => router.push(`/owner/projects/${project.id}`)}
              >
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-medium text-slate-900">{project.name}</p>
                    <Badge status={project.status} />
                  </div>
                  <p className="text-xs text-slate-400">{project.location}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm">
                    <span className="font-semibold text-emerald-600">{project.availableUnits}</span>
                    <span className="text-slate-400"> / {project.totalUnits}</span>
                  </p>
                  <p className="text-xs text-slate-400">available units</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
