'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { toast } from 'sonner'
import { Share2, Copy, Check, Link2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

interface Project {
  id: string
  project_name: string
  location: string
}

interface GeneratedLink {
  shareToken: string
  shareUrl: string
  clientName: string
  projectName: string
}

const schema = z.object({
  projectId: z.string().min(1, 'Select a project'),
  clientName: z.string().min(2, 'Client name is required'),
  clientPhone: z.string().regex(/^\d{10}$/, 'Enter a valid 10-digit number'),
})

type FormData = z.infer<typeof schema>

export default function AgentSharePage() {
  const [generatedLink, setGeneratedLink] = useState<GeneratedLink | null>(null)
  const [copied, setCopied] = useState(false)

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ['agent-projects-list'],
    queryFn: () => api.get('/projects').then((r) => (Array.isArray(r.data) ? r.data : [])),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const generateMutation = useMutation({
    mutationFn: (data: FormData) => api.post('/leads/generate', data),
    onSuccess: (res: any, variables) => {
      const project = projects.find((p) => p.id === variables.projectId)
      const base = process.env.NEXT_PUBLIC_SHARE_URL ?? globalThis.location?.origin ?? ''
      setGeneratedLink({
        shareToken: res.data.shareToken,
        shareUrl: `${base.replace(/\/$/, '')}/${res.data.shareToken}`,
        clientName: variables.clientName,
        projectName: project?.project_name ?? 'Project',
      })
      reset()
    },
    onError: () => toast.error('Failed to generate link. Try again.'),
  })

  async function copyLink() {
    if (!generatedLink) return
    await navigator.clipboard.writeText(generatedLink.shareUrl)
    setCopied(true)
    toast.success('Link copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const fieldStyle = {
    width: '100%',
    padding: '11px 14px',
    border: '1.5px solid #e2e8f0',
    borderRadius: 10,
    fontSize: 14,
    color: '#0f172a',
    background: 'white',
    outline: 'none',
    fontFamily: 'inherit',
  } as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 600 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, background: '#eff6ff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Share2 size={20} style={{ color: '#2563eb' }} />
        </div>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>Generate Share Link</h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Send a personalised project link to your client</p>
        </div>
      </div>

      {/* Form card */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <form onSubmit={handleSubmit((d) => generateMutation.mutate(d))} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Project select */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Project
            </label>
            {projectsLoading ? (
              <div style={{ ...fieldStyle, color: '#94a3b8' }}>Loading projects…</div>
            ) : projects.length === 0 ? (
              <EmptyState icon={Share2} title="No projects available" description="Projects will appear here once published" />
            ) : (
              <select
                style={{ ...fieldStyle, cursor: 'pointer', borderColor: errors.projectId ? '#ef4444' : '#e2e8f0' }}
                {...register('projectId')}
              >
                <option value="">Select a project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.project_name} — {p.location}</option>
                ))}
              </select>
            )}
            {errors.projectId && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.projectId.message}</p>}
          </div>

          <Input
            label="Client Name"
            placeholder="John Doe"
            error={errors.clientName?.message}
            {...register('clientName')}
          />

          {/* Phone with prefix */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Client Phone
            </label>
            <div style={{ display: 'flex', border: `1.5px solid ${errors.clientPhone ? '#ef4444' : '#e2e8f0'}`, borderRadius: 10, overflow: 'hidden', background: 'white' }}>
              <div style={{ padding: '0 12px', background: '#f1f5f9', borderRight: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <span>🇮🇳</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>+91</span>
              </div>
              <input
                type="tel"
                placeholder="9876543210"
                maxLength={10}
                style={{ flex: 1, padding: '11px 14px', border: 'none', outline: 'none', fontSize: 14, color: '#0f172a', background: 'transparent', fontFamily: 'inherit' }}
                {...register('clientPhone')}
              />
            </div>
            {errors.clientPhone && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.clientPhone.message}</p>}
          </div>

          <Button type="submit" loading={generateMutation.isPending} style={{ marginTop: 4 }}>
            <Link2 size={15} /> Generate Share Link
          </Button>
        </form>
      </div>

      {/* Generated link card */}
      {generatedLink && (
        <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 14, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Check size={18} style={{ color: '#059669', flexShrink: 0 }} />
            <p style={{ fontWeight: 700, color: '#065f46', fontSize: 14, margin: 0 }}>
              Link generated for {generatedLink.clientName}
            </p>
          </div>
          <p style={{ fontSize: 12, color: '#374151', marginBottom: 8 }}>Project: <strong>{generatedLink.projectName}</strong></p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'white', border: '1px solid #d1fae5', borderRadius: 8, padding: '10px 14px' }}>
            <p style={{ flex: 1, fontSize: 13, color: '#1e3c6e', fontFamily: 'monospace', margin: 0, wordBreak: 'break-all' }}>
              {generatedLink.shareUrl}
            </p>
            <button
              onClick={copyLink}
              style={{ flexShrink: 0, padding: '6px 12px', background: copied ? '#059669' : '#1e3c6e', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <button
            onClick={() => setGeneratedLink(null)}
            style={{ marginTop: 12, background: 'none', border: 'none', color: '#64748b', fontSize: 12, cursor: 'pointer', padding: 0 }}
          >
            Generate another link →
          </button>
        </div>
      )}
    </div>
  )
}
