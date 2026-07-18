-- ── 1. coding_progress Schema Expansion ───────────────────────────
ALTER TABLE coding_progress ADD COLUMN IF NOT EXISTS topic_progress jsonb NOT NULL DEFAULT '{}';

-- ── 2. coding_statistics ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coding_statistics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_submissions int NOT NULL DEFAULT 0,
  accepted_submissions int NOT NULL DEFAULT 0,
  acceptance_rate numeric NOT NULL DEFAULT 0,
  favorite_language text,
  total_coding_time_ms bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE coding_statistics ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='coding_statistics' AND policyname='Anyone reads coding_statistics') THEN
    CREATE POLICY "Anyone reads coding_statistics" ON coding_statistics FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='coding_statistics' AND policyname='Users manage own coding_statistics') THEN
    CREATE POLICY "Users manage own coding_statistics" ON coding_statistics FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- ── 3. coding_streaks ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coding_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak int NOT NULL DEFAULT 0,
  max_streak int NOT NULL DEFAULT 0,
  solved_today int NOT NULL DEFAULT 0,
  last_solved_date date,
  activity_heatmap jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE coding_streaks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='coding_streaks' AND policyname='Anyone reads coding_streaks') THEN
    CREATE POLICY "Anyone reads coding_streaks" ON coding_streaks FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='coding_streaks' AND policyname='Users manage own coding_streaks') THEN
    CREATE POLICY "Users manage own coding_streaks" ON coding_streaks FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- ── 4. coding_badges & coding_user_badges ─────────────────────────
CREATE TABLE IF NOT EXISTS coding_badges (
  slug text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  icon_name text NOT NULL,
  criteria_type text NOT NULL,
  criteria_threshold int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE coding_badges ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='coding_badges' AND policyname='Anyone reads coding_badges') THEN
    CREATE POLICY "Anyone reads coding_badges" ON coding_badges FOR SELECT USING (true);
  END IF;
END $$;

-- Insert default badges
INSERT INTO coding_badges (slug, name, description, icon_name, criteria_type, criteria_threshold) VALUES
('first-problem', 'First Steps', 'Solved your first problem', 'Target', 'problems_solved', 1),
('10-problems', 'Getting Warmed Up', 'Solved 10 problems', 'Flame', 'problems_solved', 10),
('50-problems', 'Algorithm Enthusiast', 'Solved 50 problems', 'Star', 'problems_solved', 50),
('100-problems', 'Code Master', 'Solved 100 problems', 'Trophy', 'problems_solved', 100),
('7-day-streak', 'Consistent Coder', 'Maintained a 7-day streak', 'Zap', 'streak', 7)
ON CONFLICT (slug) DO NOTHING;


CREATE TABLE IF NOT EXISTS coding_user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_slug text NOT NULL REFERENCES coding_badges(slug) ON DELETE CASCADE,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_slug)
);

ALTER TABLE coding_user_badges ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='coding_user_badges' AND policyname='Anyone reads coding_user_badges') THEN
    CREATE POLICY "Anyone reads coding_user_badges" ON coding_user_badges FOR SELECT USING (true);
  END IF;
END $$;


-- ── 5. Trigger for comprehensive tracking ─────────────────────────
-- We override the previous trigger from 20260701000004 to handle everything
CREATE OR REPLACE FUNCTION update_coding_tracking_on_submission()
RETURNS trigger
SECURITY DEFINER
AS $$
DECLARE
  v_difficulty text;
  v_topic text;
  v_credits int;
  v_solved_count int;
  
  v_stat_total int;
  v_stat_acc int;
  v_today date := CURRENT_DATE;
  v_last_solved date;
  v_curr_streak int;
  v_max_streak int;
  v_badge_slug text;
