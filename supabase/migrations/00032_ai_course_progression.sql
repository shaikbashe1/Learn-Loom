-- ============================================================
-- Migration: AI Course Progression & Strict Locks
-- ============================================================

-- 1. Differentiate Quizzes
ALTER TABLE public.quizzes
ADD COLUMN IF NOT EXISTS quiz_type TEXT CHECK (quiz_type IN ('quiz_1', 'quiz_2', 'final_assessment', 'standard')) DEFAULT 'standard';

-- 2. Link Coding Questions to specific modules for the "Every 2 Modules" rule
ALTER TABLE public.coding_questions
ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES public.course_modules(id) ON DELETE CASCADE;

-- 3. Enhance Module Progress Tracking
ALTER TABLE public.user_module_progress
ADD COLUMN IF NOT EXISTS quiz_1_passed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS quiz_2_passed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS coding_passed BOOLEAN DEFAULT false;

-- 4. Final Assessment Grading
-- We reuse assessment_attempts, but add specific support for short answers
CREATE TABLE IF NOT EXISTS public.short_answer_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    attempt_id UUID REFERENCES public.assessment_attempts(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    student_answer TEXT NOT NULL,
    ai_score DECIMAL(5,2),
    ai_feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Short Answers
ALTER TABLE public.short_answer_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own short answers" ON public.short_answer_submissions 
FOR SELECT USING (EXISTS (SELECT 1 FROM public.assessment_attempts a WHERE a.id = attempt_id AND a.user_id = auth.uid()::text));

CREATE POLICY "Users insert own short answers" ON public.short_answer_submissions 
FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.assessment_attempts a WHERE a.id = attempt_id AND a.user_id = auth.uid()::text));
