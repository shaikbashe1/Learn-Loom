export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const apiKey = process.env.INTEGRATIONS_API_KEY || process.env.GEMINI_API_KEY;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  const data = await res.json();
  return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
