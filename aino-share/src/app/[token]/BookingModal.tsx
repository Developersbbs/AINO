'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import axios from 'axios'
import { toast } from 'sonner'
import { X, Loader2 } from 'lucide-react'

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  phone: z
    .string()
    .min(10, 'Enter 10-digit phone')
    .max(10, 'Enter 10-digit phone')
    .regex(/^\d+$/, 'Digits only'),
  note: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Unit {
  id: string
  unitNumber: string
  sqFt: number
  price: number
  facing: string
}

interface BookingModalProps {
  unit: Unit
  shareToken: string
  agentId: string
  onClose: () => void
}

const INPUT: React.CSSProperties = {
  width: '100%',
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  color: '#0f172a',
  background: '#fff',
}

const LABEL: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: '#374151',
  marginBottom: 6,
  display: 'block',
}

const ERR: React.CSSProperties = {
  fontSize: 11,
  color: '#ef4444',
  marginTop: 4,
}

export function BookingModal({ unit, shareToken, agentId, onClose }: Readonly<BookingModalProps>) {
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/bookings`, {
        unitId: unit.id,
        agentId,
        shareToken,
        customerName: data.name,
        customerPhone: `+91${data.phone}`,
      })
      setSubmitted(true)
    } catch {
      toast.error('Failed to submit booking. Please try again.')
    }
  }

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
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          background: '#1e3c6e',
        }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 600, color: '#fff', margin: 0 }}>
              Book Unit {unit.unitNumber}
            </h2>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
              {unit.sqFt ? `${unit.sqFt.toLocaleString()} sqft` : ''}
              {unit.sqFt && unit.facing ? ' · ' : ''}
              {unit.facing ?? ''}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)', border: 'none',
              borderRadius: 8, padding: 6, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{
                width: 56, height: 56, background: '#dcfce7', borderRadius: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px',
              }}>
                <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 600, color: '#0f172a', margin: '0 0 6px' }}>
                Booking Submitted!
              </h3>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                Your request for Unit {unit.unitNumber} has been submitted. Your agent will contact you shortly.
              </p>
              <button
                onClick={onClose}
                style={{
                  marginTop: 20, padding: '10px 24px',
                  background: '#1e3c6e', color: '#fff', border: 'none',
                  borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Name */}
              <div>
                <label htmlFor="bm-name" style={LABEL}>Full Name</label>
                <input
                  id="bm-name"
                  type="text"
                  placeholder="John Doe"
                  style={INPUT}
                  {...register('name')}
                />
                {errors.name && <p style={ERR}>{errors.name.message}</p>}
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="bm-phone" style={LABEL}>Phone Number</label>
                <div style={{ display: 'flex' }}>
                  <span style={{
                    display: 'flex', alignItems: 'center',
                    padding: '10px 12px',
                    background: '#f8fafc', border: '1px solid #e2e8f0',
                    borderRight: 'none', borderRadius: '10px 0 0 10px',
                    fontSize: 13, color: '#64748b', flexShrink: 0,
                  }}>
                    +91
                  </span>
                  <input
                    id="bm-phone"
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="9876543210"
                    style={{ ...INPUT, borderRadius: '0 10px 10px 0' }}
                    {...register('phone')}
                  />
                </div>
                {errors.phone && <p style={ERR}>{errors.phone.message}</p>}
              </div>

              {/* Note */}
              <div>
                <label htmlFor="bm-note" style={LABEL}>Note (optional)</label>
                <textarea
                  id="bm-note"
                  placeholder="Any specific requirements or questions..."
                  rows={3}
                  style={{ ...INPUT, resize: 'none', lineHeight: 1.5 }}
                  {...register('note')}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 1, padding: '11px 0',
                    border: '1px solid #e2e8f0', background: '#fff',
                    color: '#374151', borderRadius: 10,
                    fontSize: 14, fontWeight: 500, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    flex: 1, padding: '11px 0',
                    background: isSubmitting ? '#93a5c4' : '#1e3c6e',
                    color: '#fff', border: 'none', borderRadius: 10,
                    fontSize: 14, fontWeight: 500, cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                  {isSubmitting ? 'Submitting...' : 'Submit Booking'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
