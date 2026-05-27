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

// Firebase is only used on web — native OTP goes through the backend API.
// Skipping init on native prevents a crash when Firebase env vars are absent
// from the EAS build (EAS does not load .env.local).
function initWebAuth(): Auth | null {
  if (Platform.OS !== 'web') return null;
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  try {
    return initializeAuth(app, { persistence: browserLocalPersistence });
  } catch {
    return getAuth(app);
  }
}

// Callers only access `auth` inside `Platform.OS === 'web'` guards, so the
// null-on-native value is never reached at runtime.
export const auth = initWebAuth() as Auth;
