import { useRef } from 'react';
import { Platform } from 'react-native';
import { RecaptchaVerifier, type ApplicationVerifier } from 'firebase/auth';
import { auth } from '../config/firebase';

// Satisfies Firebase's internal ApplicationVerifier contract on native.
// Firebase test phone numbers bypass reCAPTCHA server-side, so the token
// returned by verify() is irrelevant — only _reset/_delete must exist.
const nativeDummyVerifier: ApplicationVerifier & { _reset: () => void; _delete: () => Promise<void> } = {
  type: 'recaptcha',
  verify: async () => '',
  _reset: () => {},
  _delete: async () => {},
};

export function useRecaptchaVerifier() {
  const webVerifierRef = useRef<RecaptchaVerifier | null>(null);

  const getVerifier = (): ApplicationVerifier => {
    if (Platform.OS !== 'web') return nativeDummyVerifier;
    webVerifierRef.current ??= new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
    return webVerifierRef.current;
  };

  const clearWebVerifier = () => {
    if (webVerifierRef.current) {
      webVerifierRef.current.clear();
      webVerifierRef.current = null;
    }
  };

  return { getVerifier, clearWebVerifier };
}
