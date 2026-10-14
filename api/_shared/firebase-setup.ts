import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    return getApp();
  }

  const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
  let credential;

  if (serviceAccountStr) {
    try {
      const serviceAccount = JSON.parse(serviceAccountStr);
      credential = cert(serviceAccount);
    } catch (err) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT json', err);
    }
  }

  if (!credential) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
      credential = cert({
        projectId,
        clientEmail,
        privateKey,
      });
    }
  }

  if (!credential) {
    console.warn('Firebase Admin is not configured properly. Missing service account credentials.');
    // To prevent Vercel 500 crash on module load, initialize with a dummy project ID
    // so it doesn't crash the entire function immediately.
    return initializeApp({ projectId: 'demo-project' });
  }

  return initializeApp({
    credential,
  });
}

const app = initializeFirebaseAdmin();
export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
