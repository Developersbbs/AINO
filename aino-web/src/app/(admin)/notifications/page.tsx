'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { formatDateTime } from '@/lib/utils'
import { Bell, CheckCheck, Info, UserCheck, BookOpen, DollarSign, AlertCircle, BellOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'

interface Notification {
  id: string
  title: string
  body: string
  type: string
  is_read: boolean
  created_at: string
}

function typeIcon(type: string) {
  const props = { size: 16 }
  if (type === 'user_approved')     return <UserCheck   {...props} />
  if (type === 'booking_confirmed') return <BookOpen    {...props} />
  if (type === 'commission_paid')   return <DollarSign  {...props} />
  if (type.includes('alert'))       return <AlertCircle {...props} />
  return <Info {...props} />
}

function typeColor(type: string): string {
  if (type === 'user_approved')     return '#16a34a'
  if (type === 'booking_confirmed') return '#d97706'
  if (type === 'commission_paid')   return '#7c3aed'
  if (type.includes('alert'))       return '#dc2626'
  return '#2563eb'
}

function typeBg(type: string): string {
  if (type === 'user_approved')     return '#f0fdf4'
  if (type === 'booking_confirmed') return '#fffbeb'
  if (type === 'commission_paid')   return '#f5f3ff'
  if (type.includes('alert'))       return '#fef2f2'
  return '#eff6ff'
}

export default function NotificationsPage() {
  const qc = useQueryClient()

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const r = await api.get('/notifications')
      return Array.isArray(r.data) ? r.data : []
    },
    refetchInterval: 30_000,
  })

  const markOneMutation = useMutation({
    mutationFn: (id: string) => api.put(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notifications-unread'] })
    },
  })

  const markAllMutation = useMutation({
    mutationFn: () => api.put('/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notifications-unread'] })
      toast.success('All notifications marked as read')
    },
    onError: () => toast.error('Failed to mark all as read'),
  })

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <div style={{ maxWidth: 672, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: '#eff6ff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={18} style={{ color: '#2563eb' }} />
          </div>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>Notifications</h2>
            {unreadCount > 0 && (
              <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{unreadCount} unread</p>
            )}
          </div>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllMutation.mutate()}
            loading={markAllMutation.isPending}
          >
            <CheckCheck size={14} /> Mark all read
          </Button>
        )}
      </div>

      {/* List */}
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        {isLoading && (
          <div>
            {['n1', 'n2', 'n3', 'n4', 'n5'].map((k) => (
              <div key={k} style={{ display: 'flex', gap: 12, padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f1f5f9', flexShrink: 0 }} className="animate-pulse" />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 13, background: '#f1f5f9', borderRadius: 6, width: '55%', marginBottom: 8 }} className="animate-pulse" />
                  <div style={{ height: 11, background: '#f1f5f9', borderRadius: 6, width: '80%' }} className="animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && notifications.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', gap: 12 }}>
            <div style={{ width: 56, height: 56, background: '#f8fafc', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BellOff size={24} style={{ color: '#cbd5e1' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#475569', margin: 0 }}>No notifications</p>
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>You&apos;re all caught up!</p>
            </div>
          </div>
        )}

        {!isLoading && notifications.map((n, i) => (
          <div
            key={n.id}
            style={{
              display: 'flex',
              gap: 14,
              padding: '14px 20px',
              borderBottom: i < notifications.length - 1 ? '1px solid #f1f5f9' : 'none',
              background: n.is_read ? 'white' : '#fafbff',
              cursor: n.is_read ? 'default' : 'pointer',
              transition: 'background 0.15s',
            }}
            onClick={() => { if (!n.is_read) markOneMutation.mutate(n.id) }}
          >
            {/* Icon */}
            <div style={{ width: 36, height: 36, borderRadius: 10, background: typeBg(n.type), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: typeColor(n.type) }}>
              {typeIcon(n.type)}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <p style={{ fontSize: 13, fontWeight: n.is_read ? 500 : 700, color: '#0f172a', margin: 0, lineHeight: 1.4 }}>{n.title}</p>
                {!n.is_read && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb', flexShrink: 0, marginTop: 4 }} />
                )}
              </div>
              <p style={{ fontSize: 12, color: '#64748b', margin: '3px 0 0', lineHeight: 1.5 }}>{n.body}</p>
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{formatDateTime(n.created_at)}</p>
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
