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
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'community_media');

CREATE POLICY "Authenticated users can upload media" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'community_media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'community_media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 2. Create post_media table
CREATE TABLE IF NOT EXISTS public.post_media (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_type TEXT CHECK (file_type IN ('image', 'video', 'pdf', 'document')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_media_post_id ON public.post_media(post_id);

ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "post_media_select" ON public.post_media FOR SELECT USING (true);
CREATE POLICY "post_media_insert" ON public.post_media FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "post_media_delete" ON public.post_media FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3. Create followers table
CREATE TABLE IF NOT EXISTS public.followers (
    follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_followers_follower_id ON public.followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following_id ON public.followers(following_id);

ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "followers_select" ON public.followers FOR SELECT USING (true);
CREATE POLICY "followers_insert" ON public.followers FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "followers_delete" ON public.followers FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- 4. Create reactions table (Migrating away from forum_votes)
CREATE TABLE IF NOT EXISTS public.reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    reaction_type TEXT CHECK (reaction_type IN ('like', 'love', 'inspiring', 'helpful', 'congratulations')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON public.reactions(post_id);

ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reactions_select" ON public.reactions FOR SELECT USING (true);
CREATE POLICY "reactions_insert" ON public.reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reactions_update" ON public.reactions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "reactions_delete" ON public.reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Note: In Phase 2 we will migrate data from forum_votes to reactions.
