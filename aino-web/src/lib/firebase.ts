'use client'

import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { initializeAppCheck, ReCaptchaV3Provider, CustomProvider } from 'firebase/app-check'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

if (globalThis.window !== undefined) {
  if (process.env.NODE_ENV === 'development') {
    // The Firebase SDK prints the debug token to the console automatically.
    // Intercept it here and also show it in an alert so it's impossible to miss.
    ;(globalThis as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true

    const origLog = console.log.bind(console)
    console.log = (...args: unknown[]) => {
      origLog(...args)
      const msg = args[0]
      if (typeof msg === 'string' && msg.startsWith('App Check debug token:')) {
        const token = msg.split('App Check debug token:')[1]?.trim().split(/\s/)[0]
        if (token) {
          origLog('%c[AINO DEV] Copy this token → Firebase Console → App Check → your web app → Manage debug tokens', 'background:#1e3c6e;color:#fff;padding:4px 8px')
          origLog('%c' + token, 'font-size:16px;font-weight:bold;color:#1e3c6e')
        }
      }
    }

    // CustomProvider stub — debug token system overrides getToken() entirely.
    initializeAppCheck(app, {
      provider: new CustomProvider({ getToken: async () => ({ token: '', expireTimeMillis: 0 }) }),
      isTokenAutoRefreshEnabled: false,
    })
  } else if (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    })
  }
}

export const auth = getAuth(app)
export default app
