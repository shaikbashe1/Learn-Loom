import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const connectionString = 'postgresql://postgres:8333094992%40Bb@db.uxyxekustlfhzytgdbfs.supabase.co:5432/postgres';
const client = new Client({ connectionString });

const problems = [
  {
    title: 'Two Number Target',
    difficulty: 'Beginner',
    category: 'Arrays',
    tags: ['array', 'hash-table'],
    description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.',
    examples: [
      { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].' }
    ],
    constraints: ['2 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9', '-10^9 <= target <= 10^9'],
    starter_code: {
      java: 'class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        \n    }\n}',
      python: 'def twoSum(nums, target):\n    pass',
      javascript: '/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nfunction twoSum(nums, target) {\n    \n}',
      cpp: 'class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        \n    }\n};',
      c: 'int* twoSum(int* nums, int numsSize, int target, int* returnSize) {\n    \n}'
    },
    test_cases: [
      { input: '2 7 11 15\n9', expectedOutput: '0 1' },
      { input: '3 2 4\n6', expectedOutput: '1 2' },
      { input: '3 3\n6', expectedOutput: '0 1' }
    ],
    time_limit_ms: 2000,
    memory_limit_kb: 256000,
    expected_time_complexity: 'O(N)',
    expected_space_complexity: 'O(N)',
    estimated_solve_time_min: 15,
    credits: 10,
    hints: ['Try using a hash map to store the elements you have seen so far.', 'For each element x, check if (target - x) is in the hash map.']
  },
  {
    title: 'Reverse Words in String',
    difficulty: 'Intermediate',
    category: 'Strings',
    tags: ['string', 'two-pointers'],
    description: 'Given an input string `s`, reverse the order of the words.\n\nA word is defined as a sequence of non-space characters. The words in `s` will be separated by at least one space.\n\nReturn a string of the words in reverse order concatenated by a single space.',
    examples: [
      { input: 's = "the sky is blue"', output: '"blue is sky the"', explanation: '' },
      { input: 's = "  hello world  "', output: '"world hello"', explanation: 'Your reversed string should not contain leading or trailing spaces.' }
    ],
    constraints: ['1 <= s.length <= 10^4', 's contains English letters (upper-case and lower-case), digits, and spaces \' \'.', 'There is at least one word in s.'],
    starter_code: {
      java: 'class Solution {\n    public String reverseWords(String s) {\n        \n    }\n}',
      python: 'def reverseWords(s: str) -> str:\n    pass',
      javascript: '/**\n * @param {string} s\n * @return {string}\n */\nfunction reverseWords(s) {\n    \n}',
      cpp: 'class Solution {\npublic:\n    string reverseWords(string s) {\n        \n    }\n};',
      c: 'char* reverseWords(char* s) {\n    \n}'
    },
    test_cases: [
      { input: 'the sky is blue', expectedOutput: 'blue is sky the' },
      { input: '  hello world  ', expectedOutput: 'world hello' },
      { input: 'a good   example', expectedOutput: 'example good a' }
    ],
    time_limit_ms: 2000,
    memory_limit_kb: 256000,
    expected_time_complexity: 'O(N)',
    expected_space_complexity: 'O(N)',
    estimated_solve_time_min: 25,
    credits: 25,
    hints: ['Split the string into words, reverse the array of words, and join them back with spaces.']
  }
];

async function insertProblems() {
  await client.connect();
  for (const prob of problems) {
    const id = prob.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    try {
      await client.query(`
        INSERT INTO coding_problems (
          id, title, difficulty, category, tags, description, examples, constraints, starter_code, test_cases, time_limit_ms, memory_limit_kb, expected_time_complexity, expected_space_complexity, estimated_solve_time_min, credits, hints, is_daily, sort_order
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
        ) ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          difficulty = EXCLUDED.difficulty,
          category = EXCLUDED.category,
          tags = EXCLUDED.tags,
          description = EXCLUDED.description,
          examples = EXCLUDED.examples,
          constraints = EXCLUDED.constraints,
          starter_code = EXCLUDED.starter_code,
          test_cases = EXCLUDED.test_cases,
          time_limit_ms = EXCLUDED.time_limit_ms,
          memory_limit_kb = EXCLUDED.memory_limit_kb,
          expected_time_complexity = EXCLUDED.expected_time_complexity,
          expected_space_complexity = EXCLUDED.expected_space_complexity,
          estimated_solve_time_min = EXCLUDED.estimated_solve_time_min,
          credits = EXCLUDED.credits,
          hints = EXCLUDED.hints
      `, [
        id, prob.title, prob.difficulty, prob.category, prob.tags, prob.description, JSON.stringify(prob.examples), JSON.stringify(prob.constraints), JSON.stringify(prob.starter_code), JSON.stringify(prob.test_cases), prob.time_limit_ms, prob.memory_limit_kb, prob.expected_time_complexity, prob.expected_space_complexity, prob.estimated_solve_time_min, prob.credits, JSON.stringify(prob.hints), false, 0
      ]);
      console.log(`✅ Inserted: ${prob.title}`);
    } catch (e) {
      console.error(`Error inserting problem ${id}:`, e.message);
    }
  }
  await client.end();
}

insertProblems();
