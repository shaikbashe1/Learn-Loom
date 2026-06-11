-- ============================================================
-- LearnLoom Migration 00021 — Database: Cooldown Enforcements & sort_order Removal
-- ============================================================

-- 1. Create grand test cooldown function and trigger
CREATE OR REPLACE FUNCTION public.enforce_grand_test_cooldown()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_last_submitted timestamptz;
BEGIN
  -- Get the last attempt's submission timestamp for this user & course
  SELECT submitted_at INTO v_last_submitted
  FROM public.grand_test_attempts
  WHERE user_id = NEW.user_id AND course_id IS NOT DISTINCT FROM NEW.course_id
  ORDER BY submitted_at DESC
  LIMIT 1;

  -- If there was an attempt in the last 1 hour, raise exception
  IF v_last_submitted IS NOT NULL AND (NEW.submitted_at - v_last_submitted) < INTERVAL '1 hour' THEN
    RAISE EXCEPTION 'You must wait 1 hour between Grand Test attempts. Cooldown active.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grand_test_cooldown ON public.grand_test_attempts;
CREATE TRIGGER trg_grand_test_cooldown
BEFORE INSERT ON public.grand_test_attempts
FOR EACH ROW EXECUTE FUNCTION public.enforce_grand_test_cooldown();

-- 2. Drop legacy sort_order column on course_modules and clean indexes
DROP INDEX IF EXISTS public.idx_course_modules_sort_order;
ALTER TABLE public.course_modules DROP COLUMN IF EXISTS sort_order;

-- 3. Create index for order_index
CREATE INDEX IF NOT EXISTS idx_course_modules_order_index 
  ON public.course_modules(course_id, order_index ASC);
