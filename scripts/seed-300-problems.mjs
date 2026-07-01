import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

// Problem distribution matrix exactly as requested
const categories = [
  { name: 'Fundamentals', easy: 10, medium: 5, hard: 0 },
  { name: 'Strings', easy: 10, medium: 10, hard: 2 },
  { name: 'Arrays', easy: 15, medium: 10, hard: 3 },
  { name: 'Searching', easy: 5, medium: 5, hard: 2 },
  { name: 'Sorting', easy: 5, medium: 5, hard: 2 },
  { name: 'Mathematics', easy: 10, medium: 5, hard: 2 },
  { name: 'Bit Manipulation', easy: 5, medium: 5, hard: 2 },
  { name: 'Stack', easy: 5, medium: 5, hard: 2 },
  { name: 'Queue', easy: 5, medium: 5, hard: 2 },
  { name: 'Linked List', easy: 5, medium: 10, hard: 3 },
  { name: 'Trees', easy: 5, medium: 10, hard: 5 },
  { name: 'Binary Search Trees', easy: 5, medium: 5, hard: 2 },
  { name: 'Heap', easy: 5, medium: 5, hard: 2 },
  { name: 'Graphs', easy: 5, medium: 10, hard: 7 },
  { name: 'Dynamic Programming', easy: 5, medium: 10, hard: 10 },
  { name: 'Greedy', easy: 5, medium: 5, hard: 5 },
  { name: 'Backtracking', easy: 5, medium: 5, hard: 5 },
  { name: 'Hashing', easy: 5, medium: 5, hard: 2 },
  { name: 'Trie', easy: 0, medium: 2, hard: 2 },
  { name: 'SQL', easy: 2, medium: 2, hard: 0 },
  { name: 'Object-Oriented Programming', easy: 2, medium: 0, hard: 0 },
];

// Helper to wait to avoid rate limits
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function generateBatch(category, difficulty, count) {
  if (count <= 0) return [];
  console.log(`Generating ${count} ${difficulty} problems for ${category}...`);
  
  const prompt = `You are an expert algorithm engineer and curriculum designer. 
Generate a JSON array of exactly ${count} unique coding problems for the category "${category}" with difficulty "${difficulty}".
Do NOT use dummy text. Do NOT directly copy from LeetCode or HackerRank; use original scenarios (e.g. "Space Fleet Routing" instead of "Two Sum").

Each object in the JSON array MUST have this exact schema:
{
  "title": "String - Original problem name",
  "difficulty": "${difficulty}",
  "category": "${category}",
  "tags": ["String", "String"],
  "description": "String - The problem statement in markdown. Include constraints, input/output format.",
  "examples": [
    { "input": "String", "output": "String", "explanation": "String" }
  ],
  "constraints": ["String"],
  "starter_code": {
    "java": "String - Valid compilable starter code",
    "python": "String - Valid executable starter code",
    "c": "String",
    "cpp": "String",
    "javascript": "String"
  },
  "test_cases": [
    { "input": "String", "expectedOutput": "String" } // Exactly 13 test cases (3 simple, 10 hidden edge cases)
  ],
  "time_limit_ms": 2000,
  "memory_limit_kb": 256000,
  "expected_time_complexity": "O(N)",
  "expected_space_complexity": "O(1)",
  "estimated_solve_time_min": Number (e.g., 15 for Easy, 30 for Medium, 60 for Hard),
  "credits": Number (10 for Easy, 25 for Medium, 50 for Hard),
  "hints": ["String", "String", "String"],
  "editorial_content": "String - Detailed markdown explanation of the algorithm and solution."
}

Return ONLY the raw JSON array of objects. Do not wrap it in markdown code blocks like \`\`\`json. Make sure the JSON is 100% valid.
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();
    
    // Strip markdown formatting if the model still includes it
    if (text.startsWith('\`\`\`json')) text = text.substring(7);
    if (text.startsWith('\`\`\`')) text = text.substring(3);
    if (text.endsWith('\`\`\`')) text = text.substring(0, text.length - 3);
    
    return JSON.parse(text);
  } catch (err) {
    console.error(`Failed to generate batch for ${category} - ${difficulty}:`, err.message);
    return null;
  }
}

async function insertProblems(problems) {
  for (const prob of problems) {
    const id = prob.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    const problemPayload = {
      id,
      title: prob.title,
      difficulty: prob.difficulty,
      category: prob.category,
      tags: prob.tags,
      description: prob.description,
      examples: prob.examples,
      constraints: prob.constraints,
      starter_code: prob.starter_code,
      test_cases: prob.test_cases,
      time_limit_ms: prob.time_limit_ms,
      memory_limit_kb: prob.memory_limit_kb,
      expected_time_complexity: prob.expected_time_complexity,
      expected_space_complexity: prob.expected_space_complexity,
      estimated_solve_time_min: prob.estimated_solve_time_min,
      credits: prob.credits,
      is_daily: false,
      sort_order: 0
    };

    const { error: pError } = await supabase.from('coding_problems').upsert(problemPayload);
    if (pError) {
      console.error(`Error inserting problem ${id}:`, pError.message);
      continue;
    }

    if (prob.editorial_content) {
      await supabase.from('editorials').upsert({
        problem_id: id,
        content: prob.editorial_content
      });
    }
    
    console.log(`✅ Inserted: ${prob.title}`);
  }
}

async function runSeed() {
  console.log('🚀 Starting 300 Problem Seed Generation...\n');
  let totalGenerated = 0;

  for (const cat of categories) {
    for (const difficulty of ['easy', 'medium', 'hard']) {
      const count = cat[difficulty];
      if (count === 0) continue;

      let remaining = count;
      const batchSize = 5; // Generate 5 at a time to prevent LLM token limits/timeouts

      while (remaining > 0) {
        const toGenerate = Math.min(remaining, batchSize);
        let batchData = null;
        let retries = 3;

        while (retries > 0 && !batchData) {
          batchData = await generateBatch(cat.name, difficulty.charAt(0).toUpperCase() + difficulty.slice(1), toGenerate);
          if (!batchData) {
            retries--;
            console.log(`Retrying... (${retries} attempts left)`);
            await sleep(5000);
          }
        }

        if (batchData && Array.isArray(batchData)) {
          await insertProblems(batchData);
          totalGenerated += batchData.length;
          remaining -= batchData.length;
        } else {
          console.error(`❌ Skipping batch for ${cat.name} ${difficulty} due to repeated failures.`);
          break; // Move to next category/difficulty if totally failed
        }
        
        console.log(`📊 Progress: ${totalGenerated}/300 problems generated.\n`);
        await sleep(3000); // Wait 3s between API calls to avoid rate limits
      }
    }
  }

  console.log(`🎉 Done! Generated and inserted ${totalGenerated} problems.`);
}

runSeed();
