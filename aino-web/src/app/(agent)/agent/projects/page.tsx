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
import { Search, Share2, Copy, Building2, MapPin } from 'lucide-react'
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

function copyToClipboard(url: string) {
  navigator.clipboard.writeText(url)
  toast.success('Link copied to clipboard!')
}

function priceLabel(project: Project): string {
  if (project.priceMin && project.priceMax) {
    return `${formatCurrency(project.priceMin)} – ${formatCurrency(project.priceMax)}`
  }
  if (project.priceMin) return `From ${formatCurrency(project.priceMin)}`
  return ''
}

export default function AgentProjectsPage() {
  const [search, setSearch] = useState('')
  const [shareModal, setShareModal] = useState<GeneratedLead | null>(null)

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['projects-public'],
    queryFn: () => api.get('/projects').then((r) => (Array.isArray(r.data) ? r.data : [])),
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

  const filtered = projects.filter(
    (p) =>
      p.status === 'published' &&
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.location.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: '#eff6ff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={18} style={{ color: '#2563eb' }} />
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Projects</h2>
            {!isLoading && <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{filtered.length} published</p>}
          </div>
        </div>
        <Input
          placeholder="Search projects..."
          leftAddon={<Search size={13} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].map((k) => (
            <div key={k} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, height: 224 }} className="animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <EmptyState icon={Building2} title="No published projects found" description="Check back later for available projects" />
      )}

      {!isLoading && filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.map((project) => {
            const price = priceLabel(project)
            return (
              <div key={project.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                {project.imageUrl ? (
                  <img src={project.imageUrl} alt={project.name} style={{ width: '100%', height: 140, objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: 140, background: 'linear-gradient(135deg, #1e3c6e, #2a5298)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={36} style={{ color: 'rgba(255,255,255,0.3)' }} />
                  </div>
                )}
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: 0 }}>{project.name}</h3>
                    <Badge status={project.status} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#94a3b8', fontSize: 12, marginBottom: 6 }}>
                    <MapPin size={11} />
                    <span>{project.location}</span>
                  </div>
                  {price && (
                    <p style={{ fontSize: 12, color: '#374151', margin: '0 0 10px' }}>{price}</p>
                  )}
                  <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 12px' }}>
                    <span style={{ fontWeight: 600, color: '#059669' }}>{project.availableUnits}</span>
                    <span style={{ color: '#94a3b8' }}> / {project.totalUnits} available</span>
                  </p>
                  <Button size="sm" onClick={() => generateMutation.mutate(project.id)} loading={generateMutation.isPending} style={{ width: '100%' }}>
                    <Share2 size={14} /> Generate Share Link
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={!!shareModal} onClose={() => setShareModal(null)} title="Share Link Generated" size="md">
        {shareModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px' }}>
              <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 6px' }}>Share this link with your clients:</p>
              <p style={{ fontSize: 13, fontFamily: 'monospace', color: '#1e3c6e', margin: 0, wordBreak: 'break-all' }}>{shareModal.shareUrl}</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button style={{ flex: 1 }} onClick={() => copyToClipboard(shareModal.shareUrl)}>
                <Copy size={14} /> Copy Link
              </Button>
              <Button variant="outline" onClick={() => setShareModal(null)}>Close</Button>
            </div>
            <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', margin: 0 }}>
              Token: <span style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace' }}>{shareModal.shareToken}</span>
            </p>
          </div>
        )}
      </Modal>
    </div>
  )
}
