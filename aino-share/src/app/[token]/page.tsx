import { notFound } from 'next/navigation'
import { TrackClient } from './TrackClient'
import { PlotMapGrid } from './PlotMapGrid'
import { MapPin, Home, Building2, Phone, MessageCircle, Map } from 'lucide-react'
import type { Metadata } from 'next'

export interface Unit {
  id: string
  unitNumber: string
  sqFt: number
  price: number
  facing: string
  roadWidth: number | null
  status: 'available' | 'booked' | 'sold'
  coordinates: Record<string, unknown> | null
  attributes: Record<string, unknown> | null
}

interface ShareData {
  shareToken: string
  agentId: string
  project: {
    id: string
    name: string
    location: string
    imageUrl?: string | null
    layoutUrl?: string | null
    totalUnits: number
    availableUnits: number
    priceMin?: number | null
    priceMax?: number | null
    reraNumber: string | null
    bookingAmount: number | null
    projectType: string | null
  }
  units: Unit[]
  agent: {
    name: string
    phone: string
  }
}

// Safe coercions — avoid [object Object] from casting unknown values
function s(v: unknown, fallback = ''): string {
  if (typeof v === 'string') return v
  if (typeof v === 'number') return v.toString()
  return fallback
}
function n(v: unknown, fallback = 0): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') return Number.parseFloat(v) || fallback
  return fallback
}
function nullableN(a: unknown, b: unknown): number | null {
  if (typeof a === 'number') return a
  if (typeof b === 'number') return b
  return null
}
function nullableStr(a: unknown, b: unknown, c: unknown = undefined): string | null {
  if (typeof a === 'string') return a
  if (typeof b === 'string') return b
  if (typeof c === 'string') return c
  return null
}

