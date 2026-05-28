'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from 'sonner'
import { User, Phone, Mail, Shield } from 'lucide-react'

interface UserProfile {
  id: string
  name: string
  phone: string
  email?: string
  role: string
  is_approved: boolean
}

const NAVY = '#1e3c6e'

export default function OwnerSettingsPage() {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

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
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24 }}>
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
    </div>
  )
}
