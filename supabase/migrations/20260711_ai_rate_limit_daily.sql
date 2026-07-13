-- ============================================================
-- Migration: AI Rate Limiting — Daily Windows & Atomic RPC
-- ============================================================

-- 1. Atomic rate-limit check-and-increment RPC
--    Returns JSON: { allowed, current_count, max_count, window_reset }
CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_user_id UUID,
  p_endpoint TEXT,
  p_max_count INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMPTZ := date_trunc('day', now() AT TIME ZONE 'UTC');
  v_window_reset TIMESTAMPTZ := v_window_start + INTERVAL '1 day';
  v_current_count INTEGER;
BEGIN
  -- Atomic upsert: insert or increment, returning the new count
  INSERT INTO public.auth_rate_limit (user_id, endpoint, count, window_start)
  VALUES (p_user_id, p_endpoint, 1, v_window_start)
  ON CONFLICT (user_id, endpoint, window_start)
  DO UPDATE SET count = auth_rate_limit.count + 1
  RETURNING count INTO v_current_count;

  -- If current count exceeds max, roll back the increment and deny
  IF v_current_count > p_max_count THEN
    UPDATE public.auth_rate_limit
    SET count = count - 1
    WHERE user_id = p_user_id
      AND endpoint = p_endpoint
      AND window_start = v_window_start;

    RETURN jsonb_build_object(
      'allowed', false,
      'current_count', p_max_count,
      'max_count', p_max_count,
      'window_reset', v_window_reset
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'current_count', v_current_count,
    'max_count', p_max_count,
    'window_reset', v_window_reset
  );
END;
$$;

-- 2. Add a unique constraint for the upsert ON CONFLICT to work
--    (The existing composite indexes don't have a UNIQUE constraint)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'auth_rate_limit_user_endpoint_window_uq'
  ) THEN
    ALTER TABLE public.auth_rate_limit
    ADD CONSTRAINT auth_rate_limit_user_endpoint_window_uq
    UNIQUE (user_id, endpoint, window_start);
  END IF;
END $$;

-- 3. RPC to fetch current usage without incrementing (for frontend display)
CREATE OR REPLACE FUNCTION public.get_rate_limit_usage(
  p_user_id UUID,
  p_endpoint TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMPTZ := date_trunc('day', now() AT TIME ZONE 'UTC');
  v_window_reset TIMESTAMPTZ := v_window_start + INTERVAL '1 day';
  v_current_count INTEGER := 0;
BEGIN
  SELECT count INTO v_current_count
  FROM public.auth_rate_limit
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND window_start = v_window_start;

  IF v_current_count IS NULL THEN
    v_current_count := 0;
  END IF;

  RETURN jsonb_build_object(
    'current_count', v_current_count,
    'window_reset', v_window_reset
  );
END;
$$;

-- 4. Cleanup: delete rate limit rows older than 7 days
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.auth_rate_limit
  WHERE window_start < now() - INTERVAL '7 days';
END;
$$;
