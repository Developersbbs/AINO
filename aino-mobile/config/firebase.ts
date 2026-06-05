import { Platform } from 'react-native';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, browserLocalPersistence } from 'firebase/auth';
import type { Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase for all platforms.
// On native, skip when env vars are absent (e.g. EAS builds without .env.local).
function initAuth(): Auth | null {
  if (!firebaseConfig.apiKey) return null;
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    if (Platform.OS === 'web') {
      try {
        return initializeAuth(app, { persistence: browserLocalPersistence });
      } catch {
        return getAuth(app);
      }
    }
    // Native: plain getAuth (no browser persistence needed)
    return getAuth(app);
  } catch {
    return null;
  }
}

export const auth = initAuth() as Auth;
