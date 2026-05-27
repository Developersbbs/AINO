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
import { Phone, ArrowRight, User, Mail } from 'lucide-react'
import Link from 'next/link'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z
    .string()
    .min(10, 'Enter a 10-digit number')
    .max(10, 'Enter a 10-digit number')
    .regex(/^\d+$/, 'Digits only'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  role: z.enum(['agent', 'owner'], { required_error: 'Select a role' }),
})

type FormData = z.infer<typeof schema>

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier
    confirmationResult?: ConfirmationResult
    registerData?: { name: string; email?: string; role: string }
  }
}

export default function RegisterPage() {
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
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container-register', {
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
      sessionStorage.setItem('otp_phone', data.phone)
      sessionStorage.setItem('otp_flow', 'register')
      window.registerData = {
        name: data.name,
        email: data.email || undefined,
        role: data.role,
      }
      sessionStorage.setItem('register_data', JSON.stringify(window.registerData))
      router.push('/otp')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : ''
      toast.error(msg.includes('invalid-phone') ? 'Invalid phone number' : 'Failed to send OTP. Try again.')
      window.recaptchaVerifier = undefined
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3c6e] via-[#2a5298] to-[#1e3c6e] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-[#1e3c6e] px-8 py-8 text-center">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3">
              <span className="text-[#1e3c6e] font-black text-2xl">A</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Join AINO</h1>
            <p className="text-white/60 text-sm mt-1">Create your account to get started</p>
          </div>

          <div className="px-8 py-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-1">Create Account</h2>
            <p className="text-slate-500 text-sm mb-6">Fill in your details below</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Full Name"
                leftAddon={<User size={14} />}
                placeholder="John Doe"
                error={errors.name?.message}
                {...register('name')}
              />

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

              <Input
                label="Email (optional)"
                leftAddon={<Mail size={14} />}
                placeholder="john@example.com"
                type="email"
                error={errors.email?.message}
                {...register('email')}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Role</label>
                <select
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1e3c6e]/30 focus:border-[#1e3c6e]"
                  {...register('role')}
                >
                  <option value="">Select your role</option>
                  <option value="agent">Agent</option>
                  <option value="owner">Owner</option>
                </select>
                {errors.role && <p className="text-xs text-red-500">{errors.role.message}</p>}
              </div>

              <div id="recaptcha-container-register" ref={recaptchaContainerRef} />

              <Button type="submit" loading={loading} className="w-full" size="lg">
                Send OTP <ArrowRight size={16} />
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-500">
                Already have an account?{' '}
                <Link href="/login" className="text-[#1e3c6e] font-semibold hover:underline">
                  Sign in
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
