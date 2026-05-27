'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Clock, LogOut } from 'lucide-react'
import api from '@/lib/api'
import { toast } from 'sonner'

export default function PendingPage() {
  const router = useRouter()
  const { user, logout, loadFromStorage, isLoaded } = useAuthStore()

  useEffect(() => {
    loadFromStorage()
  }, [loadFromStorage])

  useEffect(() => {
    if (!isLoaded) return
    if (!user) {
      router.push('/login')
    }
  }, [user, isLoaded, router])

  async function handleLogout() {
    try {
      await api.post('/auth/logout')
    } catch {}
    logout()
    router.push('/login')
    toast.success('Logged out')
  }

  if (!user) return null

  const roleLabel = user.role === 'agent' ? 'Agent' : user.role === 'owner' ? 'Owner' : user.role

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3c6e] via-[#2a5298] to-[#1e3c6e] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="bg-[#1e3c6e] px-8 py-8 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Clock className="text-amber-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white">Pending Approval</h1>
          <p className="text-white/60 text-sm mt-1">Your account is under review</p>
        </div>

        <div className="px-8 py-8 text-center">
          <div className="inline-flex items-center gap-2 bg-slate-100 rounded-full px-4 py-2 mb-4">
            <div className="w-8 h-8 bg-[#1e3c6e] rounded-full flex items-center justify-center text-white text-sm font-semibold">
              {user.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-900">{user.name}</p>
              <p className="text-xs text-slate-400">{roleLabel}</p>
            </div>
          </div>

          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Awaiting Admin Approval
          </h2>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            Your account as a <strong>{roleLabel}</strong> has been created successfully.
            An administrator will review and approve your account shortly.
            You will be notified once approved.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
            <p className="text-amber-800 text-sm font-medium">What happens next?</p>
            <ul className="mt-2 space-y-1">
              <li className="text-amber-700 text-xs flex items-start gap-2">
                <span className="mt-0.5">•</span>
                Admin reviews your profile and credentials
              </li>
              <li className="text-amber-700 text-xs flex items-start gap-2">
                <span className="mt-0.5">•</span>
                You receive a notification upon approval
              </li>
              <li className="text-amber-700 text-xs flex items-start gap-2">
                <span className="mt-0.5">•</span>
                Full access granted after approval
              </li>
            </ul>
          </div>

          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full"
          >
            <LogOut size={16} /> Sign Out
          </Button>
        </div>
      </div>
    </div>
  )
}
