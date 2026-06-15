-- ============================================================
-- LearnLoom Migration — Admin Daily Trends
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_admin_enrollment_trends(days_ago INT DEFAULT 14)
RETURNS TABLE (
  trend_date DATE,
  signups INT,
  enrollments INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      CURRENT_DATE - (days_ago - 1) * INTERVAL '1 day',
      CURRENT_DATE,
      INTERVAL '1 day'
    )::DATE AS d
  ),
  daily_signups AS (
    SELECT DATE(created_at) AS d, COUNT(*) AS cnt
    FROM public.profiles
    WHERE created_at >= CURRENT_DATE - (days_ago - 1) * INTERVAL '1 day'
    GROUP BY 1
  ),
  daily_enrollments AS (
    SELECT DATE(created_at) AS d, COUNT(*) AS cnt
    FROM public.user_course_enrollments
    WHERE created_at >= CURRENT_DATE - (days_ago - 1) * INTERVAL '1 day'
    GROUP BY 1
  )
  SELECT 
    ds.d AS trend_date,
    COALESCE(s.cnt, 0)::INT AS signups,
    COALESCE(e.cnt, 0)::INT AS enrollments
  FROM date_series ds
  LEFT JOIN daily_signups s ON ds.d = s.d
  LEFT JOIN daily_enrollments e ON ds.d = e.d
  ORDER BY ds.d ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_enrollment_trends(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_enrollment_trends(INT) TO authenticated;
