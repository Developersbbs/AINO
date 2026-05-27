import { useRef } from 'react';
import { Platform } from 'react-native';
import { RecaptchaVerifier } from 'firebase/auth';
import { auth } from '../config/firebase';

export function useRecaptchaVerifier() {
  const webVerifierRef = useRef<RecaptchaVerifier | null>(null);

  const getVerifier = (): RecaptchaVerifier | null => {
    if (Platform.OS === 'web') {
      if (!webVerifierRef.current) {
        webVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
        });
      }
      return webVerifierRef.current;
    }
    return null;
  };

  const clearWebVerifier = () => {
    if (webVerifierRef.current) {
      webVerifierRef.current.clear();
      webVerifierRef.current = null;
    }
  };

  return { getVerifier, clearWebVerifier };
}
