-- ============================================================
-- LearnLoom Migration 00020 — Database Trigger: Auto-Issue Certificate on Grand Test Pass
-- ============================================================

-- 0. Drop the NOT NULL constraint on certificates.course_id to allow course-independent (global) certificates
ALTER TABLE public.certificates ALTER COLUMN course_id DROP NOT NULL;

-- 1. Drop the old auto_award_certificate trigger and function on quiz_attempts
DROP TRIGGER IF EXISTS trg_auto_certificate ON public.quiz_attempts;
DROP FUNCTION IF EXISTS public.auto_award_certificate();

-- 2. Create the new auto_award_grand_test_certificate trigger function
CREATE OR REPLACE FUNCTION public.auto_award_grand_test_certificate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_score_pct integer;
BEGIN
  -- Only fire when a grand test attempt is inserted and passed
  IF NOT NEW.passed THEN 
    RETURN NEW; 
  END IF;

  v_score_pct := ROUND((NEW.score::numeric / NULLIF(NEW.total, 0)) * 100);

  -- Check if certificate already exists for this user and course (null-safe check)
  IF EXISTS (
    SELECT 1 FROM public.certificates 
    WHERE user_id = NEW.user_id AND course_id IS NOT DISTINCT FROM NEW.course_id
  ) THEN
    RETURN NEW;
  END IF;

  -- Insert certificate
  INSERT INTO public.certificates (user_id, course_id, score, verification_code)
  VALUES (NEW.user_id, NEW.course_id, v_score_pct, '');

  -- Award credits for passing grand test (100 credits)
  UPDATE public.profiles SET credits = credits + 100 WHERE id = NEW.user_id;

  -- Create in-app notification
  INSERT INTO public.notifications (user_id, type, message)
  VALUES (
    NEW.user_id,
    'success',
    'Congratulations! You have passed the Grand Test and earned your certificate!'
  );

  RETURN NEW;
END;
$$;

-- 3. Bind the trigger to grand_test_attempts
DROP TRIGGER IF EXISTS trg_grand_test_certificate ON public.grand_test_attempts;
CREATE TRIGGER trg_grand_test_certificate
AFTER INSERT ON public.grand_test_attempts
FOR EACH ROW EXECUTE FUNCTION public.auto_award_grand_test_certificate();
