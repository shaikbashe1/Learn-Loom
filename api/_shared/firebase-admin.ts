import * as admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
  let credential;

  if (serviceAccountStr) {
    try {
      const serviceAccount = JSON.parse(serviceAccountStr);
      credential = admin.credential.cert(serviceAccount);
    } catch (err) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT json', err);
    }
  }

  if (!credential) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
      credential = admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      });
    }
  }

  if (!credential) {
    console.warn('Firebase Admin is not configured properly. Missing service account credentials.');
    // Fallback to default application credentials if running in GCP
    return admin.initializeApp();
  }

  return admin.initializeApp({
    credential,
  });
}

const app = initializeFirebaseAdmin();
export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
