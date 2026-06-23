-- ============================================================
-- Migration: LMS Strict Progression Schema
-- Enhances modules, quizzes, coding assessments for pure LMS
-- ============================================================

-- 1. Expand course_modules to handle rich content
ALTER TABLE public.course_modules
ADD COLUMN IF NOT EXISTS learning_objectives TEXT,
ADD COLUMN IF NOT EXISTS content TEXT,
ADD COLUMN IF NOT EXISTS diagrams JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS code_blocks JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS reference_links JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS key_takeaways JSONB DEFAULT '[]';

-- 2. Expand quizzes for LMS logic
ALTER TABLE public.quizzes
ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES public.course_modules(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS pass_percentage INT DEFAULT 75,
ADD COLUMN IF NOT EXISTS is_randomized BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS randomize_options BOOLEAN DEFAULT false;

-- 3. Expand quiz_questions for multiple correct and explanations
ALTER TABLE public.quiz_questions
ADD COLUMN IF NOT EXISTS explanation TEXT,
ADD COLUMN IF NOT EXISTS is_multiple_correct BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS correct_options JSONB DEFAULT '[]';

-- Migrate existing answer_index to correct_options if needed
UPDATE public.quiz_questions 
SET correct_options = jsonb_build_array(answer_index)
WHERE correct_options = '[]'::jsonb;

-- 4. Create Coding Questions & Test Cases tables (migrating from coding_problems)
CREATE TABLE IF NOT EXISTS public.coding_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    difficulty TEXT CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
    problem_statement TEXT NOT NULL,
    constraints JSONB DEFAULT '[]',
    starter_code JSONB DEFAULT '{}',
    is_assessment BOOLEAN DEFAULT false,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.coding_test_cases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question_id UUID REFERENCES public.coding_questions(id) ON DELETE CASCADE,
    input TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    is_hidden BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Assessment Attempts
CREATE TABLE IF NOT EXISTS public.assessment_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    score_percentage DECIMAL(5,2),
    is_passed BOOLEAN DEFAULT false,
    attempt_number INT DEFAULT 1,
    metrics JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.coding_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coding questions viewable by all" ON public.coding_questions FOR SELECT USING (true);
CREATE POLICY "Public test cases viewable by all" ON public.coding_test_cases FOR SELECT USING (is_hidden = false);

CREATE POLICY "Users view own assessment attempts" ON public.assessment_attempts 
FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users insert own assessment attempts" ON public.assessment_attempts 
FOR INSERT WITH CHECK (user_id = auth.uid()::text);
