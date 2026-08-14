export async function fetchAIMentorStream(contents: any[], signal?: AbortSignal, stream = true) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY; 
  if (!apiKey) {
    // Return a mocked error response to match standard fetch API
    return new Response(JSON.stringify({ error: "Missing VITE_GEMINI_API_KEY in environment variables. Please add it to your .env.local file and restart the server." }), { status: 400 });
  }

  const GATEWAY_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${apiKey}${stream ? '&alt=sse' : ''}`;
  
  // To retain compatibility with the original serverless function which pre-pended a system instruction
  const systemInstruction = {
    role: 'user',
    parts: [{ text: `You are Quovexi AI Mentor – an expert computer science and programming tutor.
Your role:
- Answer coding, DSA, web dev, data science, and interview-prep questions clearly
- Provide step-by-step explanations with working code examples
- Encourage learners and suggest next steps
- Keep answers concise and practical
- NEVER provide answers to exam/test questions directly; guide the student to think` }],
  };

  const fullContents = [systemInstruction, ...contents];

  return fetch(GATEWAY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: fullContents }),
    signal
  });
}
