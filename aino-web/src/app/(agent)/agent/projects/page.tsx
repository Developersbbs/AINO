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
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

interface RawProject {
  id: string
  project_name: string
  location: string
  is_published: boolean
  layout_image_url?: string
  description?: string
  _count?: { units: number }
}

interface Project {
  id: string
  name: string
  location: string
  imageUrl?: string
  description?: string
  totalUnits: number
}

interface GeneratedLead {
  shareToken: string
  shareUrl: string
}

const clientSchema = z.object({
  clientName: z.string().min(2, 'Name is required'),
  clientPhone: z.string().regex(/^\d{10}$/, 'Enter a valid 10-digit number'),
})
type ClientForm = z.infer<typeof clientSchema>

function mapProject(p: RawProject): Project {
  return {
    id: p.id,
    name: p.project_name ?? '',
    location: p.location ?? '',
    imageUrl: p.layout_image_url,
    description: p.description,
    totalUnits: p._count?.units ?? 0,
  }
}

function copyToClipboard(url: string) {
  navigator.clipboard.writeText(url)
  toast.success('Link copied to clipboard!')
}

export default function AgentProjectsPage() {
  const [search, setSearch] = useState('')
  const [shareModal, setShareModal] = useState<GeneratedLead | null>(null)
  const [clientModal, setClientModal] = useState<{ projectId: string; projectName: string } | null>(null)

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['agent-projects-list'],
    queryFn: () =>
      api.get('/projects').then((r) => {
        const list: RawProject[] = Array.isArray(r.data) ? r.data : []
        return list.map(mapProject)
      }),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ClientForm>({
    resolver: zodResolver(clientSchema),
  })

  const generateMutation = useMutation({
    mutationFn: ({ projectId, clientName, clientPhone }: { projectId: string; clientName: string; clientPhone: string }) =>
      api.post('/leads/generate', { projectId, clientName, clientPhone }).then((r) => r.data),
    onSuccess: (data: any) => {
      setClientModal(null)
      const base = process.env.NEXT_PUBLIC_SHARE_URL ?? globalThis.location?.origin ?? ''
      setShareModal({
        shareToken: data.shareToken,
        shareUrl: `${base.replace(/\/$/, '')}/${data.shareToken}`,
      })
      reset()
      toast.success('Share link generated!')
    },
    onError: () => toast.error('Failed to generate share link'),
  })

  const q = search.toLowerCase()
  const filtered = projects.filter(
    (p) =>
      (p.name?.toLowerCase() ?? '').includes(q) ||
      (p.location?.toLowerCase() ?? '').includes(q)
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
            {!isLoading && <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{filtered.length} available</p>}
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
        <EmptyState icon={Building2} title="No projects available" description="Published projects will appear here" />
      )}

      {!isLoading && filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.map((project) => (
            <div key={project.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
              {project.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={project.imageUrl} alt={project.name} style={{ width: '100%', height: 140, objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: 140, background: 'linear-gradient(135deg, #1e3c6e, #2a5298)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={36} style={{ color: 'rgba(255,255,255,0.3)' }} />
                </div>
              )}
              <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: 0 }}>{project.name}</h3>
                  <Badge status="published" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#94a3b8', fontSize: 12, marginBottom: 10 }}>
                  <MapPin size={11} />
                  <span>{project.location}</span>
                </div>
                <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 12px' }}>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{project.totalUnits}</span> units
                </p>
                <Button
                  size="sm"
                  onClick={() => setClientModal({ projectId: project.id, projectName: project.name })}
                  style={{ width: '100%' }}
                >
                  <Share2 size={14} /> Generate Share Link
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Client info modal */}
      <Modal
        open={!!clientModal}
        onClose={() => { setClientModal(null); reset() }}
        title={`Share — ${clientModal?.projectName ?? ''}`}
        size="sm"
      >
        <form
          onSubmit={handleSubmit((d) => {
            if (clientModal) generateMutation.mutate({ projectId: clientModal.projectId, clientName: d.clientName!, clientPhone: d.clientPhone! })
          })}
          style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          <Input label="Client Name" placeholder="John Doe" error={errors.clientName?.message} {...register('clientName')} />
          <div>
            <label htmlFor="client-phone" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Client Phone</label>
            <div style={{ display: 'flex', border: `1.5px solid ${errors.clientPhone ? '#ef4444' : '#e2e8f0'}`, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '0 12px', background: '#f1f5f9', borderRight: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>🇮🇳</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>+91</span>
              </div>
              <input
                id="client-phone"
                type="tel"
                placeholder="9876543210"
                maxLength={10}
                style={{ flex: 1, padding: '10px 12px', border: 'none', outline: 'none', fontSize: 14, color: '#0f172a', background: 'transparent', fontFamily: 'inherit' }}
                {...register('clientPhone')}
              />
            </div>
            {errors.clientPhone && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.clientPhone.message}</p>}
          </div>
          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <Button variant="ghost" type="button" onClick={() => { setClientModal(null); reset() }}>Cancel</Button>
            <Button type="submit" loading={generateMutation.isPending} style={{ flex: 1 }}>Generate Link</Button>
          </div>
        </form>
      </Modal>

      {/* Generated link modal */}
      <Modal open={!!shareModal} onClose={() => setShareModal(null)} title="Share Link Ready" size="md">
        {shareModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px' }}>
              <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 6px' }}>Share this link with your client:</p>
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
