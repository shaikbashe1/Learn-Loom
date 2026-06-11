-- ============================================================
-- LearnLoom Migration 00022 — Feature: Course Ratings & Rolling Average
-- ============================================================

-- 1. Create course_ratings table
CREATE TABLE IF NOT EXISTS public.course_ratings (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id   uuid        NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  rating      integer     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text text        CHECK (char_length(review_text) <= 1000),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);

-- 2. Enable RLS
ALTER TABLE public.course_ratings ENABLE ROW LEVEL SECURITY;

-- 3. Define policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='course_ratings' AND policyname='Anyone read course ratings') THEN
    CREATE POLICY "Anyone read course ratings" ON public.course_ratings
      FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='course_ratings' AND policyname='Users manage own course ratings') THEN
    CREATE POLICY "Users manage own course ratings" ON public.course_ratings
      FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- 4. Create trigger to update course average rating and student rating count
CREATE OR REPLACE FUNCTION public.update_course_average_rating()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_avg_rating numeric(3,2);
  v_course_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_course_id := OLD.course_id;
  ELSE
    v_course_id := NEW.course_id;
  END IF;

  SELECT COALESCE(AVG(rating), 0) INTO v_avg_rating
  FROM public.course_ratings
  WHERE course_id = v_course_id;

  UPDATE public.courses
  SET rating = ROUND(v_avg_rating, 1)
  WHERE id = v_course_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_course_rating_avg ON public.course_ratings;
CREATE TRIGGER trg_course_rating_avg
AFTER INSERT OR UPDATE OR DELETE ON public.course_ratings
FOR EACH ROW EXECUTE FUNCTION public.update_course_average_rating();
