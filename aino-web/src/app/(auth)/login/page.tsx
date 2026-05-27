'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { auth } from '@/lib/firebase'
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import { Phone, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const schema = z.object({
  phone: z
    .string()
    .min(10, 'Enter a valid phone number')
    .max(10, 'Enter a 10-digit number')
    .regex(/^\d+$/, 'Digits only'),
})

type FormData = z.infer<typeof schema>

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier
    confirmationResult?: ConfirmationResult
  }
}

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const recaptchaContainerRef = useRef<HTMLDivElement>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  function setupRecaptcha() {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {},
      })
    }
  }

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      setupRecaptcha()
      const appVerifier = window.recaptchaVerifier!
      const phoneNumber = `+91${data.phone}`
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier)
      window.confirmationResult = confirmation
      // Store phone in sessionStorage for OTP page
      sessionStorage.setItem('otp_phone', data.phone)
      sessionStorage.setItem('otp_flow', 'login')
      router.push('/otp')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to send OTP'
      toast.error(msg.includes('invalid-phone') ? 'Invalid phone number' : 'Failed to send OTP. Try again.')
      window.recaptchaVerifier = undefined
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3c6e] via-[#2a5298] to-[#1e3c6e] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-[#1e3c6e] px-8 py-8 text-center">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3">
              <span className="text-[#1e3c6e] font-black text-2xl">A</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Welcome to AINO</h1>
            <p className="text-white/60 text-sm mt-1">Real Estate Management Platform</p>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-1">Sign In</h2>
            <p className="text-slate-500 text-sm mb-6">Enter your phone number to receive an OTP</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Phone Number"
                leftAddon={
                  <span className="flex items-center gap-1 text-sm text-slate-600">
                    <Phone size={14} />
                    +91
                  </span>
                }
                placeholder="9876543210"
                maxLength={10}
                inputMode="numeric"
                error={errors.phone?.message}
                {...register('phone')}
              />

              <div id="recaptcha-container" ref={recaptchaContainerRef} />

              <Button type="submit" loading={loading} className="w-full" size="lg">
                Send OTP <ArrowRight size={16} />
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-500">
                New to AINO?{' '}
                <Link href="/register" className="text-[#1e3c6e] font-semibold hover:underline">
                  Create account
                </Link>
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-white/40 text-xs mt-6">
          &copy; 2025 AINO. All rights reserved.
        </p>
      </div>
    </div>
  )
}
