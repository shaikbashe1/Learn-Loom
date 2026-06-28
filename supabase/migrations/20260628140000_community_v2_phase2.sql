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
