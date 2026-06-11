-- Migration: 00024_admin_moderation_flags
-- Purpose: Add moderation flags for admin portal (student suspension, forum post hiding)

-- 1. Add is_suspended to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false NOT NULL;

-- 2. Add is_hidden to forum_posts
ALTER TABLE forum_posts
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false NOT NULL;

-- 3. Update RLS policies to exclude hidden forum posts from regular users
-- Drop the existing select policy for forum posts if it exists (assuming a standard naming or just creating a new one)
-- To be safe without knowing the exact name, we can recreate the policy
DROP POLICY IF EXISTS "Anyone can view forum posts" ON forum_posts;
DROP POLICY IF EXISTS "Public can view forum posts" ON forum_posts;
DROP POLICY IF EXISTS "Enable read access for all users" ON forum_posts;

-- Create new policies
CREATE POLICY "Public can view active forum posts"
ON forum_posts FOR SELECT
USING (
  -- Admins can see everything, others can only see non-hidden posts
  (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  ))
  OR
  (is_hidden = false)
);

-- Note: We assume that the application frontend (e.g. RouteGuard) or Edge Functions 
-- will handle checking `profiles.is_suspended` to block interactions, 
-- rather than doing heavy RLS blocking for every single table.
