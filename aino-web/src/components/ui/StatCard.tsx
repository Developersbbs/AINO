import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  change?: string
  changeType?: 'up' | 'down' | 'neutral'
}

export function StatCard({
  label,
  value,
  icon: Icon,
  iconColor = '#1e3c6e',
  iconBg = 'rgba(30,60,110,0.1)',
  change,
  changeType = 'neutral',
}: Readonly<StatCardProps>) {
  let changeColor = '#94a3b8'
  if (changeType === 'up') changeColor = '#059669'
  else if (changeType === 'down') changeColor = '#ef4444'

  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', padding: '20px', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={22} style={{ color: iconColor }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, color: '#64748b', fontWeight: 500, margin: 0 }}>{label}</p>
        <p style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: '2px 0 0', lineHeight: 1.2 }}>{value}</p>
        {change && (
          <p style={{ fontSize: 12, color: changeColor, fontWeight: 500, marginTop: 4 }}>{change}</p>
        )}
      </div>
    </div>
  )
}
