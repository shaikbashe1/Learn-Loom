
-- ── coding_problems ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coding_problems (
  id           text        PRIMARY KEY,
  title        text        NOT NULL,
  difficulty   text        NOT NULL CHECK (difficulty IN ('Beginner','Intermediate','Advanced')),
  description  text        NOT NULL,
  examples     jsonb       NOT NULL DEFAULT '[]',
  constraints  jsonb       NOT NULL DEFAULT '[]',
  starter_code jsonb       NOT NULL DEFAULT '{}',
  test_cases   jsonb       NOT NULL DEFAULT '[]',
  is_daily     boolean     NOT NULL DEFAULT false,
  credits      int         NOT NULL DEFAULT 5,
  sort_order   int         NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE coding_problems ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='coding_problems' AND policyname='Anyone reads problems') THEN
    CREATE POLICY "Anyone reads problems" ON coding_problems FOR SELECT USING (true);
  END IF;
END $$;

-- ── coding_submissions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coding_submissions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  problem_id      text        NOT NULL REFERENCES coding_problems(id),
  language        text        NOT NULL,
  source_code     text        NOT NULL,
  verdict         text        NOT NULL DEFAULT 'pending'
                  CHECK (verdict IN ('pending','accepted','wrong_answer','time_limit_exceeded','compilation_error','runtime_error')),
  test_results    jsonb       NOT NULL DEFAULT '[]',
  time_ms         numeric,
  memory_kb       numeric,
  credits_awarded int         NOT NULL DEFAULT 0,
  submission_date date        NOT NULL DEFAULT CURRENT_DATE,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coding_submissions_user    ON coding_submissions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coding_submissions_problem ON coding_submissions(problem_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_coding_sub_daily_credit
  ON coding_submissions(user_id, problem_id, submission_date)
  WHERE verdict = 'accepted' AND credits_awarded > 0;

ALTER TABLE coding_submissions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='coding_submissions' AND policyname='Users view own submissions') THEN
    CREATE POLICY "Users view own submissions" ON coding_submissions FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
END $$;

-- ── increment_credits RPC ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_credits(p_user_id uuid, p_amount int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles SET credits = COALESCE(credits, 0) + p_amount WHERE id = p_user_id;
END;
$$;

-- ── daily_activity ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_activity (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_date date        NOT NULL DEFAULT CURRENT_DATE,
  activity_type text        NOT NULL CHECK (activity_type IN ('lesson','quiz','assignment','coding','login')),
  value         int         NOT NULL DEFAULT 1,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, activity_date, activity_type)
);

CREATE INDEX IF NOT EXISTS idx_daily_activity_user ON daily_activity(user_id, activity_date DESC);

ALTER TABLE daily_activity ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='daily_activity' AND policyname='Users manage own activity') THEN
    CREATE POLICY "Users manage own activity" ON daily_activity FOR ALL TO authenticated
      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- ── streak functions ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION recalculate_streak(p_user_id uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_streak   int := 0;
  v_check    date := CURRENT_DATE;
  v_has_day  bool;
BEGIN
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM daily_activity
      WHERE user_id = p_user_id AND activity_date = v_check
    ) INTO v_has_day;
    EXIT WHEN NOT v_has_day;
    v_streak := v_streak + 1;
    v_check  := v_check - 1;
  END LOOP;
  UPDATE profiles SET streak_days = v_streak, last_activity_date = CURRENT_DATE WHERE id = p_user_id;
  RETURN v_streak;
END;
$$;

CREATE OR REPLACE FUNCTION log_activity(p_user_id uuid, p_type text, p_value int DEFAULT 1)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO daily_activity(user_id, activity_date, activity_type, value)
  VALUES (p_user_id, CURRENT_DATE, p_type, p_value)
  ON CONFLICT (user_id, activity_date, activity_type)
  DO UPDATE SET value = daily_activity.value + EXCLUDED.value;
  RETURN recalculate_streak(p_user_id);
END;
$$;
