import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`
  }
  return `₹${amount.toLocaleString('en-IN')}`
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    published: 'text-green-700 bg-green-50 border-green-200',
    draft: 'text-slate-600 bg-slate-100 border-slate-200',
    available: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    booked: 'text-amber-700 bg-amber-50 border-amber-200',
    sold: 'text-red-700 bg-red-50 border-red-200',
    approved: 'text-green-700 bg-green-50 border-green-200',
    pending: 'text-amber-700 bg-amber-50 border-amber-200',
    rejected: 'text-red-700 bg-red-50 border-red-200',
    deactivated: 'text-slate-600 bg-slate-100 border-slate-200',
    active: 'text-green-700 bg-green-50 border-green-200',
    paid: 'text-green-700 bg-green-50 border-green-200',
    cancelled: 'text-red-700 bg-red-50 border-red-200',
    confirmed: 'text-blue-700 bg-blue-50 border-blue-200',
  }
  return map[status?.toLowerCase()] ?? 'text-slate-600 bg-slate-100 border-slate-200'
}
