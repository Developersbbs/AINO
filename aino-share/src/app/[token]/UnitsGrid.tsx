'use client'

import { useState } from 'react'
import { BookingModal } from './BookingModal'
import { clsx } from 'clsx'
import { Home } from 'lucide-react'

interface Unit {
  id: string
  unitNumber: string
  floor: number
  facing: string
  size: number
  price: number
  type: string
  status: 'available' | 'booked' | 'sold'
}

interface UnitsGridProps {
  units: Unit[]
  shareToken: string
}

function formatPrice(price: number): string {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`
  if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`
  return `₹${price.toLocaleString('en-IN')}`
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    available: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    booked: 'bg-amber-100 text-amber-700 border-amber-200',
    sold: 'bg-red-100 text-red-700 border-red-200',
  }
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize',
        map[status] ?? 'bg-slate-100 text-slate-600 border-slate-200'
      )}
    >
      {status}
    </span>
  )
}

export function UnitsGrid({ units, shareToken }: UnitsGridProps) {
  const [bookingUnit, setBookingUnit] = useState<Unit | null>(null)
  const [filter, setFilter] = useState<'all' | 'available' | 'booked' | 'sold'>('all')

  const filtered = units.filter((u) => filter === 'all' || u.status === filter)

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['all', 'available', 'booked', 'sold'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              'px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-all border',
              filter === f
                ? 'bg-[#1e3c6e] text-white border-[#1e3c6e]'
                : 'bg-white text-slate-600 border-slate-200 hover:border-[#1e3c6e] hover:text-[#1e3c6e]'
            )}
          >
            {f} ({f === 'all' ? units.length : units.filter((u) => u.status === f).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-10 text-slate-400">
          <Home size={32} className="mx-auto mb-2 opacity-40" />
          <p>No units match this filter</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((unit) => (
            <div
              key={unit.id}
              className={clsx(
                'bg-white border rounded-2xl p-5 transition-all',
                unit.status === 'available'
                  ? 'border-emerald-200 hover:shadow-md hover:border-emerald-300'
                  : 'border-slate-200 opacity-80'
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-slate-900 text-lg">Unit {unit.unitNumber}</p>
                  <p className="text-slate-500 text-xs">{unit.type}</p>
                </div>
                <StatusBadge status={unit.status} />
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-slate-50 rounded-xl p-2.5">
                  <p className="text-xs text-slate-400">Floor</p>
                  <p className="font-semibold text-slate-900">{unit.floor}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-2.5">
                  <p className="text-xs text-slate-400">Facing</p>
                  <p className="font-semibold text-slate-900">{unit.facing}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-2.5">
                  <p className="text-xs text-slate-400">Size</p>
                  <p className="font-semibold text-slate-900">{unit.size.toLocaleString()} sqft</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-2.5">
                  <p className="text-xs text-slate-400">Price</p>
                  <p className="font-semibold text-[#1e3c6e]">{formatPrice(unit.price)}</p>
                </div>
              </div>

              {unit.status === 'available' && (
                <button
                  onClick={() => setBookingUnit(unit)}
                  className="w-full py-2.5 bg-[#1e3c6e] text-white rounded-xl text-sm font-semibold hover:bg-[#152d54] active:scale-95 transition-all"
                >
                  Book This Unit
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {bookingUnit && (
        <BookingModal
          unit={bookingUnit}
          shareToken={shareToken}
          onClose={() => setBookingUnit(null)}
        />
      )}
    </div>
  )
}
