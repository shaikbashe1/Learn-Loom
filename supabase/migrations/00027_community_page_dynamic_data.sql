-- ══════════════════════════════════════════════════════════════════════════
-- 1. ADD VIEWS TO FORUM POSTS
-- ══════════════════════════════════════════════════════════════════════════
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS views integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION increment_post_view(p_post_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE forum_posts SET views = views + 1 WHERE id = p_post_id;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════
-- 2. COMMUNITY GROUPS TABLE
-- ══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS community_groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  description text,
  icon        text NOT NULL DEFAULT 'group',
  color       text NOT NULL DEFAULT 'text-primary',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE community_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "groups_select_all" ON community_groups FOR SELECT USING (true);
CREATE POLICY "groups_admin_all" ON community_groups FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id::text = auth.uid()::text AND role = 'admin'));

-- Insert some default groups (safely ignoring conflicts)
INSERT INTO community_groups (name, description, icon, color) VALUES
  ('React Masters', 'Discuss advanced React concepts', 'code_blocks', 'text-[#61DAFB]'),
  ('Rustaceans', 'Safe systems programming in Rust', 'settings_b_roll', 'text-[#DEA584]'),
  ('AI Engineers', 'Machine learning and deep learning', 'psychology', 'text-secondary'),
  ('System Design', 'Scaling large applications', 'terminal', 'text-on-surface')
ON CONFLICT (name) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════
-- 3. COMMUNITY GROUP MEMBERSHIPS
-- ══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS community_group_memberships (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id   uuid NOT NULL REFERENCES community_groups(id) ON DELETE CASCADE,
  joined_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, group_id)
);

ALTER TABLE community_group_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "group_memberships_select_all" ON community_group_memberships FOR SELECT USING (true);
CREATE POLICY "group_memberships_insert_self" ON community_group_memberships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "group_memberships_delete_self" ON community_group_memberships FOR DELETE USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════════════════
-- 4. TRENDING TOPICS VIEW
-- ══════════════════════════════════════════════════════════════════════════
-- Extracts tags from posts created in the last 30 days and aggregates them
CREATE OR REPLACE VIEW trending_topics_view AS
SELECT 
  tag AS topic,
  COUNT(DISTINCT p.id) AS posts_count,
  SUM(p.reply_count + p.upvotes) AS engagement_score
FROM forum_posts p
CROSS JOIN unnest(p.tags) AS tag
WHERE p.created_at >= now() - interval '30 days'
GROUP BY tag
ORDER BY engagement_score DESC, posts_count DESC;

GRANT SELECT ON trending_topics_view TO anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- 5. TOP CONTRIBUTORS VIEW
-- ══════════════════════════════════════════════════════════════════════════
-- Calculate contributor score based on forum activity
CREATE OR REPLACE VIEW top_contributors_view AS
WITH user_stats AS (
  SELECT 
    p.user_id,
    COUNT(*) AS posts_count,
    SUM(p.upvotes) AS total_post_upvotes,
    SUM(p.reply_count) AS total_replies_received
  FROM forum_posts p
  GROUP BY p.user_id
),
reply_stats AS (
  SELECT
    r.user_id,
    COUNT(*) AS replies_given,
    SUM(r.upvotes) AS total_reply_upvotes
  FROM forum_replies r
  GROUP BY r.user_id
)
SELECT 
  prof.id AS user_id,
  prof.full_name,
  prof.avatar_url,
  COALESCE(u.posts_count, 0) AS posts_count,
  COALESCE(r.replies_given, 0) AS replies_given,
  (
    (COALESCE(u.posts_count, 0) * 10) +
    (COALESCE(r.replies_given, 0) * 5) +
    (COALESCE(u.total_post_upvotes, 0) * 2) +
    (COALESCE(r.total_reply_upvotes, 0) * 2)
  ) AS contributor_score
FROM profiles prof
LEFT JOIN user_stats u ON u.user_id::text = prof.id::text
LEFT JOIN reply_stats r ON r.user_id::text = prof.id::text
WHERE (COALESCE(u.posts_count, 0) + COALESCE(r.replies_given, 0)) > 0
ORDER BY contributor_score DESC;

GRANT SELECT ON top_contributors_view TO anon, authenticated;