async function fetchShareData(token: string): Promise<ShareData | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'https://aino.sbbstest.in/api'
  try {
    const res = await fetch(`${apiUrl}/leads/public/${token}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    const json = await res.json()
    // Backend wraps responses in { success, data, message }
    const raw = (json.data ?? json) as Record<string, unknown>
    if (!raw.project) return null

    // Normalise units — handles both old snake_case (unit_number, sq_ft) and
    // new camelCase (unitNumber, sqFt) backend formats, and lowercases status.
    const proj = raw.project as Record<string, unknown>
    const rawUnits = ((raw.units ?? proj.units) as Record<string, unknown>[] | undefined) ?? []
    const units: Unit[] = rawUnits.map((u) => {
      const rw = nullableN(u.roadWidth, u.road_width)
      const status = s(u.status, 'available').toLowerCase() as 'available' | 'booked' | 'sold'
      return {
        id: s(u.id),
        unitNumber: s(u.unitNumber) || s(u.unit_number),
        sqFt: n(u.sqFt) || n(u.sq_ft),
        price: n(u.price),
        facing: s(u.facing),
        roadWidth: rw,
        status,
        coordinates: (u.coordinates && typeof u.coordinates === 'object' && !Array.isArray(u.coordinates))
          ? u.coordinates as Record<string, unknown>
          : null,
        attributes: (u.attributes && typeof u.attributes === 'object' && !Array.isArray(u.attributes))
          ? u.attributes as Record<string, unknown>
          : null,
      }
    })

    const available = units.filter((u) => u.status === 'available')
    const prices = available.map((u) => u.price).filter((p) => p > 0)
    let priceMin: number | null = null
    if (typeof proj.priceMin === 'number') priceMin = proj.priceMin
    else if (prices.length) priceMin = Math.min(...prices)

    let priceMax: number | null = null
    if (typeof proj.priceMax === 'number') priceMax = proj.priceMax
    else if (prices.length) priceMax = Math.max(...prices)

    const agentRaw = raw.agent as { name?: unknown; phone?: unknown } | null
    return {
      shareToken: s(raw.shareToken) || token,
      agentId: s(raw.agentId),
      project: {
        id: s(proj.id),
        name: s(proj.name) || s(proj.project_name),
        location: s(proj.location),
        imageUrl: nullableStr(proj.imageUrl, proj.image_url, proj.layout_image_url),
        layoutUrl: nullableStr(proj.layoutUrl, proj.layout_image_url),
        totalUnits: typeof proj.totalUnits === 'number' ? proj.totalUnits : units.length,
        availableUnits: typeof proj.availableUnits === 'number' ? proj.availableUnits : available.length,
        priceMin,
        priceMax,
        reraNumber: nullableStr(proj.reraNumber, proj.rera_number),
        bookingAmount: nullableN(proj.bookingAmount, proj.booking_amount),
        projectType: nullableStr(proj.projectType, proj.project_type),
      },
      units,
      agent: { name: s(agentRaw?.name, 'Agent'), phone: s(agentRaw?.phone) },
    }
  } catch {
    return null
  }
}

function formatPrice(price: number): string {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`
  if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`
  return `₹${price.toLocaleString('en-IN')}`
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const data = await fetchShareData(token)
  if (!data) return { title: 'Property | AINO' }
  return {
    title: `${data.project.name} | AINO Real Estate`,
    description: `${data.project.name} in ${data.project.location}`,
    openGraph: {
      title: data.project.name,
      description: `${data.project.name} in ${data.project.location}`,
      images: data.project.imageUrl ? [data.project.imageUrl] : [],
    },
  }
}

export default async function SharePage({
  params,
}: Readonly<{
  params: Promise<{ token: string }>
}>) {
  const { token } = await params
  const data = await fetchShareData(token)

  if (!data) {
    notFound()
  }

  const { project, units, agent, shareToken, agentId } = data

  const available = units.filter((u) => u.status === 'available').length
  const booked = units.filter((u) => u.status === 'booked').length
  const sold = units.filter((u) => u.status === 'sold').length

  const whatsappUrl = agent?.phone
    ? `https://wa.me/91${agent.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
        `Hi, I'm interested in ${project.name}. Can you share more details?`
      )}`
    : null

  return (
    <>
      <TrackClient token={shareToken} />

      <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
        {/* Hero */}
        <div style={{ position: 'relative', width: '100%', height: 280, overflow: 'hidden' }}>
          {project.imageUrl ? (
            <img
              src={project.imageUrl}
              alt={project.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: 'linear-gradient(135deg, #1e3c6e 0%, #2a5298 50%, #1e3c6e 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Building2 size={64} color="rgba(255,255,255,0.15)" />
            </div>
          )}
          {/* Overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.18) 50%, transparent 100%)',
          }} />

          {/* AINO Badge */}
          <div style={{
            position: 'absolute', top: 16, left: 16,
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
            borderRadius: 12, padding: '6px 12px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
          }}>
            <div style={{
              width: 20, height: 20, background: '#1e3c6e', borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 11 }}>A</span>
            </div>
            <span style={{ color: '#1e3c6e', fontWeight: 700, fontSize: 13 }}>AINO</span>
          </div>

          {/* Project info */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 20px 24px' }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', margin: 0 }}>{project.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 4 }}>
              <MapPin size={13} />
              <span>{project.location}</span>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: 'Total Units', value: project.totalUnits, color: '#0f172a' },
              { label: 'Available',   value: available,          color: '#059669' },
              { label: 'Booked',      value: booked,             color: '#d97706' },
              { label: 'Sold',        value: sold,               color: '#ef4444' },
            ].map((stat) => (
              <div key={stat.label} style={{
                background: '#fff', border: '1px solid #e2e8f0',
                borderRadius: 16, padding: '16px 12px', textAlign: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}>
                <p style={{ fontSize: 26, fontWeight: 700, color: stat.color, margin: 0 }}>{stat.value}</p>
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Price range */}
          {!!(project.priceMin || project.priceMax) && (
            <div style={{
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16,
              padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <div style={{ padding: 10, background: 'rgba(30,60,110,0.08)', borderRadius: 12, display: 'flex' }}>
                <Home size={20} color="#1e3c6e" />
              </div>
              <div>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Price Range</p>
                <p style={{ fontSize: 17, fontWeight: 700, color: '#1e3c6e', margin: 0 }}>
                  {(() => {
                    if (project.priceMin && project.priceMax) return `${formatPrice(project.priceMin)} – ${formatPrice(project.priceMax)}`
                    if (project.priceMin) return `From ${formatPrice(project.priceMin)}`
                    return ''
                  })()}
                </p>
              </div>
            </div>
          )}

          {/* Layout image */}
          {project.layoutUrl && (
            <div style={{
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16,
              padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}>
              <p style={{ fontWeight: 600, fontSize: 16, color: '#0f172a', marginBottom: 12 }}>Floor Plan</p>
              <img
                src={project.layoutUrl}
                alt="Floor Plan"
                style={{ width: '100%', borderRadius: 12, border: '1px solid #f1f5f9', objectFit: 'contain', maxHeight: 384 }}
              />
            </div>
          )}

          {/* Plot Map */}
          <div style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 24px', background: '#1e3c6e',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Map size={18} color="rgba(255,255,255,0.65)" />
                <span style={{ fontWeight: 600, fontSize: 17, color: '#fff' }}>Plot Map</span>
              </div>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{units.length} plots</span>
            </div>
            <div style={{ padding: 24 }}>
              <PlotMapGrid units={units} shareToken={shareToken} agentId={agentId} />
            </div>
          </div>

          {/* Agent Card */}
          {agent && (
            <div style={{
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16,
              padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}>
              <p style={{ fontWeight: 600, fontSize: 16, color: '#0f172a', marginBottom: 16 }}>Your Agent</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 52, height: 52, background: '#1e3c6e', borderRadius: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 20, fontWeight: 700, flexShrink: 0,
                }}>
                  {agent.name?.charAt(0)?.toUpperCase() ?? 'A'}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, color: '#0f172a', margin: 0 }}>{agent.name}</p>
                  {agent.phone && (
                    <p style={{ fontSize: 13, color: '#64748b', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Phone size={12} />
                      {agent.phone}
                    </p>
                  )}
                </div>
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 16px', background: '#25D366', color: '#fff',
                      borderRadius: 12, fontSize: 13, fontWeight: 500,
                      textDecoration: 'none',
                    }}
                  >
                    <MessageCircle size={15} />
                    WhatsApp
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <footer style={{ textAlign: 'center', padding: '24px 0', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{
                width: 28, height: 28, background: '#1e3c6e', borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ color: '#fff', fontWeight: 900, fontSize: 11 }}>A</span>
              </div>
              <span style={{ fontWeight: 700, color: '#1e3c6e', fontSize: 13 }}>AINO Real Estate</span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: 11 }}>
              &copy; {new Date().getFullYear()} AINO. All rights reserved.
            </p>
          </footer>
        </div>
      </div>
    </>
  )
}
