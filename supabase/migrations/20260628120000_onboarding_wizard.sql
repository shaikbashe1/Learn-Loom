-- ============================================================================
-- First-Time User Onboarding Wizard
-- Adds personalization columns to profiles, an avatars storage bucket with
-- per-user RLS, and a SECURITY DEFINER RPC for real-time username checks.
--
-- NOTE: `profiles.role` is a locked RBAC enum (user/student/admin/super_admin)
-- guarded by prevent_role_escalation() + the users_update_own RLS policy.
-- The onboarding "persona" (Student / Working Professional / Job Seeker /
-- Teacher / Other) is therefore stored in a SEPARATE column, `user_type`,
-- so it never collides with auth/RBAC.
-- ============================================================================

-- 1. Onboarding / personalization columns ------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username             TEXT,
  ADD COLUMN IF NOT EXISTS user_type            TEXT,          -- student / professional / job_seeker / teacher / other
  ADD COLUMN IF NOT EXISTS college_name         TEXT,
  ADD COLUMN IF NOT EXISTS course               TEXT,
  ADD COLUMN IF NOT EXISTS degree               TEXT,
  ADD COLUMN IF NOT EXISTS branch               TEXT,
  ADD COLUMN IF NOT EXISTS year                 INTEGER,
  ADD COLUMN IF NOT EXISTS semester             INTEGER,
  ADD COLUMN IF NOT EXISTS graduation_year      INTEGER,
  ADD COLUMN IF NOT EXISTS mobile_number        TEXT,
  ADD COLUMN IF NOT EXISTS mobile_verified      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS country              TEXT,
  ADD COLUMN IF NOT EXISTS state                TEXT,
  ADD COLUMN IF NOT EXISTS city                 TEXT,
  ADD COLUMN IF NOT EXISTS pincode              TEXT,
  ADD COLUMN IF NOT EXISTS language_preference  TEXT,
  ADD COLUMN IF NOT EXISTS dream_roles          TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS dream_companies      TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS interests            TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS learning_goal        TEXT,
  ADD COLUMN IF NOT EXISTS daily_learning_time  TEXT,
  ADD COLUMN IF NOT EXISTS resume_url           TEXT,
  ADD COLUMN IF NOT EXISTS portfolio_url        TEXT,
  -- Forward-compatible catch-all: future modular onboarding sections
  -- (projects, achievements, certifications, etc.) live here as JSON keys so
  -- they can be added WITHOUT new schema migrations. Promote a key to its own
  -- column later only if you need to index/query it.
  ADD COLUMN IF NOT EXISTS extensions           JSONB   NOT NULL DEFAULT '{}'::jsonb,
  -- onboarding_completed stays FALSE for everyone (incl. existing users) so the
  -- whole user base is guided through the new wizard exactly once on next login.
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  -- Records which wizard step a user last reached, enabling server-side resume
  -- across devices (the client also mirrors this in localStorage).
  ADD COLUMN IF NOT EXISTS onboarding_step      INTEGER NOT NULL DEFAULT 0;

-- Sanity check constraints (guarded so they never fail on existing rows) ------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_bio_len') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_bio_len CHECK (char_length(coalesce(bio, '')) <= 300) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_username_format') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_username_format
      CHECK (username IS NULL OR username ~ '^[a-zA-Z0-9_]{3,30}$') NOT VALID;
  END IF;
END $$;

-- Case-insensitive uniqueness for handles (@username) ------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed
  ON public.profiles (onboarding_completed);

-- 2. Real-time username availability RPC -------------------------------------
-- RLS only lets a user read their OWN profile row, so a client-side SELECT for
-- collisions returns nothing. This SECURITY DEFINER function answers
-- "is this handle free?" without exposing any other profile data.
CREATE OR REPLACE FUNCTION public.check_username_available(p_username TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- must match the allowed handle format
    (p_username ~ '^[a-zA-Z0-9_]{3,30}$')
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE lower(username) = lower(trim(p_username))
        AND id::text <> COALESCE(auth.uid()::text, '00000000-0000-0000-0000-000000000000')
    );
$$;

REVOKE ALL ON FUNCTION public.check_username_available(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_username_available(TEXT) TO anon, authenticated;

-- 3. Avatars storage bucket + per-user RLS -----------------------------------
-- The existing `course-assets` bucket is admin-write-only, so students cannot
-- upload their own avatar there. Create a dedicated public-read avatars bucket
-- where each user may only write inside a folder named after their own uid.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 'avatars', true, 5242880,
  ARRAY['image/png','image/jpeg','image/jpg','image/webp','image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png','image/jpeg','image/jpg','image/webp','image/gif'];

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='Avatars are publicly readable') THEN
    CREATE POLICY "Avatars are publicly readable"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'avatars');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='Users upload own avatar') THEN
    CREATE POLICY "Users upload own avatar"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='Users update own avatar') THEN
    CREATE POLICY "Users update own avatar"
      ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='Users delete own avatar') THEN
    CREATE POLICY "Users delete own avatar"
      ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- OPTIONAL: if you do NOT want existing users to be sent through onboarding,
-- mark every current profile as already completed by uncommenting the line
-- below. Leaving it commented means existing users also see the new wizard
-- once (recommended, so their personalization data gets collected too).
--
-- UPDATE public.profiles SET onboarding_completed = true WHERE onboarding_completed = false;
-- ----------------------------------------------------------------------------
