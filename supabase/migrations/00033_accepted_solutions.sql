-- ============================================================
-- LearnLoom Migration 00033 — Accepted Solutions, AI replies & Course Links
-- ============================================================

-- 1. Add is_accepted and is_ai columns to forum_replies
ALTER TABLE public.forum_replies ADD COLUMN IF NOT EXISTS is_accepted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.forum_replies ADD COLUMN IF NOT EXISTS is_ai BOOLEAN NOT NULL DEFAULT false;

-- 2. Add course_id and module_id to forum_posts
ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE;
ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS module_id TEXT;

-- 3. Create indexes for quick lookups
CREATE INDEX IF NOT EXISTS idx_forum_replies_is_accepted ON public.forum_replies(is_accepted) WHERE is_accepted = true;
CREATE INDEX IF NOT EXISTS idx_forum_posts_course_module ON public.forum_posts(course_id, module_id);

-- 4. Secure RPC function to mark a reply as accepted
CREATE OR REPLACE FUNCTION public.mark_reply_accepted(p_reply_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_id uuid;
  v_post_author uuid;
  v_reply_author uuid;
  v_already_accepted boolean;
BEGIN
  -- Get post info and reply author
  SELECT post_id, user_id, is_accepted INTO v_post_id, v_reply_author, v_already_accepted 
  FROM public.forum_replies 
  WHERE id = p_reply_id;
  
  IF v_post_id IS NULL THEN
    RAISE EXCEPTION 'Reply not found';
  END IF;

  -- Get post author
  SELECT user_id INTO v_post_author 
  FROM public.forum_posts 
  WHERE id = v_post_id;

  -- Verify permissions: only the post author can mark a reply as accepted
  IF v_post_author != p_user_id THEN
    RAISE EXCEPTION 'Only the post author can accept replies';
  END IF;

  -- If it's already accepted, we toggle it off (unaccept)
  IF v_already_accepted THEN
    UPDATE public.forum_replies SET is_accepted = false WHERE id = p_reply_id;
    -- Deduct the credits (+25 XP)
    PERFORM public.increment_credits(v_reply_author, -25);
  ELSE
    -- Unaccept all other replies for this post
    -- Deduct points from any previously accepted reply's author first
    DECLARE
      v_prev_author uuid;
    BEGIN
      SELECT user_id INTO v_prev_author 
      FROM public.forum_replies 
      WHERE post_id = v_post_id AND is_accepted = true;
      
      IF v_prev_author IS NOT NULL THEN
        PERFORM public.increment_credits(v_prev_author, -25);
      END IF;
    END;

    UPDATE public.forum_replies SET is_accepted = false WHERE post_id = v_post_id;
    
    -- Mark current reply as accepted
    UPDATE public.forum_replies SET is_accepted = true WHERE id = p_reply_id;
    
    -- Award credits (+25 XP)
    PERFORM public.increment_credits(v_reply_author, 25);
  END;
END;
$$;
