-- Create user_followers table
CREATE TABLE public.user_followers (
  follower_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);

-- Enable RLS
ALTER TABLE public.user_followers ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read followers (so public profiles can show follower counts)
CREATE POLICY "Anyone can view followers" ON public.user_followers
FOR SELECT USING (true);

-- Allow users to follow others (insert where follower_id is themselves)
CREATE POLICY "Users can follow others" ON public.user_followers
FOR INSERT TO authenticated WITH CHECK (follower_id = auth.uid()::text);

-- Allow users to unfollow others (delete where follower_id is themselves)
CREATE POLICY "Users can unfollow others" ON public.user_followers
FOR DELETE TO authenticated USING (follower_id = auth.uid()::text);

-- Add index for fast counting/lookups
CREATE INDEX idx_user_followers_following_id ON public.user_followers(following_id);
CREATE INDEX idx_user_followers_follower_id ON public.user_followers(follower_id);
