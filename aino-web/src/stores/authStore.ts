'use client'

import { create } from 'zustand'
import Cookies from 'js-cookie'

export interface AuthUser {
  id: string
  name: string
  phone: string
  email?: string
  role: 'admin' | 'agent' | 'owner'
  status: 'pending' | 'approved' | 'active' | 'deactivated'
  avatar?: string
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  isLoaded: boolean
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void
  logout: () => void
  loadFromStorage: () => void
}

const COOKIE_OPTIONS = { expires: 7, secure: true, sameSite: 'strict' as const }

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoaded: false,

  setAuth: (user, accessToken, refreshToken) => {
    Cookies.set('accessToken', accessToken, COOKIE_OPTIONS)
    Cookies.set('refreshToken', refreshToken, COOKIE_OPTIONS)
    Cookies.set('userRole', user.role, COOKIE_OPTIONS)
    try {
      localStorage.setItem('aino_user', JSON.stringify(user))
    } catch {}
    set({ user, accessToken, refreshToken, isLoaded: true })
  },

  logout: () => {
    Cookies.remove('accessToken')
    Cookies.remove('refreshToken')
    Cookies.remove('userRole')
    try {
      localStorage.removeItem('aino_user')
    } catch {}
    set({ user: null, accessToken: null, refreshToken: null, isLoaded: true })
  },

  loadFromStorage: () => {
    const accessToken = Cookies.get('accessToken') ?? null
    const refreshToken = Cookies.get('refreshToken') ?? null
    let user: AuthUser | null = null
    try {
      const stored = localStorage.getItem('aino_user')
      if (stored) user = JSON.parse(stored)
    } catch {}
    set({ user, accessToken, refreshToken, isLoaded: true })
  },
}))
