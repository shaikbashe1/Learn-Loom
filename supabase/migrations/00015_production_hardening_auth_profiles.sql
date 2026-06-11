
-- ============================================================
-- LearnLoom Production Hardening Migration
-- Phases: Profile columns, role enum, triggers, RLS, indexes
-- ============================================================

-- 1. Expand role enum to include student + instructor
--    (ADD VALUE is safe and idempotent with IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'student'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
    ALTER TYPE public.user_role ADD VALUE 'student';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'instructor'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
    ALTER TYPE public.user_role ADD VALUE 'instructor';
  END IF;
END$$;

-- 2. Add missing columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS credits       INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_days   INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_activity_date DATE;

-- 3. Ensure handle_new_user uses 'student' as default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    ),
    'student'::public.user_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    full_name  = CASE WHEN profiles.full_name  IS NULL OR profiles.full_name  = ''
                      THEN EXCLUDED.full_name  ELSE profiles.full_name  END,
    avatar_url = CASE WHEN profiles.avatar_url IS NULL OR profiles.avatar_url = ''
                      THEN EXCLUDED.avatar_url ELSE profiles.avatar_url END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. auto-update updated_at on profiles
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Role-escalation prevention trigger
--    Uses NEW/OLD comparison only — no auth.uid() which can be NULL server-side
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Only block if role is being changed
  IF OLD.role IS NOT DISTINCT FROM NEW.role THEN
    RETURN NEW;
  END IF;
  -- Allow if the caller is an admin (check via get_user_role helper)
  IF public.get_user_role(auth.uid()) = 'admin'::public.user_role THEN
    RETURN NEW;
  END IF;
  -- Block all other role changes
  RAISE EXCEPTION 'Role changes are not permitted. Contact an administrator.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

-- 6. Update the get_user_role helper to cover new roles
CREATE OR REPLACE FUNCTION public.get_user_role(uid uuid)
RETURNS public.user_role
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT role FROM public.profiles WHERE id = uid;
$$;

-- 7. Update is_admin helper (used in other policies)
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = uid AND role = 'admin'::public.user_role);
$$;

-- 8. Harden RLS: replace loose update policy with column-specific role-lock
DROP POLICY IF EXISTS "users_update_own" ON public.profiles;
CREATE POLICY "users_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role IS NOT DISTINCT FROM (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- 9. Performance indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role        ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email       ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at  ON public.profiles(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_credits     ON public.profiles(credits DESC);
