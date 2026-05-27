import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  change?: string
  changeType?: 'up' | 'down' | 'neutral'
  className?: string
}

export function StatCard({
  label,
  value,
  icon: Icon,
  iconColor = 'text-[#1e3c6e]',
  iconBg = 'bg-[#1e3c6e]/10',
  change,
  changeType = 'neutral',
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex items-start gap-4',
        className
      )}
    >
      <div className={cn('p-3 rounded-xl flex-shrink-0', iconBg)}>
        <Icon size={22} className={iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
        {change && (
          <p
            className={cn(
              'text-xs mt-1 font-medium',
              changeType === 'up' && 'text-emerald-600',
              changeType === 'down' && 'text-red-500',
              changeType === 'neutral' && 'text-slate-400'
            )}
          >
            {change}
          </p>
        )}
      </div>
    </div>
  )
}
