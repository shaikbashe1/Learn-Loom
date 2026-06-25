-- Migration: Enrich Course Modules & Fix Certificate Auto-Award Flow
-- Description: Adds examples, real_world_use_cases, key_concepts, and summary columns to course_modules. Drops the automatic completion-to-certificate trigger.

-- 1. Add structured content columns to course_modules table
ALTER TABLE public.course_modules
ADD COLUMN IF NOT EXISTS examples JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS real_world_use_cases JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS key_concepts JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS summary TEXT;

-- 2. Drop the trigger that auto-awards certificates immediately on completion
DROP TRIGGER IF EXISTS trg_course_completion_certificate ON public.user_course_enrollments;
DROP FUNCTION IF EXISTS public.auto_award_course_completion_certificate();
