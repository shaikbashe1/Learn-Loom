-- ============================================================
-- LearnLoom Migration — Admin Courses Prereqs
-- ============================================================

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS prerequisites UUID[] DEFAULT '{}';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true;