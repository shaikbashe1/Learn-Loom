
-- ── Extend existing forum_replies table ────────────────────────────────────
ALTER TABLE forum_replies
  ADD COLUMN IF NOT EXISTS parent_id  uuid REFERENCES forum_replies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- ── Add content length constraint if not present ──────────────────────────
ALTER TABLE forum_replies DROP CONSTRAINT IF EXISTS forum_replies_content_check;
ALTER TABLE forum_replies ADD CONSTRAINT forum_replies_content_check CHECK (char_length(content) BETWEEN 1 AND 5000);

-- ── RLS on forum_replies ──────────────────────────────────────────────────
ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='forum_replies' AND policyname='Anyone reads replies') THEN
    CREATE POLICY "Anyone reads replies" ON forum_replies FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='forum_replies' AND policyname='Users insert own replies') THEN
    CREATE POLICY "Users insert own replies" ON forum_replies FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='forum_replies' AND policyname='Users update own replies') THEN
    CREATE POLICY "Users update own replies" ON forum_replies FOR UPDATE TO authenticated USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='forum_replies' AND policyname='Users delete own replies or admin') THEN
    CREATE POLICY "Users delete own replies or admin" ON forum_replies FOR DELETE TO authenticated
      USING (user_id = auth.uid() OR is_admin(auth.uid()));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_forum_replies_post ON forum_replies(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_forum_replies_parent ON forum_replies(parent_id);

-- ── Auto-sync reply_count on forum_posts ───────────────────────────────────
CREATE OR REPLACE FUNCTION sync_reply_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_posts SET reply_count = reply_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_posts SET reply_count = GREATEST(0, reply_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_reply_count ON forum_replies;
CREATE TRIGGER trg_sync_reply_count
  AFTER INSERT OR DELETE ON forum_replies
  FOR EACH ROW EXECUTE FUNCTION sync_reply_count();

-- ── Forum reply votes ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forum_reply_votes (
  reply_id  uuid NOT NULL REFERENCES forum_replies(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (reply_id, user_id)
);

ALTER TABLE forum_reply_votes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='forum_reply_votes' AND policyname='Users manage own reply votes') THEN
    CREATE POLICY "Users manage own reply votes" ON forum_reply_votes
      FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- ── Atomic reply vote toggle ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION toggle_reply_vote(p_reply_id uuid, p_user_id uuid)
RETURNS TABLE(new_upvotes int, user_voted bool)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_existing int; v_new_count int;
BEGIN
  SELECT COUNT(*)::int INTO v_existing FROM forum_reply_votes WHERE reply_id = p_reply_id AND user_id = p_user_id;
  IF v_existing > 0 THEN
    DELETE FROM forum_reply_votes WHERE reply_id = p_reply_id AND user_id = p_user_id;
    UPDATE forum_replies SET upvotes = GREATEST(0, upvotes - 1) WHERE id = p_reply_id RETURNING upvotes INTO v_new_count;
    RETURN QUERY SELECT v_new_count, false;
  ELSE
    INSERT INTO forum_reply_votes(reply_id, user_id) VALUES (p_reply_id, p_user_id) ON CONFLICT DO NOTHING;
    UPDATE forum_replies SET upvotes = upvotes + 1 WHERE id = p_reply_id RETURNING upvotes INTO v_new_count;
    RETURN QUERY SELECT v_new_count, true;
  END IF;
END;
$$;

-- ── Enable Realtime ───────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE forum_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE forum_replies;
