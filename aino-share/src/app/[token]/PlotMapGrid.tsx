'use client'

import { useState, useMemo } from 'react'
import { BookingModal } from './BookingModal'
import { PlotDetailModal } from './PlotDetailModal'
import type { Unit } from './page'

interface PlotMapGridProps {
  units: Unit[]
  shareToken: string
  agentId: string
}

/**
 * Handles all common unit-number formats:
 *   "A1"        → { block:"A",    num:"1" }
 *   "A-1"       → { block:"A",    num:"1" }
 *   "Plot-5"    → { block:"PLOT", num:"5" }
 *   "Plot 7"    → { block:"PLOT", num:"7" }
 *   "Plot -5"   → { block:"PLOT", num:"5" }
 *   "Unit 3"    → { block:"UNIT", num:"3" }
 *   "5"         → { block:"?",    num:"5" }
 */
function parseUnit(raw: string): { block: string; num: string } {
  const s = raw.trim()

  let m = /^([A-Za-z]{1,3})(\d+)$/.exec(s)
  if (m) return { block: m[1].toUpperCase(), num: m[2] }

  m = /^([A-Za-z][A-Za-z\s]*)[\s-]+(\d+)$/.exec(s)
  if (m) return { block: m[1].trim().toUpperCase(), num: m[2] }

  m = /^(\d+)$/.exec(s)
  if (m) return { block: '?', num: m[1] }

  m = /^(.*?)(\d+)\s*$/.exec(s)
  if (m) return { block: (m[1].replace(/[-\s]+$/, '').toUpperCase() || '?'), num: m[2] }

  return { block: '?', num: s }
}

const COLORS = {
  available: {
    bg: '#d1fae5', border: '#6ee7b7',
    text: '#065f46', dot: '#34d399', label: '#059669',
  },
  booked: {
    bg: '#fef3c7', border: '#fcd34d',
    text: '#92400e', dot: '#fbbf24', label: '#d97706',
  },
  sold: {
    bg: '#fee2e2', border: '#fca5a5',
    text: '#991b1b', dot: '#f87171', label: '#ef4444',
  },
} as const

type Status = keyof typeof COLORS

const TH_COLORS = ['#94a3b8', '#94a3b8', '#10b981', '#f59e0b']

function BlockBadge({ label }: Readonly<{ label: string }>) {
  const abbr = label.length > 4 ? label.slice(0, 4) : label
  return (
    <div style={{
      minWidth: 36, height: 36, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#e2e8f0', borderRadius: 8,
      fontWeight: 700, color: '#475569',
      fontSize: abbr.length > 2 ? 9 : 12,
      padding: abbr.length > 2 ? '0 4px' : 0,
      marginTop: 2, userSelect: 'none',
    }}>
      {abbr}
    </div>
  )
}

export function PlotMapGrid({ units, shareToken, agentId }: Readonly<PlotMapGridProps>) {
  const [bookingUnit, setBookingUnit] = useState<Unit | null>(null)
  const [detailUnit, setDetailUnit]   = useState<Unit | null>(null)
  const [filter, setFilter] = useState<'all' | Status>('all')

  const counts = useMemo(() => ({
    available: units.filter(u => u.status === 'available').length,
    booked:    units.filter(u => u.status === 'booked').length,
    sold:      units.filter(u => u.status === 'sold').length,
  }), [units])

  const blocks = useMemo(() => {
    const map = new Map<string, Unit[]>()
    for (const unit of units) {
      const { block } = parseUnit(unit.unitNumber)
      if (!map.has(block)) map.set(block, [])
      const existing = map.get(block)
      if (existing) existing.push(unit)
    }
    for (const [, bu] of map) {
      bu.sort((a, b) => {
        const na = Number.parseInt(parseUnit(a.unitNumber).num, 10) || 0
        const nb = Number.parseInt(parseUnit(b.unitNumber).num, 10) || 0
        return na - nb
      })
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [units])

  const summary = blocks.map(([block, bu]) => ({
    block,
    total:  bu.length,
    avail:  bu.filter(u => u.status === 'available').length,
    booked: bu.filter(u => u.status === 'booked').length,
  }))

  function handleCellClick(unit: Unit) {
    setDetailUnit(unit)
  }

  function handleBookFromDetail() {
    if (detailUnit) {
      const unit = detailUnit
      setDetailUnit(null)
      setBookingUnit(unit)
    }
  }

  return (
    <div>
      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
        {(['available', 'booked', 'sold'] as Status[]).map(s => (
          <button
            key={s}
            onClick={() => setFilter(filter === s ? 'all' : s)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              opacity: filter !== 'all' && filter !== s ? 0.3 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            <span style={{ width: 12, height: 12, borderRadius: 3, flexShrink: 0, background: COLORS[s].dot }} />
            <span style={{ color: '#64748b', textTransform: 'capitalize' }}>{s}</span>
            <span style={{ fontWeight: 700, color: COLORS[s].label }}>({counts[s]})</span>
          </button>
        ))}
      </div>

      {/* Plot grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {blocks.map(([block, blockUnits]) => (
          <div key={block} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <BlockBadge label={block} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, flex: 1 }}>
              {blockUnits.map(unit => {
                const c = COLORS[unit.status as Status] ?? COLORS.available
                const num = parseUnit(unit.unitNumber).num
                const dimmed = filter !== 'all' && unit.status !== filter
                const cellFontSize = num.length > 3 ? 9 : 12
                const sqftInfo = unit.sqFt ? `· ${unit.sqFt} sqft` : ''
                const plotTitle = `Plot ${unit.unitNumber} — ${unit.status} ${sqftInfo}`.trim()
                return (
                  <button
                    key={unit.id}
                    onClick={() => handleCellClick(unit)}
                    title={plotTitle}
                    style={{
                      width: 44, height: 44,
                      borderRadius: 8,
                      border: `1px solid ${c.border}`,
                      background: c.bg,
                      color: c.text,
                      fontSize: cellFontSize,
                      fontWeight: 600,
                      userSelect: 'none',
                      opacity: dimmed ? 0.2 : 1,
                      cursor: 'pointer',
                      transition: 'transform 0.1s, box-shadow 0.1s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
                  >
                    {num}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Block summary */}
      {summary.length > 0 && (
        <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
          <div style={{ padding: '12px 16px', background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>Block Summary</span>
          </div>
          <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {(['BLOCK', 'TOTAL', 'AVAIL', 'BOOKED'] as const).map((h, i) => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: i === 0 ? 'left' : 'center',
                    fontSize: 11, fontWeight: 500, letterSpacing: '0.05em',
                    color: TH_COLORS[i],
                    textTransform: 'uppercase',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.map((row, i) => (
                <tr key={row.block} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 16px', fontWeight: 600, color: '#334155' }}>
                    {row.block.length === 1 ? `Block ${row.block}` : row.block}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'center', color: '#64748b' }}>{row.total}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'center', color: '#10b981', fontWeight: 700 }}>{row.avail}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'center', color: '#f59e0b', fontWeight: 700 }}>{row.booked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {bookingUnit && (
        <BookingModal
          unit={bookingUnit}
          shareToken={shareToken}
          agentId={agentId}
          onClose={() => setBookingUnit(null)}
        />
      )}

      {detailUnit && (
        <PlotDetailModal
          unit={detailUnit}
          onClose={() => setDetailUnit(null)}
          onBook={handleBookFromDetail}
        />
      )}
    </div>
  )
}
