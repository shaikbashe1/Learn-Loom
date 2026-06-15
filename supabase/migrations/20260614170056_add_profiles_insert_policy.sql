-- Add insert policy for profiles to support Clerk auth integration
CREATE POLICY "users_insert_own" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid()::text = id::text);