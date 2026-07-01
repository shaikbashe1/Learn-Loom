-- ── LearnLoom Coding Practice Module Schema ──────────────────────────────────────

-- 1. problem_tags
CREATE TABLE IF NOT EXISTS problem_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id text NOT NULL REFERENCES coding_problems(id) ON DELETE CASCADE,
  tag text NOT NULL,
  UNIQUE(problem_id, tag)
);

ALTER TABLE problem_tags ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='problem_tags' AND policyname='Anyone reads problem_tags') THEN
    CREATE POLICY "Anyone reads problem_tags" ON problem_tags FOR SELECT USING (true);
  END IF;
END $$;

-- 2. problem_testcases
CREATE TABLE IF NOT EXISTS problem_testcases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id text NOT NULL REFERENCES coding_problems(id) ON DELETE CASCADE,
  input_data text NOT NULL,
  expected_output text NOT NULL,
  is_hidden boolean NOT NULL DEFAULT false,
  explanation text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE problem_testcases ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='problem_testcases' AND policyname='Anyone reads visible problem_testcases') THEN
    CREATE POLICY "Anyone reads visible problem_testcases" ON problem_testcases FOR SELECT USING (is_hidden = false);
  END IF;
END $$;

-- 3. submissions
CREATE TABLE IF NOT EXISTS submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  problem_id text NOT NULL REFERENCES coding_problems(id) ON DELETE CASCADE,
  language text NOT NULL,
  source_code text NOT NULL,
  verdict text NOT NULL DEFAULT 'pending',
  time_ms numeric,
  memory_kb numeric,
  credits_awarded int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='submissions' AND policyname='Users view own submissions') THEN
    CREATE POLICY "Users view own submissions" ON submissions FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='submissions' AND policyname='Users insert own submissions') THEN
    CREATE POLICY "Users insert own submissions" ON submissions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- 4. daily_challenges
CREATE TABLE IF NOT EXISTS daily_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_date date NOT NULL UNIQUE,
  easy_problem_id text REFERENCES coding_problems(id),
  medium_problem_id text REFERENCES coding_problems(id),
  hard_problem_id text REFERENCES coding_problems(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='daily_challenges' AND policyname='Anyone reads daily_challenges') THEN
    CREATE POLICY "Anyone reads daily_challenges" ON daily_challenges FOR SELECT USING (true);
  END IF;
END $$;

-- 5. roadmaps
CREATE TABLE IF NOT EXISTS roadmaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE roadmaps ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='roadmaps' AND policyname='Anyone reads roadmaps') THEN
    CREATE POLICY "Anyone reads roadmaps" ON roadmaps FOR SELECT USING (true);
  END IF;
END $$;

-- 6. roadmap_topics
CREATE TABLE IF NOT EXISTS roadmap_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id uuid NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  order_index int NOT NULL DEFAULT 0,
  problem_ids text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE roadmap_topics ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='roadmap_topics' AND policyname='Anyone reads roadmap_topics') THEN
    CREATE POLICY "Anyone reads roadmap_topics" ON roadmap_topics FOR SELECT USING (true);
  END IF;
END $$;

-- 7. contests
CREATE TABLE IF NOT EXISTS contests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contests ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='contests' AND policyname='Anyone reads contests') THEN
    CREATE POLICY "Anyone reads contests" ON contests FOR SELECT USING (true);
  END IF;
END $$;

-- 8. contest_problems
CREATE TABLE IF NOT EXISTS contest_problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id uuid NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  problem_id text NOT NULL REFERENCES coding_problems(id) ON DELETE CASCADE,
  points int NOT NULL DEFAULT 100,
  order_index int NOT NULL DEFAULT 0,
  UNIQUE(contest_id, problem_id)
);

ALTER TABLE contest_problems ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='contest_problems' AND policyname='Anyone reads contest_problems') THEN
    CREATE POLICY "Anyone reads contest_problems" ON contest_problems FOR SELECT USING (true);
  END IF;
END $$;

-- 9. contest_submissions
CREATE TABLE IF NOT EXISTS contest_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id uuid NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  problem_id text NOT NULL REFERENCES coding_problems(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  points_awarded int NOT NULL DEFAULT 0,
  penalty_time_ms bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contest_submissions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='contest_submissions' AND policyname='Anyone reads contest_submissions') THEN
    CREATE POLICY "Anyone reads contest_submissions" ON contest_submissions FOR SELECT USING (true);
  END IF;
END $$;

-- 10. badges
CREATE TABLE IF NOT EXISTS badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  icon_url text NOT NULL,
  criteria_type text NOT NULL,
  criteria_value int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='badges' AND policyname='Anyone reads badges') THEN
    CREATE POLICY "Anyone reads badges" ON badges FOR SELECT USING (true);
  END IF;
END $$;

-- 11. user_badges
CREATE TABLE IF NOT EXISTS user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_badges' AND policyname='Anyone reads user_badges') THEN
    CREATE POLICY "Anyone reads user_badges" ON user_badges FOR SELECT USING (true);
  END IF;
END $$;

-- 12. leaderboards
CREATE TABLE IF NOT EXISTS leaderboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contest_rating int NOT NULL DEFAULT 1500,
  global_rank int,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='leaderboards' AND policyname='Anyone reads leaderboards') THEN
    CREATE POLICY "Anyone reads leaderboards" ON leaderboards FOR SELECT USING (true);
  END IF;
END $$;

-- 13. coding_progress
CREATE TABLE IF NOT EXISTS coding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  problems_solved int NOT NULL DEFAULT 0,
  easy_solved int NOT NULL DEFAULT 0,
  medium_solved int NOT NULL DEFAULT 0,
  hard_solved int NOT NULL DEFAULT 0,
  total_xp int NOT NULL DEFAULT 0,
  current_level text NOT NULL DEFAULT 'Beginner',
  accuracy_rate numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE coding_progress ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='coding_progress' AND policyname='Anyone reads coding_progress') THEN
    CREATE POLICY "Anyone reads coding_progress" ON coding_progress FOR SELECT USING (true);
  END IF;
END $$;

-- 14. editorials
CREATE TABLE IF NOT EXISTS editorials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id text NOT NULL REFERENCES coding_problems(id) ON DELETE CASCADE,
  content text NOT NULL,
  author_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(problem_id)
);

ALTER TABLE editorials ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='editorials' AND policyname='Anyone reads editorials') THEN
    CREATE POLICY "Anyone reads editorials" ON editorials FOR SELECT USING (true);
  END IF;
END $$;

-- 15. discussions
CREATE TABLE IF NOT EXISTS discussions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id text NOT NULL REFERENCES coding_problems(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  parent_id uuid REFERENCES discussions(id) ON DELETE CASCADE,
  upvotes int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='discussions' AND policyname='Anyone reads discussions') THEN
    CREATE POLICY "Anyone reads discussions" ON discussions FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='discussions' AND policyname='Users insert own discussions') THEN
    CREATE POLICY "Users insert own discussions" ON discussions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- 16. saved_code
CREATE TABLE IF NOT EXISTS saved_code (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  problem_id text NOT NULL REFERENCES coding_problems(id) ON DELETE CASCADE,
  language text NOT NULL,
  code text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, problem_id, language)
);

ALTER TABLE saved_code ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='saved_code' AND policyname='Users manage own saved_code') THEN
    CREATE POLICY "Users manage own saved_code" ON saved_code FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;
