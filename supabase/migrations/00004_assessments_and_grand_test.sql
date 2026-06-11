
-- ── 1. Extend quizzes to support grand_test flag + module link ─────────────
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS module_id uuid REFERENCES public.course_modules(id) ON DELETE SET NULL;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS is_grand_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS passing_score integer NOT NULL DEFAULT 60;

-- ── 2. assignment_submissions ────────────────────────────────────────────────
CREATE TABLE public.assignment_submissions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  answer_text   text NOT NULL DEFAULT '',
  status        text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','graded')),
  score         integer,
  feedback      text,
  submitted_at  timestamptz NOT NULL DEFAULT now(),
  graded_at     timestamptz,
  UNIQUE(user_id, assignment_id)
);

-- ── 3. quiz_attempts ─────────────────────────────────────────────────────────
CREATE TABLE public.quiz_attempts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quiz_id      uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  answers      jsonb NOT NULL DEFAULT '[]',
  score        integer NOT NULL DEFAULT 0,
  total        integer NOT NULL DEFAULT 0,
  passed       boolean NOT NULL DEFAULT false,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, quiz_id)
);

-- ── 4. RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts          ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_assignment_submissions" ON public.assignment_submissions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admins_read_all_submissions" ON public.assignment_submissions
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "users_manage_own_quiz_attempts" ON public.quiz_attempts
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admins_read_all_quiz_attempts" ON public.quiz_attempts
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- ── 5. Public read on courses and related tables (needed for catalog) ─────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'courses' AND policyname = 'public_read_published_courses'
  ) THEN
    CREATE POLICY "public_read_published_courses" ON public.courses
      FOR SELECT USING (is_published = true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'course_modules' AND policyname = 'public_read_course_modules'
  ) THEN
    CREATE POLICY "public_read_course_modules" ON public.course_modules
      FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'quizzes' AND policyname = 'public_read_quizzes'
  ) THEN
    CREATE POLICY "public_read_quizzes" ON public.quizzes
      FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'quiz_questions' AND policyname = 'public_read_quiz_questions'
  ) THEN
    CREATE POLICY "public_read_quiz_questions" ON public.quiz_questions
      FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'assignments' AND policyname = 'public_read_assignments'
  ) THEN
    CREATE POLICY "public_read_assignments" ON public.assignments
      FOR SELECT USING (true);
  END IF;
END $$;
