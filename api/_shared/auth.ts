// Shared authentication helper for API routes
// Verifies Firebase JWT tokens

import { adminAuth, adminDb } from './firebase-admin';

export interface AuthUser {
  id: string;
  email?: string;
  role?: string;
}

export async function verifyAuth(req: Request): Promise<AuthUser | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Fetch user profile from Firestore to get the role
    const profileDoc = await adminDb.collection('profiles').doc(decodedToken.uid).get();
    let role = 'student'; // Default role
    
    if (profileDoc.exists) {
      const profileData = profileDoc.data();
      if (profileData && profileData.role) {
        role = profileData.role;
      }
    }

    return { 
      id: decodedToken.uid, 
      email: decodedToken.email, 
      role 
    };
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return null;
  }
}

export function unauthorizedResponse(): Response {
  return new Response(
    JSON.stringify({ error: 'Unauthorized. A valid Firebase access token is required.' }),
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
