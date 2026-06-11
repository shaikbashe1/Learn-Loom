-- ============================================================
-- LearnLoom Migration 00017 — Security: View Permissions & Schema Fixes
-- ============================================================

-- ── 1. Extend admin_stats view with missing columns ──────────────────────────
-- AdminReportsPage uses completed_enrollments, total_quiz_attempts,
-- total_submissions, and forum_posts_count which were absent from the view.
CREATE OR REPLACE VIEW public.admin_stats AS
  SELECT
    (SELECT COUNT(*) FROM public.courses WHERE is_published=true)::INTEGER           AS published_courses,
    (SELECT COUNT(*) FROM public.courses)::INTEGER                                   AS total_courses,
    (SELECT COUNT(*) FROM public.profiles WHERE role='student')::INTEGER             AS total_students,
    (SELECT COUNT(*) FROM public.quizzes)::INTEGER                                   AS total_quizzes,
    (SELECT COUNT(*) FROM public.assignments)::INTEGER                               AS total_assignments,
    (SELECT COUNT(*) FROM public.certificates WHERE is_valid=true AND revoked=false)::INTEGER AS active_certificates,
    (SELECT COUNT(*) FROM public.grand_test_attempts WHERE passed=true)::INTEGER     AS grand_test_passes,
    (SELECT COUNT(*) FROM public.user_course_enrollments)::INTEGER                   AS total_enrollments,
    -- Extended columns used by AdminReportsPage
    (SELECT COUNT(*) FROM public.user_course_enrollments WHERE completed_at IS NOT NULL)::INTEGER AS completed_enrollments,
    (SELECT COUNT(*) FROM public.quiz_attempts)::INTEGER                             AS total_quiz_attempts,
    (SELECT COUNT(*) FROM public.assignment_submissions)::INTEGER                    AS total_submissions,
    (SELECT COUNT(*) FROM public.forum_posts)::INTEGER                               AS forum_posts_count;

-- ── 2. Restrict admin_stats view to admin role only ──────────────────────────
-- Previous migration granted admin_stats SELECT to all authenticated users,
-- meaning any student could query aggregate platform stats.
REVOKE SELECT ON public.admin_stats FROM authenticated;
REVOKE SELECT ON public.admin_stats FROM anon;
GRANT SELECT ON public.admin_stats TO service_role;

-- Secure wrapper RPC — only admins can call this
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS TABLE (
  published_courses     INTEGER,
  total_courses         INTEGER,
  total_students        INTEGER,
  total_quizzes         INTEGER,
  total_assignments     INTEGER,
  active_certificates   INTEGER,
  grand_test_passes     INTEGER,
  total_enrollments     INTEGER,
  completed_enrollments INTEGER,
  total_quiz_attempts   INTEGER,
  total_submissions     INTEGER,
  forum_posts_count     INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;
  RETURN QUERY SELECT * FROM public.admin_stats;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated;

-- ── 3. Add missing performance indexes ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, read)
  WHERE read = false;

CREATE INDEX IF NOT EXISTS idx_payment_orders_user
  ON public.payment_orders(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_forum_posts_category
  ON public.forum_posts(category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_forum_replies_post
  ON public.forum_replies(post_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_grand_test_attempts_user
  ON public.grand_test_attempts(user_id, submitted_at DESC);

-- ── 4. Admin can view all notifications (for moderation) ─────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications'
    AND policyname = 'admins_read_all_notifications'
  ) THEN
    CREATE POLICY "admins_read_all_notifications"
      ON public.notifications
      FOR SELECT TO authenticated
      USING (public.is_admin(auth.uid()));
  END IF;
END $$;
