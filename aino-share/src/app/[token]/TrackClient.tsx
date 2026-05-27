'use client'

import { useEffect } from 'react'
import axios from 'axios'

interface TrackClientProps {
  token: string
}

export function TrackClient({ token }: TrackClientProps) {
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    if (!apiUrl || !token) return

    axios
      .post(`${apiUrl}/leads/track/${token}`)
      .catch(() => {
        // Silent fail — tracking is non-critical
      })
  }, [token])

  return null
}