BEGIN
  -- We ONLY care about 'coding_submissions' table, not 'submissions' or 'user_submissions'
  
  -- Step 1: Update coding_statistics
  INSERT INTO coding_statistics (user_id, total_submissions, accepted_submissions, favorite_language, total_coding_time_ms)
  VALUES (NEW.user_id, 1, CASE WHEN NEW.verdict = 'Accepted' THEN 1 ELSE 0 END, NEW.language, COALESCE(NEW.time_ms, 0))
  ON CONFLICT (user_id) DO UPDATE SET
    total_submissions = coding_statistics.total_submissions + 1,
    accepted_submissions = coding_statistics.accepted_submissions + CASE WHEN NEW.verdict = 'Accepted' THEN 1 ELSE 0 END,
    total_coding_time_ms = coding_statistics.total_coding_time_ms + COALESCE(NEW.time_ms, 0),
    updated_at = now();
    
  -- Calculate and update accuracy rate
  SELECT total_submissions, accepted_submissions INTO v_stat_total, v_stat_acc FROM coding_statistics WHERE user_id = NEW.user_id;
  IF v_stat_total > 0 THEN
    UPDATE coding_statistics SET acceptance_rate = (v_stat_acc::numeric / v_stat_total::numeric) * 100 WHERE user_id = NEW.user_id;
  END IF;

  -- Only proceed with progress, streaks, badges IF Accepted
  IF NEW.verdict = 'Accepted' THEN
    -- Fetch problem info
    SELECT difficulty, topic, credits INTO v_difficulty, v_topic, v_credits
    FROM coding_problems WHERE id = NEW.problem_id;

    IF v_difficulty IS NOT NULL THEN
      -- Step 2: Update coding_progress
      INSERT INTO coding_progress (user_id, problems_solved, easy_solved, medium_solved, hard_solved, total_xp, topic_progress)
      VALUES (
        NEW.user_id, 1,
        CASE WHEN v_difficulty = 'Easy' THEN 1 ELSE 0 END,
        CASE WHEN v_difficulty = 'Medium' THEN 1 ELSE 0 END,
        CASE WHEN v_difficulty = 'Hard' THEN 1 ELSE 0 END,
        v_credits,
        jsonb_build_object(v_topic, 1)
      )
      ON CONFLICT (user_id) DO UPDATE SET
        problems_solved = coding_progress.problems_solved + 1,
        easy_solved = coding_progress.easy_solved + CASE WHEN v_difficulty = 'Easy' THEN 1 ELSE 0 END,
        medium_solved = coding_progress.medium_solved + CASE WHEN v_difficulty = 'Medium' THEN 1 ELSE 0 END,
        hard_solved = coding_progress.hard_solved + CASE WHEN v_difficulty = 'Hard' THEN 1 ELSE 0 END,
        total_xp = coding_progress.total_xp + v_credits,
        topic_progress = jsonb_set(
            coding_progress.topic_progress,
            ARRAY[v_topic],
            to_jsonb(COALESCE((coding_progress.topic_progress->>v_topic)::int, 0) + 1),
            true
        ),
        updated_at = now();
        
      -- Update streak
      INSERT INTO coding_streaks (user_id, current_streak, max_streak, solved_today, last_solved_date)
      VALUES (NEW.user_id, 1, 1, 1, v_today)
      ON CONFLICT (user_id) DO UPDATE SET
        solved_today = CASE WHEN coding_streaks.last_solved_date = v_today THEN coding_streaks.solved_today + 1 ELSE 1 END,
        current_streak = CASE 
                            WHEN coding_streaks.last_solved_date = v_today THEN coding_streaks.current_streak
                            WHEN coding_streaks.last_solved_date = v_today - 1 THEN coding_streaks.current_streak + 1
                            ELSE 1 
                         END,
        max_streak = GREATEST(coding_streaks.max_streak, CASE 
                                                            WHEN coding_streaks.last_solved_date = v_today THEN coding_streaks.current_streak
                                                            WHEN coding_streaks.last_solved_date = v_today - 1 THEN coding_streaks.current_streak + 1
                                                            ELSE 1 
                                                         END),
        last_solved_date = v_today,
        updated_at = now()
      RETURNING current_streak INTO v_curr_streak;
      
      -- Badge logic
      SELECT problems_solved INTO v_solved_count FROM coding_progress WHERE user_id = NEW.user_id;
      
      -- Problem Badges
      IF v_solved_count = 1 THEN v_badge_slug := 'first-problem'; END IF;
      IF v_solved_count = 10 THEN v_badge_slug := '10-problems'; END IF;
      IF v_solved_count = 50 THEN v_badge_slug := '50-problems'; END IF;
      IF v_solved_count = 100 THEN v_badge_slug := '100-problems'; END IF;
      
      IF v_badge_slug IS NOT NULL THEN
        INSERT INTO coding_user_badges (user_id, badge_slug) VALUES (NEW.user_id, v_badge_slug) ON CONFLICT DO NOTHING;
      END IF;
      
      -- Streak Badges
      IF v_curr_streak >= 7 THEN
        INSERT INTO coding_user_badges (user_id, badge_slug) VALUES (NEW.user_id, '7-day-streak') ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to coding_submissions
DROP TRIGGER IF EXISTS trigger_coding_submissions_tracking ON coding_submissions;
CREATE TRIGGER trigger_coding_submissions_tracking
AFTER INSERT ON coding_submissions
FOR EACH ROW
EXECUTE FUNCTION update_coding_tracking_on_submission();

-- Also ensure 'submissions' trigger from previous migrations (if any) is either replaced or co-exists gracefully
-- I'm keeping 'coding_submissions' as the source of truth for tracking
