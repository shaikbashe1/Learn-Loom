-- ── 1. coding_problems schema expansion ─────────────────────────────────────
ALTER TABLE coding_problems
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS time_limit_ms int DEFAULT 2000,
ADD COLUMN IF NOT EXISTS memory_limit_kb int DEFAULT 256000,
ADD COLUMN IF NOT EXISTS expected_time_complexity text,
ADD COLUMN IF NOT EXISTS expected_space_complexity text,
ADD COLUMN IF NOT EXISTS estimated_solve_time_min int,
ADD COLUMN IF NOT EXISTS hints jsonb DEFAULT '[]';

-- Add indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_coding_problems_difficulty ON coding_problems(difficulty);
CREATE INDEX IF NOT EXISTS idx_coding_problems_category ON coding_problems(category);
CREATE INDEX IF NOT EXISTS idx_coding_problems_credits ON coding_problems(credits);
CREATE INDEX IF NOT EXISTS idx_coding_problems_tags ON coding_problems USING GIN (tags);

-- ── 2. Add automated badge unlock functions ───────────────────────────────
CREATE OR REPLACE FUNCTION check_and_award_solve_badges()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_solved_count int;
  v_badge_id uuid;
BEGIN
  -- Only care about newly accepted submissions or updates to accepted
  IF NEW.verdict = 'accepted' AND (TG_OP = 'INSERT' OR OLD.verdict != 'accepted') THEN
    
    -- Count distinct problems solved by this user
    SELECT COUNT(DISTINCT problem_id) INTO v_solved_count
    FROM submissions
    WHERE user_id = NEW.user_id AND verdict = 'accepted';

    -- First Solve
    IF v_solved_count >= 1 THEN
      SELECT id INTO v_badge_id FROM badges WHERE name = 'First Solve' LIMIT 1;
      IF v_badge_id IS NOT NULL THEN
        INSERT INTO user_badges(user_id, badge_id) VALUES (NEW.user_id, v_badge_id) ON CONFLICT DO NOTHING;
      END IF;
    END IF;

    -- 10 Solves
    IF v_solved_count >= 10 THEN
      SELECT id INTO v_badge_id FROM badges WHERE name = '10 Solves' LIMIT 1;
      IF v_badge_id IS NOT NULL THEN
        INSERT INTO user_badges(user_id, badge_id) VALUES (NEW.user_id, v_badge_id) ON CONFLICT DO NOTHING;
      END IF;
    END IF;

    -- 25 Solves
    IF v_solved_count >= 25 THEN
      SELECT id INTO v_badge_id FROM badges WHERE name = '25 Solves' LIMIT 1;
      IF v_badge_id IS NOT NULL THEN
        INSERT INTO user_badges(user_id, badge_id) VALUES (NEW.user_id, v_badge_id) ON CONFLICT DO NOTHING;
      END IF;
    END IF;

    -- 50 Solves
    IF v_solved_count >= 50 THEN
      SELECT id INTO v_badge_id FROM badges WHERE name = '50 Solves' LIMIT 1;
      IF v_badge_id IS NOT NULL THEN
        INSERT INTO user_badges(user_id, badge_id) VALUES (NEW.user_id, v_badge_id) ON CONFLICT DO NOTHING;
      END IF;
    END IF;

    -- 100 Solves
    IF v_solved_count >= 100 THEN
      SELECT id INTO v_badge_id FROM badges WHERE name = '100 Solves' LIMIT 1;
      IF v_badge_id IS NOT NULL THEN
        INSERT INTO user_badges(user_id, badge_id) VALUES (NEW.user_id, v_badge_id) ON CONFLICT DO NOTHING;
      END IF;
    END IF;
    
    -- 200 Solves
    IF v_solved_count >= 200 THEN
      SELECT id INTO v_badge_id FROM badges WHERE name = '200 Solves' LIMIT 1;
      IF v_badge_id IS NOT NULL THEN
        INSERT INTO user_badges(user_id, badge_id) VALUES (NEW.user_id, v_badge_id) ON CONFLICT DO NOTHING;
      END IF;
    END IF;

    -- 300 Solves
    IF v_solved_count >= 300 THEN
      SELECT id INTO v_badge_id FROM badges WHERE name = '300 Solves' LIMIT 1;
      IF v_badge_id IS NOT NULL THEN
        INSERT INTO user_badges(user_id, badge_id) VALUES (NEW.user_id, v_badge_id) ON CONFLICT DO NOTHING;
      END IF;
    END IF;

  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_solve_badges ON submissions;
CREATE TRIGGER trg_check_solve_badges
AFTER INSERT OR UPDATE ON submissions
FOR EACH ROW
EXECUTE FUNCTION check_and_award_solve_badges();

-- ── 3. Seed Base Badges ───────────────────────────────────────────────────
INSERT INTO badges (name, description, icon_url, criteria_type, criteria_value)
VALUES
  ('First Solve', 'Solve your first problem', 'flag', 'solve_count', 1),
  ('10 Solves', 'Solve 10 problems', 'looks_one', 'solve_count', 10),
  ('25 Solves', 'Solve 25 problems', 'looks_two', 'solve_count', 25),
  ('50 Solves', 'Solve 50 problems', 'looks_5', 'solve_count', 50),
  ('100 Solves', 'Solve 100 problems', '100', 'solve_count', 100),
  ('200 Solves', 'Solve 200 problems', 'workspace_premium', 'solve_count', 200),
  ('300 Solves', 'Solve 300 problems', 'military_tech', 'solve_count', 300)
ON CONFLICT DO NOTHING;
