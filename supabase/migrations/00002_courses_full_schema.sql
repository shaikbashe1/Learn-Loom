
-- ── Courses ──────────────────────────────────────────────────────────────
CREATE TABLE public.courses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  description  text,
  difficulty   text NOT NULL DEFAULT 'Beginner' CHECK (difficulty IN ('Beginner','Intermediate','Advanced')),
  thumbnail_url text,
  youtube_url  text,
  notes_url    text,
  is_published boolean NOT NULL DEFAULT false,
  created_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ── Modules (video lessons inside a course) ───────────────────────────────
CREATE TABLE public.course_modules (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title       text NOT NULL,
  youtube_url text,
  notes_url   text,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Assignments ────────────────────────────────────────────────────────────
CREATE TABLE public.assignments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id    uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title        text NOT NULL,
  instructions text,
  due_days     int DEFAULT 7,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── Quizzes ────────────────────────────────────────────────────────────────
CREATE TABLE public.quizzes (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title     text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.quiz_questions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id      uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question     text NOT NULL,
  options      jsonb NOT NULL DEFAULT '[]',
  answer_index int NOT NULL DEFAULT 0,
  sort_order   int NOT NULL DEFAULT 0
);

-- ── Auto-update updated_at on courses ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.courses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions   ENABLE ROW LEVEL SECURITY;

-- Courses: anyone can read published; admin full access
CREATE POLICY "public_read_published_courses" ON public.courses
  FOR SELECT USING (is_published = true OR get_user_role(auth.uid()) = 'admin'::public.user_role);

CREATE POLICY "admin_all_courses" ON public.courses
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'admin'::public.user_role)
  WITH CHECK (get_user_role(auth.uid()) = 'admin'::public.user_role);

-- Modules
CREATE POLICY "public_read_modules" ON public.course_modules
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND (c.is_published = true OR get_user_role(auth.uid()) = 'admin'::public.user_role))
  );

CREATE POLICY "admin_all_modules" ON public.course_modules
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'admin'::public.user_role)
  WITH CHECK (get_user_role(auth.uid()) = 'admin'::public.user_role);

-- Assignments
CREATE POLICY "public_read_assignments" ON public.assignments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND (c.is_published = true OR get_user_role(auth.uid()) = 'admin'::public.user_role))
  );

CREATE POLICY "admin_all_assignments" ON public.assignments
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'admin'::public.user_role)
  WITH CHECK (get_user_role(auth.uid()) = 'admin'::public.user_role);

-- Quizzes
CREATE POLICY "public_read_quizzes" ON public.quizzes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND (c.is_published = true OR get_user_role(auth.uid()) = 'admin'::public.user_role))
  );

CREATE POLICY "admin_all_quizzes" ON public.quizzes
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'admin'::public.user_role)
  WITH CHECK (get_user_role(auth.uid()) = 'admin'::public.user_role);

CREATE POLICY "public_read_quiz_questions" ON public.quiz_questions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.quizzes q JOIN public.courses c ON c.id = q.course_id WHERE q.id = quiz_id AND (c.is_published = true OR get_user_role(auth.uid()) = 'admin'::public.user_role))
  );

CREATE POLICY "admin_all_quiz_questions" ON public.quiz_questions
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'admin'::public.user_role)
  WITH CHECK (get_user_role(auth.uid()) = 'admin'::public.user_role);

-- ── Storage bucket for course assets ──────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-assets', 'course-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public_read_course_assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'course-assets');

CREATE POLICY "admin_upload_course_assets" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'course-assets' AND get_user_role(auth.uid()) = 'admin'::public.user_role);

CREATE POLICY "admin_delete_course_assets" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'course-assets' AND get_user_role(auth.uid()) = 'admin'::public.user_role);
