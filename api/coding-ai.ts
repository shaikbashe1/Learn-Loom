import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, code, language, problemTitle, problemDescription, error } = req.body;

    let prompt = '';

    switch (action) {
      case 'explain':
        prompt = `Explain the following coding problem clearly and simply without providing the code solution.\n\nProblem Title: ${problemTitle}\n\nDescription: ${problemDescription}`;
        break;
      case 'hint':
        prompt = `The user is trying to solve "${problemTitle}". Provide a small, conceptual hint to help them progress. DO NOT provide any code. Here is their current code in ${language}:\n\n${code}`;
        break;
      case 'debug':
        prompt = `The user is trying to solve "${problemTitle}" in ${language}. Their code has an error or is failing. Provide a hint on what might be wrong, but DO NOT provide the exact corrected code.\n\nCurrent Code:\n${code}\n\nError/Context:\n${error}`;
        break;
      case 'complexity':
        prompt = `Analyze the time and space complexity of the following ${language} code for the problem "${problemTitle}". Explain briefly.\n\nCode:\n${code}`;
        break;
      case 'optimize':
        prompt = `Provide suggestions on how to optimize the following ${language} code for the problem "${problemTitle}". Do not rewrite the code for them, just explain the conceptual optimization.\n\nCode:\n${code}`;
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.status(200).json({ result: text });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: 'Failed to generate AI response' });
  }
}
