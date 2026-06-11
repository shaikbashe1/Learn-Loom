
-- ══════════════════════════════════════════════════════════════════════════
-- 1. PERFORMANCE INDEXES (missing on FK / query columns)
-- ══════════════════════════════════════════════════════════════════════════
CREATE INDEX idx_course_modules_course_id ON course_modules(course_id);
CREATE INDEX idx_course_modules_sort_order ON course_modules(course_id, sort_order);
CREATE INDEX idx_assignments_course_id ON assignments(course_id);
CREATE INDEX idx_quiz_questions_quiz_id ON quiz_questions(quiz_id, sort_order);
CREATE INDEX idx_quizzes_course_id ON quizzes(course_id);
CREATE INDEX idx_quizzes_is_grand_test ON quizzes(course_id, is_grand_test);
CREATE INDEX idx_assignment_submissions_user_id ON assignment_submissions(user_id);
CREATE INDEX idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX idx_user_module_progress_user_course ON user_module_progress(user_id, course_id);
CREATE INDEX idx_user_course_enrollments_user_id ON user_course_enrollments(user_id);
CREATE INDEX idx_courses_is_published ON courses(is_published, created_at);

-- ══════════════════════════════════════════════════════════════════════════
-- 2. PROFILES: add credits + streak columns
-- ══════════════════════════════════════════════════════════════════════════
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS credits integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS streak_days integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_activity_date date;

-- ══════════════════════════════════════════════════════════════════════════
-- 3. FORUM POSTS
-- ══════════════════════════════════════════════════════════════════════════
CREATE TABLE forum_posts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      text NOT NULL CHECK (char_length(title) BETWEEN 5 AND 200),
  content    text NOT NULL CHECK (char_length(content) >= 10),
  category   text NOT NULL DEFAULT 'general' CHECK (category IN ('general','doubt','challenge','study-group')),
  tags       text[] NOT NULL DEFAULT '{}',
  upvotes    integer NOT NULL DEFAULT 0,
  reply_count integer NOT NULL DEFAULT 0,
  is_pinned  boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_forum_posts_user_id ON forum_posts(user_id);
CREATE INDEX idx_forum_posts_created_at ON forum_posts(created_at DESC);
CREATE INDEX idx_forum_posts_category ON forum_posts(category);

