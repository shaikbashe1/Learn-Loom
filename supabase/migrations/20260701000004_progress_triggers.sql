-- Create function to update coding progress and award badges
CREATE OR REPLACE FUNCTION update_coding_progress_on_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_difficulty text;
  v_credits int;
  v_solved_count int;
  v_badge_id uuid;
BEGIN
  -- Only care about 'Accepted' verdicts
  IF NEW.verdict = 'accepted' THEN
    -- Check if this is the user's first time solving this specific problem
    IF NOT EXISTS (
      SELECT 1 FROM submissions 
      WHERE user_id = NEW.user_id 
        AND problem_id = NEW.problem_id 
        AND verdict = 'accepted' 
        AND id != NEW.id
    ) THEN
      
      -- Get problem details
      SELECT difficulty, credits INTO v_difficulty, v_credits 
      FROM coding_problems WHERE id = NEW.problem_id;

      -- Update or insert coding_progress
      INSERT INTO coding_progress (user_id, problems_solved, easy_solved, medium_solved, hard_solved, total_xp)
      VALUES (
        NEW.user_id, 
        1, 
        CASE WHEN v_difficulty = 'Beginner' THEN 1 ELSE 0 END,
        CASE WHEN v_difficulty = 'Intermediate' THEN 1 ELSE 0 END,
        CASE WHEN v_difficulty = 'Advanced' THEN 1 ELSE 0 END,
        v_credits
      )
      ON CONFLICT (user_id) DO UPDATE SET
        problems_solved = coding_progress.problems_solved + 1,
        easy_solved = coding_progress.easy_solved + CASE WHEN v_difficulty = 'Beginner' THEN 1 ELSE 0 END,
        medium_solved = coding_progress.medium_solved + CASE WHEN v_difficulty = 'Intermediate' THEN 1 ELSE 0 END,
        hard_solved = coding_progress.hard_solved + CASE WHEN v_difficulty = 'Advanced' THEN 1 ELSE 0 END,
        total_xp = coding_progress.total_xp + v_credits,
        updated_at = now();

      -- Get the new solved count to check for badges
      SELECT problems_solved INTO v_solved_count FROM coding_progress WHERE user_id = NEW.user_id;

      -- Check Milestone: 1 Problem
      IF v_solved_count = 1 THEN
        SELECT id INTO v_badge_id FROM badges WHERE criteria_type = 'solved_count' AND criteria_value = 1 LIMIT 1;
        IF v_badge_id IS NOT NULL THEN
          INSERT INTO user_badges (user_id, badge_id) VALUES (NEW.user_id, v_badge_id) ON CONFLICT DO NOTHING;
        END IF;
      END IF;

      -- Check Milestone: 10 Problems
      IF v_solved_count = 10 THEN
        SELECT id INTO v_badge_id FROM badges WHERE criteria_type = 'solved_count' AND criteria_value = 10 LIMIT 1;
        IF v_badge_id IS NOT NULL THEN
          INSERT INTO user_badges (user_id, badge_id) VALUES (NEW.user_id, v_badge_id) ON CONFLICT DO NOTHING;
        END IF;
      END IF;
      
      -- Check Milestone: 50 Problems
      IF v_solved_count = 50 THEN
        SELECT id INTO v_badge_id FROM badges WHERE criteria_type = 'solved_count' AND criteria_value = 50 LIMIT 1;
        IF v_badge_id IS NOT NULL THEN
          INSERT INTO user_badges (user_id, badge_id) VALUES (NEW.user_id, v_badge_id) ON CONFLICT DO NOTHING;
        END IF;
      END IF;

      -- Check Milestone: 100 Problems
      IF v_solved_count = 100 THEN
        SELECT id INTO v_badge_id FROM badges WHERE criteria_type = 'solved_count' AND criteria_value = 100 LIMIT 1;
        IF v_badge_id IS NOT NULL THEN
          INSERT INTO user_badges (user_id, badge_id) VALUES (NEW.user_id, v_badge_id) ON CONFLICT DO NOTHING;
        END IF;
      END IF;

    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_submission_accepted ON submissions;

-- Create trigger
CREATE TRIGGER on_submission_accepted
AFTER INSERT ON submissions
FOR EACH ROW
EXECUTE FUNCTION update_coding_progress_on_submission();
