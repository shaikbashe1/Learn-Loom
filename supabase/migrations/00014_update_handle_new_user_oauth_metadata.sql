
-- Drop duplicate RLS policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Replace handle_new_user to sync full_name + avatar_url from OAuth/email metadata
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
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    'user'::public.user_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    full_name  = CASE WHEN profiles.full_name IS NULL OR profiles.full_name = ''
                      THEN EXCLUDED.full_name ELSE profiles.full_name END,
    avatar_url = CASE WHEN profiles.avatar_url IS NULL OR profiles.avatar_url = ''
                      THEN EXCLUDED.avatar_url ELSE profiles.avatar_url END;
  RETURN NEW;
END;
$$;

-- Ensure trigger exists (idempotent via drop+create)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
