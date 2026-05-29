'use client'

import { X, Ruler, Compass, ArrowLeftRight, IndianRupee, Hash } from 'lucide-react'
import type { Unit } from './page'

interface PlotDetailModalProps {
  unit: Unit
  onClose: () => void
  onBook?: () => void
}

function formatPrice(price: number): string {
  if (price <= 0) return '—'
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`
  if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`
  return `₹${price.toLocaleString('en-IN')}`
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'number') return v.toLocaleString('en-IN')
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  if (typeof v === 'string') return v
  if (typeof v === 'object') return JSON.stringify(v)
  return '—'
}

function toLabel(key: string): string {
  return key.replaceAll('_', ' ').replace(/([A-Z])/g, ' $1').trim()
}

const STATUS: Record<string, { badge: string; badgeText: string; bannerBg: string; bannerText: string; bannerColor: string }> = {
  available: {
    badge: '#dcfce7', badgeText: '#166534',
    bannerBg: '#f0fdf4', bannerText: 'This plot is available for booking.', bannerColor: '#166534',
  },
  booked: {
    badge: '#fef3c7', badgeText: '#92400e',
    bannerBg: '#fef3c7', bannerText: 'This plot has already been booked.', bannerColor: '#92400e',
  },
  sold: {
    badge: '#fee2e2', badgeText: '#991b1b',
    bannerBg: '#fff1f2', bannerText: 'This plot has been sold.', bannerColor: '#9f1239',
  },
}

const CARD: React.CSSProperties = {
  background: '#f8fafc', borderRadius: 12,
  padding: '12px 14px', border: '1px solid #e2e8f0',
}

const CARD_LABEL: React.CSSProperties = {
  fontSize: 11, color: '#94a3b8',
  textTransform: 'uppercase', letterSpacing: '0.04em',
  marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5,
}

const CARD_VALUE: React.CSSProperties = {
  fontSize: 15, fontWeight: 600, color: '#0f172a', margin: 0,
}

const SECTION_TITLE: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: '#64748b',
  textTransform: 'uppercase', letterSpacing: '0.06em',
  marginBottom: 10,
}

export function PlotDetailModal({ unit, onClose, onBook }: Readonly<PlotDetailModalProps>) {
  const st = STATUS[unit.status] ?? STATUS.booked

  // Build extra rows from coordinates (flat key-value pairs)
  const coordEntries = unit.coordinates
    ? Object.entries(unit.coordinates).filter(([, v]) => v !== null && v !== undefined && v !== '')
    : []

  // Build extra rows from attributes (flat key-value pairs)
  const attrEntries = unit.attributes
    ? Object.entries(unit.attributes).filter(([, v]) => v !== null && v !== undefined && v !== '')
    : []

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
      background: 'rgba(0,0,0,0.55)',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20,
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        width: '100%', maxWidth: 440,
        overflow: 'hidden',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', background: '#1e3c6e', flexShrink: 0,
        }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 600, color: '#fff', margin: 0 }}>
              Plot {unit.unitNumber}
            </h2>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>Plot Details</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              background: st.badge, color: st.badgeText,
            }}>
              {unit.status.charAt(0).toUpperCase() + unit.status.slice(1)}
            </span>
            <button onClick={onClose} style={{
              background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8,
              padding: 6, cursor: 'pointer', display: 'flex', color: 'rgba(255,255,255,0.7)',
            }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Status banner */}
          <div style={{
            background: st.bannerBg, borderRadius: 10,
            padding: '10px 14px', fontSize: 13, color: st.bannerColor, fontWeight: 500,
          }}>
            {st.bannerText}
          </div>

          {/* Core details */}
          <div>
            <p style={SECTION_TITLE}>Plot Info</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

              <div style={CARD}>
                <div style={CARD_LABEL}><Hash size={12} />Plot No.</div>
                <p style={CARD_VALUE}>{unit.unitNumber}</p>
              </div>

              <div style={CARD}>
                <div style={CARD_LABEL}><Ruler size={12} />Size</div>
                <p style={CARD_VALUE}>{unit.sqFt > 0 ? `${unit.sqFt.toLocaleString()} sqft` : '—'}</p>
              </div>

              <div style={CARD}>
                <div style={CARD_LABEL}><Compass size={12} />Facing</div>
                <p style={CARD_VALUE}>{unit.facing || '—'}</p>
              </div>

              <div style={CARD}>
                <div style={CARD_LABEL}><ArrowLeftRight size={12} />Road Width</div>
                <p style={CARD_VALUE}>{unit.roadWidth == null ? '—' : `${unit.roadWidth} ft`}</p>
              </div>

              <div style={{ ...CARD, gridColumn: '1 / -1' }}>
                <div style={CARD_LABEL}><IndianRupee size={12} />Price</div>
                <p style={{ ...CARD_VALUE, fontSize: 18, color: '#1e3c6e' }}>{formatPrice(unit.price)}</p>
              </div>

            </div>
          </div>

          {/* Coordinates (dimensions/position) */}
          {coordEntries.length > 0 && (
            <div>
              <p style={SECTION_TITLE}>Dimensions</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {coordEntries.map(([key, val]) => (
                  <div key={key} style={CARD}>
                    <div style={CARD_LABEL}>{toLabel(key)}</div>
                    <p style={CARD_VALUE}>{formatValue(val)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attributes (custom) */}
          {attrEntries.length > 0 && (
            <div>
              <p style={SECTION_TITLE}>Additional Details</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {attrEntries.map(([key, val]) => (
                  <div key={key} style={CARD}>
                    <div style={CARD_LABEL}>{toLabel(key)}</div>
                    <p style={CARD_VALUE}>{formatValue(val)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Actions — fixed at bottom */}
        <div style={{
          display: 'flex', gap: 10, padding: '14px 20px',
          borderTop: '1px solid #f1f5f9', flexShrink: 0,
        }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '11px 0',
            border: '1px solid #e2e8f0', background: '#fff',
            color: '#374151', borderRadius: 10,
            fontSize: 14, fontWeight: 500, cursor: 'pointer',
          }}>
            Close
          </button>
          {unit.status === 'available' && onBook && (
            <button onClick={onBook} style={{
              flex: 2, padding: '11px 0',
              background: '#1e3c6e', color: '#fff', border: 'none',
              borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>
              Book This Plot
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