-- ══════════════════════════════════════════════════════════════════════════
-- 4. FORUM REPLIES
-- ══════════════════════════════════════════════════════════════════════════
CREATE TABLE forum_replies (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    text NOT NULL CHECK (char_length(content) >= 2),
  upvotes    integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_forum_replies_post_id ON forum_replies(post_id, created_at);
CREATE INDEX idx_forum_replies_user_id ON forum_replies(user_id);

-- ══════════════════════════════════════════════════════════════════════════
-- 5. FORUM VOTES (prevent duplicate voting)
-- ══════════════════════════════════════════════════════════════════════════
CREATE TABLE forum_votes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id    uuid REFERENCES forum_posts(id) ON DELETE CASCADE,
  reply_id   uuid REFERENCES forum_replies(id) ON DELETE CASCADE,
  vote_type  smallint NOT NULL DEFAULT 1 CHECK (vote_type IN (1, -1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forum_votes_target_check CHECK (
    (post_id IS NOT NULL AND reply_id IS NULL) OR
    (post_id IS NULL AND reply_id IS NOT NULL)
  ),
  UNIQUE (user_id, post_id),
  UNIQUE (user_id, reply_id)
);

CREATE INDEX idx_forum_votes_post_id ON forum_votes(post_id);

-- ══════════════════════════════════════════════════════════════════════════
-- 6. CERTIFICATES
-- ══════════════════════════════════════════════════════════════════════════
CREATE TABLE certificates (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id         uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  quiz_attempt_id   uuid REFERENCES quiz_attempts(id),
  score             integer NOT NULL CHECK (score BETWEEN 0 AND 100),
  verification_code text UNIQUE NOT NULL,
  issued_at         timestamptz NOT NULL DEFAULT now(),
  is_valid          boolean NOT NULL DEFAULT true,
  UNIQUE(user_id, course_id)
);

CREATE INDEX idx_certificates_user_id ON certificates(user_id);
CREATE INDEX idx_certificates_verification_code ON certificates(verification_code);

-- ══════════════════════════════════════════════════════════════════════════
-- 7. AUTO-GENERATE VERIFICATION CODE
-- ══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION generate_cert_code()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.verification_code IS NULL OR NEW.verification_code = '' THEN
    NEW.verification_code := 'LL-' || to_char(now(), 'YYYY') || '-CERT-' ||
      upper(substring(replace(NEW.id::text, '-', ''), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cert_code
BEFORE INSERT ON certificates
FOR EACH ROW EXECUTE FUNCTION generate_cert_code();

-- ══════════════════════════════════════════════════════════════════════════
-- 8. LEADERBOARD VIEW (real-time, derived from DB)
-- ══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW leaderboard_view AS
SELECT
  p.id                                                           AS user_id,
  p.full_name,
  p.avatar_url,
  p.credits,
  p.streak_days,
  COALESCE(enroll_counts.completed, 0)                           AS courses_completed,
  COALESCE(cert_counts.cert_count, 0)                            AS certificates_earned,
  ROW_NUMBER() OVER (ORDER BY p.credits DESC, p.streak_days DESC) AS rank
FROM profiles p
LEFT JOIN (
  SELECT user_id, COUNT(*) FILTER (WHERE completed_at IS NOT NULL) AS completed
  FROM user_course_enrollments GROUP BY user_id
) enroll_counts ON enroll_counts.user_id = p.id
LEFT JOIN (
  SELECT user_id, COUNT(*) AS cert_count
  FROM certificates GROUP BY user_id
) cert_counts ON cert_counts.user_id = p.id
ORDER BY rank;

-- ══════════════════════════════════════════════════════════════════════════
-- 9. ADMIN STATS VIEW
-- ══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW admin_stats AS
SELECT
  (SELECT COUNT(*) FROM profiles WHERE role = 'user')::integer            AS total_students,
  (SELECT COUNT(*) FROM courses WHERE is_published = true)::integer       AS total_courses,
  (SELECT COUNT(*) FROM user_course_enrollments)::integer                 AS total_enrollments,
  (SELECT COUNT(*) FROM user_course_enrollments WHERE completed_at IS NOT NULL)::integer AS completed_enrollments,
  (SELECT COUNT(*) FROM certificates WHERE is_valid = true)::integer      AS certificates_issued,
  (SELECT COUNT(*) FROM quiz_attempts)::integer                           AS total_quiz_attempts,
  (SELECT COUNT(*) FROM assignment_submissions)::integer                  AS total_submissions,
  (SELECT COUNT(*) FROM forum_posts)::integer                             AS forum_posts_count;

-- ══════════════════════════════════════════════════════════════════════════
-- 10. AUTO-AWARD CERTIFICATE AFTER PASSING GRAND TEST
-- ══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION auto_award_certificate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_course_id uuid;
  v_score_pct  integer;
BEGIN
  -- Only fire when a grand test attempt is inserted and passed
  IF NOT NEW.passed THEN RETURN NEW; END IF;

  SELECT course_id INTO v_course_id FROM quizzes WHERE id = NEW.quiz_id AND is_grand_test = true;
  IF v_course_id IS NULL THEN RETURN NEW; END IF;

  v_score_pct := ROUND((NEW.score::numeric / NULLIF(NEW.total, 0)) * 100);

  INSERT INTO certificates (user_id, course_id, quiz_attempt_id, score, verification_code)
  VALUES (NEW.user_id, v_course_id, NEW.id, v_score_pct, '')
  ON CONFLICT (user_id, course_id) DO NOTHING;

  -- Award credits for passing grand test
  UPDATE profiles SET credits = credits + 100 WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_certificate
AFTER INSERT ON quiz_attempts
FOR EACH ROW EXECUTE FUNCTION auto_award_certificate();

-- ══════════════════════════════════════════════════════════════════════════
-- 11. AWARD CREDITS FOR MODULE COMPLETION
-- ══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION award_module_credits()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    UPDATE profiles SET credits = credits + 10, last_activity_date = CURRENT_DATE
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_module_credits
AFTER UPDATE ON user_module_progress
FOR EACH ROW EXECUTE FUNCTION award_module_credits();

-- ══════════════════════════════════════════════════════════════════════════
-- 12. TRACK FORUM REPLY COUNT ON POSTS
-- ══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_post_reply_count()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_posts SET reply_count = reply_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_posts SET reply_count = GREATEST(0, reply_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_reply_count
AFTER INSERT OR DELETE ON forum_replies
FOR EACH ROW EXECUTE FUNCTION update_post_reply_count();

-- ══════════════════════════════════════════════════════════════════════════
-- 13. RLS POLICIES
-- ══════════════════════════════════════════════════════════════════════════

-- Forum posts
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_posts_select_all" ON forum_posts FOR SELECT USING (true);
CREATE POLICY "forum_posts_insert_auth" ON forum_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "forum_posts_update_own" ON forum_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "forum_posts_delete_own" ON forum_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Forum replies
ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_replies_select_all" ON forum_replies FOR SELECT USING (true);
CREATE POLICY "forum_replies_insert_auth" ON forum_replies FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "forum_replies_update_own" ON forum_replies FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "forum_replies_delete_own" ON forum_replies FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Forum votes
ALTER TABLE forum_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_votes_select_all" ON forum_votes FOR SELECT USING (true);
CREATE POLICY "forum_votes_insert_auth" ON forum_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "forum_votes_delete_own" ON forum_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Certificates
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "certs_select_own" ON certificates FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "certs_select_verify" ON certificates FOR SELECT USING (is_valid = true);
CREATE POLICY "certs_insert_service" ON certificates FOR INSERT WITH CHECK (true);
CREATE POLICY "certs_update_admin" ON certificates FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Leaderboard view: public read
GRANT SELECT ON leaderboard_view TO anon, authenticated;

-- Admin stats view
GRANT SELECT ON admin_stats TO authenticated;
