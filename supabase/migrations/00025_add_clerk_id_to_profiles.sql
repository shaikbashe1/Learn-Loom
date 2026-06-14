-- Add clerk_id to profiles to securely map Clerk users to Supabase UUIDs
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS clerk_id text UNIQUE;
CREATE INDEX IF NOT EXISTS idx_profiles_clerk_id ON public.profiles(clerk_id);
