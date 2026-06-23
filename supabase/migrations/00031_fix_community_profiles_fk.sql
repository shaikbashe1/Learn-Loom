-- ============================================================
-- Migration: Fix Community Profiles Foreign Keys
-- Changes the user_id FKs on forum tables from auth.users to profiles
-- to support Clerk integration and resolve PostgREST join errors.
-- ============================================================

-- 1. Forum Posts
ALTER TABLE public.forum_posts DROP CONSTRAINT IF EXISTS forum_posts_user_id_fkey;
ALTER TABLE public.forum_posts 
  ADD CONSTRAINT forum_posts_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Forum Replies
ALTER TABLE public.forum_replies DROP CONSTRAINT IF EXISTS forum_replies_user_id_fkey;
ALTER TABLE public.forum_replies 
  ADD CONSTRAINT forum_replies_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Forum Votes
ALTER TABLE public.forum_votes DROP CONSTRAINT IF EXISTS forum_votes_user_id_fkey;
ALTER TABLE public.forum_votes 
  ADD CONSTRAINT forum_votes_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 4. Community Group Memberships
ALTER TABLE public.community_group_memberships DROP CONSTRAINT IF EXISTS community_group_memberships_user_id_fkey;
ALTER TABLE public.community_group_memberships 
  ADD CONSTRAINT community_group_memberships_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
