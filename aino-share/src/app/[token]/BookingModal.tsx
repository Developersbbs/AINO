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
  floor: number
  price: number
  type: string
}

interface BookingModalProps {
  unit: Unit
  shareToken: string
  onClose: () => void
}

export function BookingModal({ unit, shareToken, onClose }: BookingModalProps) {
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
        shareToken,
        customerName: data.name,
        customerPhone: `+91${data.phone}`,
        note: data.note,
      })
      setSubmitted(true)
    } catch {
      toast.error('Failed to submit booking. Please try again.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#1e3c6e]">
          <div>
            <h2 className="text-lg font-semibold text-white">Book Unit {unit.unitNumber}</h2>
            <p className="text-white/60 text-xs mt-0.5">
              {unit.type} · Floor {unit.floor}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {submitted ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">Booking Submitted!</h3>
              <p className="text-slate-500 text-sm">
                Your booking request for Unit {unit.unitNumber} has been submitted. Your agent will contact you shortly.
              </p>
              <button
                onClick={onClose}
                className="mt-5 px-5 py-2 bg-[#1e3c6e] text-white rounded-xl text-sm font-medium hover:bg-[#152d54] transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Full Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3c6e]/30 focus:border-[#1e3c6e]"
                  {...register('name')}
                />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Phone Number</label>
                <div className="flex">
                  <span className="flex items-center px-3 bg-slate-100 border border-r-0 border-slate-200 rounded-l-lg text-sm text-slate-500">
                    +91
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="9876543210"
                    className="flex-1 rounded-r-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3c6e]/30 focus:border-[#1e3c6e]"
                    {...register('phone')}
                  />
                </div>
                {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Note (optional)</label>
                <textarea
                  placeholder="Any specific requirements or questions..."
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3c6e]/30 focus:border-[#1e3c6e] resize-none"
                  {...register('note')}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1e3c6e] text-white rounded-xl text-sm font-medium hover:bg-[#152d54] disabled:opacity-50 transition-colors"
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
