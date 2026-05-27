import { notFound } from 'next/navigation'
import { TrackClient } from './TrackClient'
import { UnitsGrid } from './UnitsGrid'
import { MapPin, Home, Building2, Phone, MessageCircle } from 'lucide-react'
import type { Metadata } from 'next'

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

interface ShareData {
  project: {
    id: string
    name: string
    location: string
    description: string
    totalUnits: number
    availableUnits: number
    priceMin?: number
    priceMax?: number
    imageUrl?: string
    layoutUrl?: string
  }
  units: Unit[]
  agent: {
    name: string
    phone: string
  }
  shareToken: string
}

async function fetchShareData(token: string): Promise<ShareData | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'https://aino.sbbstest.in/api'
  try {
    const res = await fetch(`${apiUrl}/leads/public/${token}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    return res.json()
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
    description: data.project.description ?? `${data.project.name} in ${data.project.location}`,
    openGraph: {
      title: data.project.name,
      description: data.project.description,
      images: data.project.imageUrl ? [data.project.imageUrl] : [],
    },
  }
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const data = await fetchShareData(token)

  if (!data) {
    notFound()
  }

  const { project, units, agent, shareToken } = data

  const available = units.filter((u) => u.status === 'available').length
  const booked = units.filter((u) => u.status === 'booked').length
  const sold = units.filter((u) => u.status === 'sold').length

  const whatsappUrl = agent?.phone
    ? `https://wa.me/91${agent.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
        `Hi, I'm interested in ${project.name}. Can you share more details?`
      )}`
    : null

  return (
    <>
      <TrackClient token={shareToken} />

      <div className="min-h-screen bg-[#f8fafc]">
        {/* Hero */}
        <div className="relative w-full h-64 sm:h-80 md:h-96 overflow-hidden">
          {project.imageUrl ? (
            <img
              src={project.imageUrl}
              alt={project.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#1e3c6e] via-[#2a5298] to-[#1e3c6e] flex items-center justify-center">
              <Building2 size={64} className="text-white/20" />
            </div>
          )}
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* AINO Badge */}
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-1.5 shadow-sm">
            <div className="w-5 h-5 bg-[#1e3c6e] rounded-md flex items-center justify-center">
              <span className="text-white font-black text-xs">A</span>
            </div>
            <span className="text-[#1e3c6e] font-bold text-sm">AINO</span>
          </div>

          {/* Project info overlay */}
          <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 pb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">{project.name}</h1>
            <div className="flex items-center gap-1.5 text-white/80 text-sm">
              <MapPin size={14} />
              <span>{project.location}</span>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Units', value: project.totalUnits, color: 'text-slate-900' },
              { label: 'Available', value: available, color: 'text-emerald-600' },
              { label: 'Booked', value: booked, color: 'text-amber-600' },
              { label: 'Sold', value: sold, color: 'text-red-500' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm"
              >
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-slate-400 text-xs mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Price range */}
          {(project.priceMin || project.priceMax) && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-[#1e3c6e]/10 rounded-xl">
                <Home size={20} className="text-[#1e3c6e]" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Price Range</p>
                <p className="text-lg font-bold text-[#1e3c6e]">
                  {project.priceMin && project.priceMax
                    ? `${formatPrice(project.priceMin)} – ${formatPrice(project.priceMax)}`
                    : project.priceMin
                    ? `From ${formatPrice(project.priceMin)}`
                    : ''}
                </p>
              </div>
            </div>
          )}

          {/* Description */}
          {project.description && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="font-semibold text-slate-900 text-lg mb-3">About this Project</h2>
              <p className="text-slate-600 leading-relaxed">{project.description}</p>
            </div>
          )}

          {/* Layout image */}
          {project.layoutUrl && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="font-semibold text-slate-900 text-lg mb-3">Floor Plan</h2>
              <img
                src={project.layoutUrl}
                alt="Floor Plan"
                className="w-full rounded-xl border border-slate-100 object-contain max-h-96"
              />
            </div>
          )}

          {/* Units */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900 text-lg mb-5">Available Units</h2>
            <UnitsGrid units={units} shareToken={shareToken} />
          </div>

          {/* Agent Card */}
          {agent && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="font-semibold text-slate-900 text-lg mb-4">Your Agent</h2>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-[#1e3c6e] rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                  {agent.name?.charAt(0)?.toUpperCase() ?? 'A'}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{agent.name}</p>
                  <p className="text-slate-500 text-sm flex items-center gap-1 mt-0.5">
                    <Phone size={12} />
                    {agent.phone}
                  </p>
                </div>
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#25D366] text-white rounded-xl text-sm font-medium hover:bg-[#20bc5a] transition-colors"
                  >
                    <MessageCircle size={16} />
                    WhatsApp
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <footer className="text-center py-6 border-t border-slate-200">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-7 h-7 bg-[#1e3c6e] rounded-lg flex items-center justify-center">
                <span className="text-white font-black text-xs">A</span>
              </div>
              <span className="font-bold text-[#1e3c6e] text-sm">AINO Real Estate</span>
            </div>
            <p className="text-slate-400 text-xs">
              &copy; {new Date().getFullYear()} AINO. All rights reserved.
            </p>
          </footer>
        </div>
      </div>
    </>
  )
}
