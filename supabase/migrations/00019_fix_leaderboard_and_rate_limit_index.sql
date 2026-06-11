-- ============================================================
-- LearnLoom Migration 00019 — Database Schema & Data Fixes: Leaderboard View & Rate Limit Indexes
-- ============================================================

-- 1. Recreate leaderboard_view to filter by role = 'student'
DROP VIEW IF EXISTS public.leaderboard_view CASCADE;
CREATE OR REPLACE VIEW public.leaderboard_view AS
SELECT
  p.id                                                           AS user_id,
  p.full_name,
  p.avatar_url,
  p.credits,
  p.streak_days,
  COALESCE(enroll_counts.completed, 0)                           AS courses_completed,
  COALESCE(cert_counts.cert_count, 0)                            AS certificates_earned,
  ROW_NUMBER() OVER (ORDER BY p.credits DESC, p.streak_days DESC) AS rank
FROM public.profiles p
LEFT JOIN (
  SELECT user_id, COUNT(*) FILTER (WHERE completed_at IS NOT NULL) AS completed
  FROM public.user_course_enrollments GROUP BY user_id
) enroll_counts ON enroll_counts.user_id = p.id
LEFT JOIN (
  SELECT user_id, COUNT(*) AS cert_count
  FROM public.certificates GROUP BY user_id
) cert_counts ON cert_counts.user_id = p.id
WHERE p.role = 'student'::public.user_role
ORDER BY rank;

-- 2. Add composite indexes for auth_rate_limit
CREATE INDEX IF NOT EXISTS idx_rate_limit_user_endpoint 
  ON public.auth_rate_limit(user_id, endpoint);

CREATE INDEX IF NOT EXISTS idx_rate_limit_user_endpoint_window 
  ON public.auth_rate_limit(user_id, endpoint, window_start DESC);
