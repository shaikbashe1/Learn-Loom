
-- ── 1. user_course_enrollments ────────────────────────────────────────────────
CREATE TABLE public.user_course_enrollments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id       uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  progress_percent integer NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  last_module_id  uuid REFERENCES public.course_modules(id) ON DELETE SET NULL,
  enrolled_at     timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  UNIQUE(user_id, course_id)
);

-- ── 2. user_module_progress ───────────────────────────────────────────────────
CREATE TYPE public.module_status AS ENUM ('locked', 'unlocked', 'completed');

CREATE TABLE public.user_module_progress (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  module_id   uuid NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  course_id   uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  status      public.module_status NOT NULL DEFAULT 'locked',
  completed_at timestamptz,
  UNIQUE(user_id, module_id)
);

-- ── 3. RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.user_course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_module_progress    ENABLE ROW LEVEL SECURITY;

-- Helper: check if caller is admin
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT role = 'admin' FROM public.profiles WHERE id = uid;
$$;

-- Enrollment policies
CREATE POLICY "users_manage_own_enrollments" ON public.user_course_enrollments
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admins_read_all_enrollments" ON public.user_course_enrollments
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

-- Module progress policies
CREATE POLICY "users_manage_own_module_progress" ON public.user_module_progress
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admins_read_all_module_progress" ON public.user_module_progress
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

-- ── 4. Enable Realtime for live progress updates ──────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_course_enrollments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_module_progress;
