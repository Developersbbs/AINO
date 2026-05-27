'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { toast } from 'sonner'
import { Plus, Search, Eye, ToggleLeft, ToggleRight, Building2 } from 'lucide-react'
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

export default function ProjectsPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['admin-projects'],
    queryFn: () => api.get('/admin/projects').then((r) => r.data?.projects ?? r.data),
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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateData>({ resolver: zodResolver(createSchema) })

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.location.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <Input
          placeholder="Search projects..."
          leftAddon={<Search size={14} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> Create Project
        </Button>
      </div>

      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-xl h-64 animate-pulse" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No projects found"
          description={search ? 'No projects match your search' : 'Create your first project'}
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={16} /> Create Project
            </Button>
          }
        />
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Project</Th>
              <Th>Location</Th>
              <Th>Owner</Th>
              <Th>Units</Th>
              <Th>Price Range</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </Thead>
          <Tbody>
            {filtered.map((project) => (
              <Tr key={project.id}>
                <Td>
                  <span className="font-medium text-slate-900">{project.name}</span>
                </Td>
                <Td>{project.location}</Td>
                <Td>{project.owner?.name ?? '—'}</Td>
                <Td>
                  <span className="text-emerald-600 font-medium">{project.availableUnits}</span>
                  <span className="text-slate-400"> / {project.totalUnits}</span>
                </Td>
                <Td>
                  {project.priceMin && project.priceMax
                    ? `${formatCurrency(project.priceMin)} – ${formatCurrency(project.priceMax)}`
                    : '—'}
                </Td>
                <Td>
                  <Badge status={project.status} />
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => router.push(`/projects/${project.id}`)}
                    >
                      <Eye size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant={project.status === 'published' ? 'outline' : 'primary'}
                      onClick={() =>
                        publishMutation.mutate({
                          id: project.id,
                          action: project.status === 'published' ? 'unpublish' : 'publish',
                        })
                      }
                    >
                      {project.status === 'published' ? (
                        <><ToggleRight size={14} /> Unpublish</>
                      ) : (
                        <><ToggleLeft size={14} /> Publish</>
                      )}
                    </Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create New Project" size="lg">
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          <Input label="Project Name" error={errors.name?.message} {...register('name')} />
          <Input label="Location" error={errors.location?.message} {...register('location')} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Description</label>
            <textarea
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3c6e]/30 focus:border-[#1e3c6e] min-h-[80px]"
              placeholder="Project description..."
              {...register('description')}
            />
          </div>
          <Input
            label="Total Units"
            type="number"
            error={errors.totalUnits?.message}
            {...register('totalUnits')}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Min Price (₹)"
              type="number"
              error={errors.priceMin?.message}
              {...register('priceMin')}
            />
            <Input
              label="Max Price (₹)"
              type="number"
              error={errors.priceMax?.message}
              {...register('priceMax')}
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" type="button" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              Create Project
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
