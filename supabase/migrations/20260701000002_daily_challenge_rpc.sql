CREATE OR REPLACE FUNCTION get_today_daily_challenge()
RETURNS daily_challenges
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today DATE := current_date;
  challenge_record daily_challenges;
  v_easy text;
  v_medium text;
  v_hard text;
BEGIN
  -- Check if today's challenge already exists
  SELECT * INTO challenge_record FROM daily_challenges WHERE challenge_date = today;
  
  IF NOT FOUND THEN
    -- Pick a random Beginner problem
    SELECT id INTO v_easy FROM coding_problems WHERE difficulty = 'Beginner' ORDER BY random() LIMIT 1;
    -- Pick a random Intermediate problem
    SELECT id INTO v_medium FROM coding_problems WHERE difficulty = 'Intermediate' ORDER BY random() LIMIT 1;
    -- Pick a random Advanced problem
    SELECT id INTO v_hard FROM coding_problems WHERE difficulty = 'Advanced' ORDER BY random() LIMIT 1;
    
    -- Insert it and return the new row
    INSERT INTO daily_challenges (challenge_date, easy_problem_id, medium_problem_id, hard_problem_id)
    VALUES (today, v_easy, v_medium, v_hard)
    RETURNING * INTO challenge_record;
  END IF;
  
  RETURN challenge_record;
END;
$$;
