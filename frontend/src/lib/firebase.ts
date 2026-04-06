import { initializeApp, getApps } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyCiE25EsjcsZaV4DsVgQXx7H2kXX84Y11I",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "vendorcenter-staging.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "vendorcenter-staging",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "vendorcenter-staging.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "570064694297",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:570064694297:web:b6bf2985bc45582ebc8e88",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? "G-KXZBGM7CG7",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

// Use browser language for reCAPTCHA
auth.useDeviceLanguage();

export { auth, RecaptchaVerifier, signInWithPhoneNumber };
export type { ConfirmationResult };
