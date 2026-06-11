-- ============================================================
-- LearnLoom Migration 00023 — Feature: Video Timestamp Notes
-- ============================================================

-- 1. Create video_notes table
CREATE TABLE IF NOT EXISTS public.video_notes (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id         uuid        NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  timestamp_seconds integer     NOT NULL CHECK (timestamp_seconds >= 0),
  note_text         text        NOT NULL CHECK (char_length(note_text) BETWEEN 1 AND 2000),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.video_notes ENABLE ROW LEVEL SECURITY;

-- 3. Define policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='video_notes' AND policyname='Users manage own video notes') THEN
    CREATE POLICY "Users manage own video notes" ON public.video_notes
      FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- 4. Indexes for fast retrieval
CREATE INDEX IF NOT EXISTS idx_video_notes_query 
  ON public.video_notes(user_id, module_id, timestamp_seconds);
