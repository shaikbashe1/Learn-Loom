
-- Add missing columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio          TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS github_url   TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- Add status to forum_posts
ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved';

-- Add revoked to certificates
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS revoked BOOLEAN NOT NULL DEFAULT false;

-- Add columns to course_modules
ALTER TABLE public.course_modules ADD COLUMN IF NOT EXISTS type            TEXT NOT NULL DEFAULT 'video';
ALTER TABLE public.course_modules ADD COLUMN IF NOT EXISTS order_index     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.course_modules ADD COLUMN IF NOT EXISTS is_free_preview BOOLEAN NOT NULL DEFAULT false;
UPDATE public.course_modules SET order_index = sort_order WHERE order_index = 0;

-- Add columns to courses
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS level           TEXT NOT NULL DEFAULT 'beginner';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS instructor_name TEXT NOT NULL DEFAULT 'LearnLoom Team';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS duration_hours  NUMERIC(5,1) NOT NULL DEFAULT 0;
UPDATE public.courses SET instructor_name = instructor WHERE instructor IS NOT NULL AND instructor_name = 'LearnLoom Team';

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL DEFAULT 'info',
  message    TEXT NOT NULL,
  read       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='notifications_select') THEN
    CREATE POLICY "notifications_select" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='notifications_update') THEN
    CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='notifications_insert') THEN
    CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END$$;

-- Auth Rate Limit
CREATE TABLE IF NOT EXISTS public.auth_rate_limit (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint     TEXT NOT NULL,
  count        INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('hour', now())
);
ALTER TABLE public.auth_rate_limit ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='auth_rate_limit' AND policyname='rate_limit_own') THEN
    CREATE POLICY "rate_limit_own" ON public.auth_rate_limit FOR ALL TO authenticated USING (user_id = auth.uid());
  END IF;
END$$;

-- AI Conversations
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title      TEXT NOT NULL DEFAULT 'New Conversation',
  messages   JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ai_conversations' AND policyname='ai_conv_select') THEN
    CREATE POLICY "ai_conv_select" ON public.ai_conversations FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ai_conversations' AND policyname='ai_conv_insert') THEN
    CREATE POLICY "ai_conv_insert" ON public.ai_conversations FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ai_conversations' AND policyname='ai_conv_update') THEN
    CREATE POLICY "ai_conv_update" ON public.ai_conversations FOR UPDATE TO authenticated USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ai_conversations' AND policyname='ai_conv_delete') THEN
    CREATE POLICY "ai_conv_delete" ON public.ai_conversations FOR DELETE TO authenticated USING (user_id = auth.uid());
  END IF;
END$$;

-- Constraints
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_full_name_len;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_full_name_len CHECK (char_length(full_name) <= 150);
ALTER TABLE public.assignment_submissions DROP CONSTRAINT IF EXISTS submissions_answer_len;
ALTER TABLE public.assignment_submissions ADD CONSTRAINT submissions_answer_len CHECK (char_length(answer_text) <= 50000);

-- Views
DROP VIEW IF EXISTS public.leaderboard_view CASCADE;
CREATE OR REPLACE VIEW public.leaderboard_view AS
  SELECT
    p.id AS user_id, p.full_name, p.avatar_url, p.credits, p.streak_days,
    COALESCE((SELECT COUNT(*) FROM public.user_course_enrollments WHERE user_id=p.id AND completed_at IS NOT NULL),0)::INTEGER AS courses_completed,
    COALESCE((SELECT COUNT(*) FROM public.certificates WHERE user_id=p.id AND is_valid=true AND revoked=false),0)::INTEGER AS certificates_earned,
    RANK() OVER (ORDER BY p.credits DESC)::INTEGER AS rank
  FROM public.profiles p WHERE p.role != 'admin';

DROP VIEW IF EXISTS public.admin_stats CASCADE;
CREATE OR REPLACE VIEW public.admin_stats AS
  SELECT
    (SELECT COUNT(*) FROM public.courses WHERE is_published=true)::INTEGER AS published_courses,
    (SELECT COUNT(*) FROM public.courses)::INTEGER AS total_courses,
    (SELECT COUNT(*) FROM public.profiles WHERE role='student')::INTEGER AS total_students,
    (SELECT COUNT(*) FROM public.quizzes)::INTEGER AS total_quizzes,
    (SELECT COUNT(*) FROM public.assignments)::INTEGER AS total_assignments,
    (SELECT COUNT(*) FROM public.certificates WHERE is_valid=true AND revoked=false)::INTEGER AS active_certificates,
    (SELECT COUNT(*) FROM public.grand_test_attempts WHERE passed=true)::INTEGER AS grand_test_passes,
    (SELECT COUNT(*) FROM public.user_course_enrollments)::INTEGER AS total_enrollments;

-- Replace toggle_forum_vote with correct return type
DROP FUNCTION IF EXISTS public.toggle_forum_vote(uuid,uuid);
CREATE FUNCTION public.toggle_forum_vote(p_post_id UUID, p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_exists BOOLEAN; v_count INTEGER;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.forum_votes WHERE post_id=p_post_id AND user_id=p_user_id) INTO v_exists;
  IF v_exists THEN
    DELETE FROM public.forum_votes WHERE post_id=p_post_id AND user_id=p_user_id;
    UPDATE public.forum_posts SET upvotes=GREATEST(0,upvotes-1) WHERE id=p_post_id RETURNING upvotes INTO v_count;
    RETURN jsonb_build_object('voted',false,'upvotes',v_count);
  ELSE
    INSERT INTO public.forum_votes(post_id,user_id) VALUES(p_post_id,p_user_id) ON CONFLICT DO NOTHING;
    UPDATE public.forum_posts SET upvotes=upvotes+1 WHERE id=p_post_id RETURNING upvotes INTO v_count;
    RETURN jsonb_build_object('voted',true,'upvotes',v_count);
  END IF;
END;
$$;

-- Triggers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles(id,email,full_name,avatar_url,role)
  VALUES(
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name',NEW.raw_user_meta_data->>'name',split_part(NEW.email,'@',1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url',NEW.raw_user_meta_data->>'picture'),
    'student'
  )
  ON CONFLICT(id) DO UPDATE SET
    email=EXCLUDED.email,
    full_name=CASE WHEN profiles.full_name='' THEN EXCLUDED.full_name ELSE profiles.full_name END,
    avatar_url=CASE WHEN profiles.avatar_url IS NULL THEN EXCLUDED.avatar_url ELSE profiles.avatar_url END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.role IS NOT DISTINCT FROM NEW.role THEN RETURN NEW; END IF;
  IF public.is_admin(auth.uid()) THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Role changes are not permitted.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS ai_conv_updated_at ON public.ai_conversations;
CREATE TRIGGER ai_conv_updated_at BEFORE UPDATE ON public.ai_conversations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.increment_reply_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.forum_posts SET reply_count=reply_count+1 WHERE id=NEW.post_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_increment_reply_count ON public.forum_replies;
CREATE TRIGGER trg_increment_reply_count AFTER INSERT ON public.forum_replies FOR EACH ROW EXECUTE FUNCTION public.increment_reply_count();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role        ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_credits     ON public.profiles(credits DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user   ON public.notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_conv_user         ON public.ai_conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_posts_created  ON public.forum_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_certs_verification   ON public.certificates(verification_code);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
