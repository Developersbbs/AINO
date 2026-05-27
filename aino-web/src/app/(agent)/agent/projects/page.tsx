'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import api from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { toast } from 'sonner'
import { Search, Share2, Copy, Building2, MapPin, IndianRupee } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Project {
  id: string
  name: string
  location: string
  status: string
  totalUnits: number
  availableUnits: number
  priceMin?: number
  priceMax?: number
  imageUrl?: string
  description?: string
}

interface GeneratedLead {
  shareToken: string
  shareUrl: string
}

export default function AgentProjectsPage() {
  const [search, setSearch] = useState('')
  const [shareModal, setShareModal] = useState<GeneratedLead | null>(null)

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['projects-public'],
    queryFn: () => api.get('/projects').then((r) => r.data?.projects ?? r.data),
  })

  const generateMutation = useMutation({
    mutationFn: (projectId: string) =>
      api.post('/leads/generate', { projectId }).then((r) => r.data),
    onSuccess: (data) => {
      setShareModal(data)
      toast.success('Share link generated!')
    },
    onError: () => toast.error('Failed to generate share link'),
  })

  function copyLink(url: string) {
    navigator.clipboard.writeText(url)
    toast.success('Link copied to clipboard!')
  }

  const filtered = projects.filter(
    (p) =>
      p.status === 'published' &&
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.location.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search projects..."
        leftAddon={<Search size={14} />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />

      {isLoading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl h-56 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Building2} title="No published projects found" />
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <div
              key={project.id}
              className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Image / Placeholder */}
              {project.imageUrl ? (
                <img
                  src={project.imageUrl}
                  alt={project.name}
                  className="w-full h-36 object-cover"
                />
              ) : (
                <div className="w-full h-36 bg-gradient-to-br from-[#1e3c6e] to-[#2a5298] flex items-center justify-center">
                  <Building2 size={36} className="text-white/40" />
                </div>
              )}

              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-slate-900 text-sm">{project.name}</h3>
                  <Badge status={project.status} />
                </div>

                <div className="flex items-center gap-1 text-slate-400 text-xs mb-2">
                  <MapPin size={11} />
                  {project.location}
                </div>

                {(project.priceMin || project.priceMax) && (
                  <div className="flex items-center gap-1 text-slate-600 text-xs mb-3">
                    <IndianRupee size={11} />
                    {project.priceMin && project.priceMax
                      ? `${formatCurrency(project.priceMin)} – ${formatCurrency(project.priceMax)}`
                      : project.priceMin
                      ? `From ${formatCurrency(project.priceMin)}`
                      : ''}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                  <span>
                    <span className="font-medium text-emerald-600">{project.availableUnits}</span>{' '}
                    / {project.totalUnits} available
                  </span>
                </div>

                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => generateMutation.mutate(project.id)}
                  loading={generateMutation.isPending}
                >
                  <Share2 size={14} /> Generate Share Link
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Share Link Modal */}
      <Modal
        open={!!shareModal}
        onClose={() => setShareModal(null)}
        title="Share Link Generated"
        size="md"
      >
        {shareModal && (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1">Share this link with your clients:</p>
              <p className="text-sm font-mono text-[#1e3c6e] break-all">{shareModal.shareUrl}</p>
            </div>
            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={() => copyLink(shareModal.shareUrl)}
              >
                <Copy size={14} /> Copy Link
              </Button>
              <Button
                variant="outline"
                onClick={() => setShareModal(null)}
              >
                Close
              </Button>
            </div>
            <p className="text-xs text-slate-400 text-center">
              Token: <code className="bg-slate-100 px-1.5 py-0.5 rounded">{shareModal.shareToken}</code>
            </p>
          </div>
        )}
      </Modal>
    </div>
  )
}
