interface BadgeProps {
  status: string
  label?: string
}

function badgeStyle(status: string): { background: string; color: string; border: string } {
  const s = (status ?? '').toLowerCase()
  if (['active', 'approved', 'published', 'confirmed', 'paid', 'sold'].includes(s))
    return { background: '#f0fdf4', color: '#15803d', border: '#bbf7d0' }
  if (['pending', 'booked'].includes(s))
    return { background: '#fffbeb', color: '#b45309', border: '#fde68a' }
  if (['deactivated', 'rejected', 'cancelled', 'inactive'].includes(s))
    return { background: '#fef2f2', color: '#dc2626', border: '#fecaca' }
  if (s === 'draft')
    return { background: '#f8fafc', color: '#64748b', border: '#e2e8f0' }
  if (s === 'available')
    return { background: '#eff6ff', color: '#2563eb', border: '#bfdbfe' }
  return { background: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' }
}

export function Badge({ status, label }: Readonly<BadgeProps>) {
  const { background, color, border } = badgeStyle(status)
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 600,
      background, color, border: `1px solid ${border}`,
      textTransform: 'capitalize', whiteSpace: 'nowrap',
    }}>
      {label ?? status}
    </span>
  )
}
