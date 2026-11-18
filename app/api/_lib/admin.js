// Firebase Admin SDK, used only on the server (Vercel functions, or the
// local Vite dev server). It can change any user's password, so it must
// never be imported from src/.
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function app() {
  if (getApps().length) return getApps()[0];
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    // Emulators need no credentials.
    return initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'demo-fridgewise' });
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');
  return initializeApp({ credential: cert(JSON.parse(raw)) });
}

export const adminAuth = () => getAuth(app());
export const adminDb = () => getFirestore(app());
