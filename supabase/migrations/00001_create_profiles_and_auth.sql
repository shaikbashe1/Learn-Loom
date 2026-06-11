
-- ── 1. Roles enum ────────────────────────────────────────────────────────
CREATE TYPE public.user_role AS ENUM ('user', 'admin');

-- ── 2. Profiles table ────────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id        uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email     text,
  full_name text,
  avatar_url text,
  role      public.user_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ── 3. Auto-sync trigger ─────────────────────────────────────────────────
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
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    'user'::public.user_role
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 4. Helper: get role (avoids infinite recursion in RLS) ────────────────
CREATE OR REPLACE FUNCTION public.get_user_role(uid uuid)
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = uid;
$$;

-- ── 5. RLS Policies ──────────────────────────────────────────────────────
CREATE POLICY "admins_full_access" ON public.profiles
  FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin'::public.user_role);

CREATE POLICY "users_view_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (role IS NOT DISTINCT FROM public.get_user_role(auth.uid()));

-- ── 6. Public read-only view ─────────────────────────────────────────────
CREATE VIEW public.public_profiles AS
  SELECT id, full_name, avatar_url, role FROM public.profiles;
