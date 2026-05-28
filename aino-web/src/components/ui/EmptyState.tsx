import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: Readonly<EmptyStateProps>) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', textAlign: 'center', background: 'white', borderRadius: 14, border: '1px solid #e2e8f0' }}>
      <div style={{ width: 56, height: 56, background: '#f1f5f9', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <Icon size={28} style={{ color: '#94a3b8' }} />
      </div>
      <p style={{ fontSize: 15, fontWeight: 600, color: '#475569', margin: 0 }}>{title}</p>
      {description && <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>{description}</p>}
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
  )
}
