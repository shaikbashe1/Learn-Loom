import { auth } from '@/db/firebase';

export async function fetchAIMentorStream(contents: any[], signal?: AbortSignal, stream = true) {
  let token = '';
  try {
    if (auth.currentUser) {
      token = await auth.currentUser.getIdToken();
    }
  } catch (error) {
    console.error('Failed to get auth token', error);
  }

  // The Vercel backend URL
  const GATEWAY_URL = `/api/ai-mentor`;

  return fetch(GATEWAY_URL, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    // The serverless function already pre-pends the system instruction,
    // so we just pass the user contents directly.
    body: JSON.stringify({ contents }),
    signal
  });
}
