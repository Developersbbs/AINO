'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from 'sonner'
import { User, Phone, Mail, Shield, Paperclip, FileText, X, Trash2, Loader2 } from 'lucide-react'

interface UserDocument {
  name: string
  url: string
  uploadedAt: string
}

interface UserProfile {
  id: string
  name: string
  phone: string
  email?: string
  role: string
  is_approved: boolean
  documents?: UserDocument[]
}

const NAVY = '#1e3c6e'

export default function OwnerSettingsPage() {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [docHover, setDocHover] = useState(false)
  const docInputRef = useRef<HTMLInputElement | null>(null)

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ['me'],
    queryFn: async () => {
      const r = await api.get('/auth/me')
      return (r.data.user ?? r.data) as UserProfile
    },
  })

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '')
      setEmail(profile.email ?? '')
    }
  }, [profile])

  const updateMutation = useMutation({
    mutationFn: (data: { name?: string; email?: string }) => api.patch('/auth/me', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] })
      toast.success('Profile updated')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Failed to update profile'
      toast.error(msg)
    },
  })

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('docType', file.name)
      return api.post('/auth/me/documents', formData, {
        headers: { 'Content-Type': undefined },
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Upload failed'
      toast.error(`Upload error: ${msg}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (index: number) => api.delete(`/auth/me/documents/${index}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] })
      toast.success('Document removed')
    },
    onError: () => toast.error('Failed to remove document'),
  })

  function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    setSelectedFiles((prev) => [...prev, ...files])
    e.target.value = ''
  }

  function removeSelectedFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleUpload() {
    if (selectedFiles.length === 0) return
    await Promise.all(selectedFiles.map((f) => uploadMutation.mutateAsync(f).catch(() => null)))
    setSelectedFiles([])
    toast.success('Documents uploaded')
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const payload: { name?: string; email?: string } = {}
    if (name.trim()) payload.name = name.trim()
    if (email.trim()) payload.email = email.trim()
    if (!payload.name && !payload.email) {
      toast.error('Provide name or email to update')
      return
    }
    updateMutation.mutate(payload)
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
        <div style={{ width: 32, height: 32, border: `4px solid ${NAVY}`, borderTopColor: 'transparent', borderRadius: '50%' }} className="animate-spin" />
      </div>
    )
  }

  const existingDocs = profile?.documents ?? []

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>Profile &amp; Settings</h2>
        <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>Manage your account information</p>
      </div>

      {/* Avatar card */}
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 24, fontWeight: 700, flexShrink: 0 }}>
          {profile?.name?.charAt(0)?.toUpperCase() ?? 'U'}
        </div>
        <div>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>{profile?.name}</p>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0', textTransform: 'capitalize' }}>{profile?.role}</p>
        </div>
      </div>

      {/* Read-only info */}
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24, marginBottom: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: '0 0 16px' }}>Account Info</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Phone size={15} color="#94a3b8" />
            <div>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Phone</p>
              <p style={{ fontSize: 14, color: '#0f172a', margin: '2px 0 0', fontWeight: 500 }}>{profile?.phone}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Shield size={15} color="#94a3b8" />
            <div>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Role</p>
              <p style={{ fontSize: 14, color: '#0f172a', margin: '2px 0 0', fontWeight: 500, textTransform: 'capitalize' }}>{profile?.role}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Editable fields */}
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24, marginBottom: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: '0 0 20px' }}>Edit Profile</p>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Full Name"
            leftAddon={<User size={14} />}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
          <Input
            label="Email Address"
            type="email"
            leftAddon={<Mail size={14} />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
            <Button type="submit" loading={updateMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>

      {/* Documents */}
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: '0 0 16px' }}>Documents</p>

        {/* Existing uploaded docs */}
        {existingDocs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {existingDocs.map((doc, i) => (
              <div key={`${doc.name}-${doc.uploadedAt}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <FileText size={14} color="#64748b" style={{ flexShrink: 0 }} />
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 13, color: NAVY, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none' }}
                >
                  {doc.name}
                </a>
                <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>
                  {new Date(doc.uploadedAt).toLocaleDateString()}
                </span>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(i)}
                  disabled={deleteMutation.isPending}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', flexShrink: 0, opacity: deleteMutation.isPending ? 0.5 : 1 }}
                >
                  <Trash2 size={14} color="#ef4444" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* File picker */}
        <button
          type="button"
          onClick={() => docInputRef.current?.click()}
          onMouseEnter={() => setDocHover(true)}
          onMouseLeave={() => setDocHover(false)}
          style={{
            width: '100%',
            padding: '14px 16px',
            border: `2px dashed ${docHover ? NAVY : '#e2e8f0'}`,
            borderRadius: 12,
            background: docHover ? '#f0f4ff' : '#f8fafc',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            transition: 'all 0.15s',
          }}
        >
          <Paperclip size={16} color={docHover ? NAVY : '#94a3b8'} />
          <span style={{ fontSize: 13, color: docHover ? NAVY : '#64748b', fontWeight: 500 }}>
            Attach documents or images
          </span>
        </button>
        <input ref={docInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFilesChange} />

        {/* Pending files to upload */}
        {selectedFiles.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {selectedFiles.map((file, i) => (
              <div key={`${file.name}-${file.lastModified}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: '#f1f5f9', borderRadius: 8 }}>
                <FileText size={13} color="#64748b" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>{(file.size / 1024).toFixed(0)} KB</span>
                <button
                  type="button"
                  onClick={() => removeSelectedFile(i)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', flexShrink: 0 }}
                >
                  <X size={13} color="#94a3b8" />
                </button>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploadMutation.isPending}
                style={{
                  padding: '9px 20px',
                  background: uploadMutation.isPending ? '#94a3b8' : NAVY,
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: uploadMutation.isPending ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {uploadMutation.isPending && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                {uploadMutation.isPending ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
