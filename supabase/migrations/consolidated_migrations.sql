-- ============================================================================
-- LearnLoom Consolidated Migrations (June 28-29, 2026)
-- Onboarding Wizard, Community 2.0 (Phase 1 & 2), Messaging Portal, and Followers
-- ============================================================================


-- -------------------------------------------------------------
-- MIGRATION: 20260628120000_onboarding_wizard.sql
-- -------------------------------------------------------------
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


-- -------------------------------------------------------------
-- MIGRATION: 20260628133500_community_v2_phase1.sql
-- -------------------------------------------------------------
-- ============================================================================
-- Community 2.0 Phase 1 Migration
-- Adds post_media, followers, and reactions tables.
-- Sets up community_media Storage bucket.
-- ============================================================================

-- 1. Create community_media Storage Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('community_media', 'community_media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for community_media
DROP POLICY IF EXISTS "community_media_public_access" ON storage.objects;
CREATE POLICY "community_media_public_access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'community_media');

DROP POLICY IF EXISTS "community_media_upload" ON storage.objects;
CREATE POLICY "community_media_upload" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'community_media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "community_media_delete" ON storage.objects;
CREATE POLICY "community_media_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'community_media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 2. Create post_media table
CREATE TABLE IF NOT EXISTS public.post_media (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_type TEXT CHECK (file_type IN ('image', 'video', 'pdf', 'document')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_media_post_id ON public.post_media(post_id);

ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "post_media_select" ON public.post_media;
CREATE POLICY "post_media_select" ON public.post_media FOR SELECT USING (true);
DROP POLICY IF EXISTS "post_media_insert" ON public.post_media;
CREATE POLICY "post_media_insert" ON public.post_media FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "post_media_delete" ON public.post_media;
CREATE POLICY "post_media_delete" ON public.post_media FOR DELETE TO authenticated USING (auth.uid()::text = user_id);

-- 3. Create followers table
CREATE TABLE IF NOT EXISTS public.followers (
    follower_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_followers_follower_id ON public.followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following_id ON public.followers(following_id);

ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "followers_select" ON public.followers;
CREATE POLICY "followers_select" ON public.followers FOR SELECT USING (true);
DROP POLICY IF EXISTS "followers_insert" ON public.followers;
CREATE POLICY "followers_insert" ON public.followers FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = follower_id);
DROP POLICY IF EXISTS "followers_delete" ON public.followers;
CREATE POLICY "followers_delete" ON public.followers FOR DELETE TO authenticated USING (auth.uid()::text = follower_id);

-- 4. Create reactions table (Migrating away from forum_votes)
CREATE TABLE IF NOT EXISTS public.reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
    reaction_type TEXT CHECK (reaction_type IN ('like', 'love', 'inspiring', 'helpful', 'congratulations')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON public.reactions(post_id);

ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reactions_select" ON public.reactions;
CREATE POLICY "reactions_select" ON public.reactions FOR SELECT USING (true);
DROP POLICY IF EXISTS "reactions_insert" ON public.reactions;
CREATE POLICY "reactions_insert" ON public.reactions FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "reactions_update" ON public.reactions;
CREATE POLICY "reactions_update" ON public.reactions FOR UPDATE TO authenticated USING (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "reactions_delete" ON public.reactions;
CREATE POLICY "reactions_delete" ON public.reactions FOR DELETE TO authenticated USING (auth.uid()::text = user_id);

-- Note: In Phase 2 we will migrate data from forum_votes to reactions.


-- -------------------------------------------------------------
-- MIGRATION: 20260628140000_community_v2_phase2.sql
-- -------------------------------------------------------------
-- ============================================================================
-- Community 2.0 Phase 2 Migration
-- Adds RPCs for Multi-Reactions and Follow System
-- Migrates old forum_votes data to the new reactions table
-- ============================================================================

-- 1. Migrate old forum_votes data to the new reactions table
INSERT INTO public.reactions (post_id, user_id, reaction_type)
SELECT post_id, user_id, 'like'
FROM public.forum_votes
ON CONFLICT (post_id, user_id) DO NOTHING;

-- 2. Drop the old toggle_forum_vote RPC to prevent usage (optional, but good for cleanup)
-- DROP FUNCTION IF EXISTS public.toggle_forum_vote(uuid, uuid);
-- DROP FUNCTION IF EXISTS public.toggle_forum_vote(uuid, text);

-- 3. RPC for Multi-Reactions
CREATE OR REPLACE FUNCTION public.toggle_reaction(p_post_id UUID, p_user_id TEXT, p_reaction_type TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing_type TEXT;
    v_new_type TEXT := NULL;
    v_total_reactions INT;
BEGIN
    -- Check if a reaction already exists for this user and post
    SELECT reaction_type INTO v_existing_type
    FROM public.reactions
    WHERE post_id = p_post_id AND user_id = p_user_id;

    IF v_existing_type IS NOT NULL THEN
        IF v_existing_type = p_reaction_type THEN
            -- If same reaction, remove it (toggle off)
            DELETE FROM public.reactions WHERE post_id = p_post_id AND user_id = p_user_id;
        ELSE
            -- If different reaction, update it
            UPDATE public.reactions SET reaction_type = p_reaction_type WHERE post_id = p_post_id AND user_id = p_user_id;
            v_new_type := p_reaction_type;
        END IF;
    ELSE
        -- Insert new reaction
        INSERT INTO public.reactions (post_id, user_id, reaction_type) VALUES (p_post_id, p_user_id, p_reaction_type);
        v_new_type := p_reaction_type;
    END IF;

    -- Calculate total reactions for the post
    SELECT count(*) INTO v_total_reactions
    FROM public.reactions
    WHERE post_id = p_post_id;

    -- Sync back to forum_posts.upvotes for backward compatibility (optional but recommended)
    UPDATE public.forum_posts SET upvotes = v_total_reactions WHERE id = p_post_id;

    RETURN json_build_object(
        'user_reaction', v_new_type,
        'total_reactions', v_total_reactions
    );
END;
$$;

-- 4. RPC for Follow System
CREATE OR REPLACE FUNCTION public.toggle_follow(p_following_id TEXT, p_follower_id TEXT)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    -- Cannot follow yourself
    IF p_following_id = p_follower_id THEN
        RETURN FALSE;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.followers 
        WHERE follower_id = p_follower_id AND following_id = p_following_id
    ) INTO v_exists;

    IF v_exists THEN
        DELETE FROM public.followers 
        WHERE follower_id = p_follower_id AND following_id = p_following_id;
        RETURN FALSE;
    ELSE
        INSERT INTO public.followers (follower_id, following_id) 
        VALUES (p_follower_id, p_following_id);
        RETURN TRUE;
    END IF;
END;
$$;


-- -------------------------------------------------------------
-- MIGRATION: 20260628200900_messaging_portal.sql
-- -------------------------------------------------------------
-- ============================================================
-- LearnLoom Migration 20260628200900 — Messaging Portal
-- ============================================================

-- Helper: Check if a user can message another user
CREATE OR REPLACE FUNCTION public.can_message_user(u1 text, u2 text)
RETURNS boolean AS $$
DECLARE
  u1_role public.user_role;
  u2_role public.user_role;
BEGIN
  -- Get roles
  SELECT role INTO u1_role FROM public.profiles WHERE id = u1;
  SELECT role INTO u2_role FROM public.profiles WHERE id = u2;

  -- If either is an admin-level user, allow
  IF u1_role IN ('admin'::public.user_role, 'super_admin'::public.user_role, 'org_admin'::public.user_role) 
     OR u2_role IN ('admin'::public.user_role, 'super_admin'::public.user_role, 'org_admin'::public.user_role) THEN
    RETURN true;
  END IF;

  -- Check if they have a student-instructor relationship via enrollments
  -- (u1 is student, u2 is instructor)
  IF EXISTS (
    SELECT 1 FROM public.user_course_enrollments e
    JOIN public.courses c ON e.course_id = c.id
    WHERE e.user_id = u1 AND c.created_by = u2
  ) THEN
    RETURN true;
  END IF;

  -- (u2 is student, u1 is instructor)
  IF EXISTS (
    SELECT 1 FROM public.user_course_enrollments e
    JOIN public.courses c ON e.course_id = c.id
    WHERE e.user_id = u2 AND c.created_by = u1
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 1. Conversations Table ───────────────────────────────────────────────────
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_by text DEFAULT auth.uid()::text
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- ── 2. Conversation Participants ─────────────────────────────────────────────
CREATE TABLE public.conversation_participants (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- ── 3. Messages ─────────────────────────────────────────────────────────────
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ── 4. Triggers ──────────────────────────────────────────────────────────────

-- Update last_message_at on the conversation
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS trigger AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_conv_last_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.update_conversation_last_message();

-- Notify recipient
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger AS $$
DECLARE
  v_recipient_id text;
  v_sender_name text;
BEGIN
  -- Get sender name
  SELECT full_name INTO v_sender_name FROM public.profiles WHERE id = NEW.sender_id;
  
  -- Get recipient
  SELECT user_id INTO v_recipient_id 
  FROM public.conversation_participants 
  WHERE conversation_id = NEW.conversation_id AND user_id != NEW.sender_id
  LIMIT 1;
  
  -- Insert notification
  IF v_recipient_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, message)
    VALUES (v_recipient_id, 'info', COALESCE(v_sender_name, 'Someone') || ' sent you a message.');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER notify_new_message_trigger
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

-- ── 5. RLS Policies ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.conversation_participants 
    WHERE conversation_id = conv_id AND user_id = auth.uid()::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conversations
DROP POLICY IF EXISTS "Participant can view conversations" ON public.conversations;
CREATE POLICY "Participant can view conversations" ON public.conversations
FOR SELECT USING ( created_by = auth.uid()::text OR public.is_conversation_participant(id) );

DROP POLICY IF EXISTS "Authenticated users can insert conversations" ON public.conversations;
CREATE POLICY "Authenticated users can insert conversations" ON public.conversations
FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Participant can update conversations" ON public.conversations;
CREATE POLICY "Participant can update conversations" ON public.conversations
FOR UPDATE USING ( public.is_conversation_participant(id) );

-- Conversation Participants
DROP POLICY IF EXISTS "Participant can view conversation participants" ON public.conversation_participants;
CREATE POLICY "Participant can view conversation participants" ON public.conversation_participants
FOR SELECT USING ( public.is_conversation_participant(conversation_id) );

DROP POLICY IF EXISTS "Users can add themselves and others if permitted" ON public.conversation_participants;
CREATE POLICY "Users can add themselves and others if permitted" ON public.conversation_participants
FOR INSERT TO authenticated WITH CHECK (
  auth.uid()::text = user_id OR public.can_message_user(auth.uid()::text, user_id)
);

-- Messages
DROP POLICY IF EXISTS "Participant can view messages" ON public.messages;
CREATE POLICY "Participant can view messages" ON public.messages
FOR SELECT USING ( public.is_conversation_participant(conversation_id) );

DROP POLICY IF EXISTS "Participant can insert messages" ON public.messages;
CREATE POLICY "Participant can insert messages" ON public.messages
FOR INSERT TO authenticated WITH CHECK (
  sender_id = auth.uid()::text AND
  public.is_conversation_participant(conversation_id)
);

DROP POLICY IF EXISTS "Participant can update messages" ON public.messages;
CREATE POLICY "Participant can update messages" ON public.messages
FOR UPDATE USING ( public.is_conversation_participant(conversation_id) );

-- ── 6. Realtime Configuration ────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;


-- -------------------------------------------------------------
-- MIGRATION: 20260628212000_user_followers.sql
-- -------------------------------------------------------------
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
DROP POLICY IF EXISTS "Anyone can view followers" ON public.user_followers;
CREATE POLICY "Anyone can view followers" ON public.user_followers
FOR SELECT USING (true);

-- Allow users to follow others (insert where follower_id is themselves)
DROP POLICY IF EXISTS "Users can follow others" ON public.user_followers;
CREATE POLICY "Users can follow others" ON public.user_followers
FOR INSERT TO authenticated WITH CHECK (follower_id = auth.uid()::text);

-- Allow users to unfollow others (delete where follower_id is themselves)
DROP POLICY IF EXISTS "Users can unfollow others" ON public.user_followers;
CREATE POLICY "Users can unfollow others" ON public.user_followers
FOR DELETE TO authenticated USING (follower_id = auth.uid()::text);

-- Add index for fast counting/lookups
CREATE INDEX idx_user_followers_following_id ON public.user_followers(following_id);
CREATE INDEX idx_user_followers_follower_id ON public.user_followers(follower_id);


-- -------------------------------------------------------------
-- Schema Cache Reload
-- -------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
