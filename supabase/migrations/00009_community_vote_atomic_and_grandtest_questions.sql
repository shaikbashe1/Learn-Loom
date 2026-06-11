
-- ============================================================
-- 1. Atomic vote toggle function (prevents upvote race conditions)
-- ============================================================
CREATE OR REPLACE FUNCTION toggle_forum_vote(p_post_id uuid, p_user_id uuid)
RETURNS TABLE(new_upvotes int, user_voted bool)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_existing int;
  v_new_count int;
BEGIN
  -- Check if vote exists
  SELECT COUNT(*)::int INTO v_existing
  FROM forum_votes
  WHERE post_id = p_post_id AND user_id = p_user_id;

  IF v_existing > 0 THEN
    -- Remove vote
    DELETE FROM forum_votes WHERE post_id = p_post_id AND user_id = p_user_id;
    UPDATE forum_posts SET upvotes = GREATEST(0, upvotes - 1) WHERE id = p_post_id
    RETURNING upvotes INTO v_new_count;
    RETURN QUERY SELECT v_new_count, false;
  ELSE
    -- Add vote
    INSERT INTO forum_votes(post_id, user_id, vote_type) VALUES (p_post_id, p_user_id, 1)
    ON CONFLICT (post_id, user_id) DO NOTHING;
    UPDATE forum_posts SET upvotes = upvotes + 1 WHERE id = p_post_id
    RETURNING upvotes INTO v_new_count;
    RETURN QUERY SELECT v_new_count, true;
  END IF;
END;
$$;

-- ============================================================
-- 2. Grand test questions table (persistent, per-course)
-- ============================================================
CREATE TABLE IF NOT EXISTS grand_test_questions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id    uuid        REFERENCES courses(id) ON DELETE CASCADE,
  question     text        NOT NULL CHECK (char_length(question) <= 500),
  options      jsonb       NOT NULL,   -- ["opt1","opt2","opt3","opt4"]
  correct_idx  int         NOT NULL CHECK (correct_idx BETWEEN 0 AND 3),
  explanation  text,
  sort_order   int         NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE grand_test_questions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='grand_test_questions' AND policyname='Anyone read grand test questions') THEN
    CREATE POLICY "Anyone read grand test questions" ON grand_test_questions
      FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='grand_test_questions' AND policyname='Admins manage grand test questions') THEN
    CREATE POLICY "Admins manage grand test questions" ON grand_test_questions
      FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_gtq_course ON grand_test_questions(course_id, sort_order);

-- ============================================================
-- 3. Grand test attempts table
-- ============================================================
CREATE TABLE IF NOT EXISTS grand_test_attempts (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id     uuid        REFERENCES courses(id) ON DELETE SET NULL,
  score         int         NOT NULL DEFAULT 0,
  total         int         NOT NULL DEFAULT 0,
  passed        boolean     NOT NULL DEFAULT false,
  tab_switches  int         NOT NULL DEFAULT 0,
  answers       jsonb,      -- [{question_id, selected_idx, correct: bool}]
  submitted_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE grand_test_attempts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='grand_test_attempts' AND policyname='Users manage own grand test attempts') THEN
    CREATE POLICY "Users manage own grand test attempts" ON grand_test_attempts
      FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='grand_test_attempts' AND policyname='Admins read all grand test attempts') THEN
    CREATE POLICY "Admins read all grand test attempts" ON grand_test_attempts
      FOR SELECT TO authenticated USING (is_admin(auth.uid()));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_gta_user ON grand_test_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_gta_course ON grand_test_attempts(course_id);

-- ============================================================
-- 4. Seed general grand test questions (course_id = NULL → global)
-- ============================================================
INSERT INTO grand_test_questions (question, options, correct_idx, explanation, sort_order) VALUES
('What is the time complexity of QuickSort in the average case?',
 '["O(n)","O(n log n)","O(n²)","O(log n)"]', 1,
 'QuickSort achieves O(n log n) average by partitioning around a pivot.', 1),
('Which data structure is used in BFS traversal?',
 '["Stack","Queue","Tree","Heap"]', 1,
 'BFS uses a queue (FIFO) to visit nodes level by level.', 2),
('What does ACID stand for in database transactions?',
 '["Atomicity, Consistency, Isolation, Durability","Access, Control, Integrity, Data","Automatic, Consistent, Internal, Direct","None of the above"]', 0,
 'ACID guarantees reliable transaction processing.', 3),
('In React, which hook is used to manage side effects?',
 '["useState","useEffect","useCallback","useMemo"]', 1,
 'useEffect runs after render and handles data fetching, subscriptions, etc.', 4),
('What is the output of `typeof null` in JavaScript?',
 '["\"null\"","\"undefined\"","\"object\"","\"boolean\""]', 2,
 'A historical bug in JS: typeof null returns "object".', 5),
('Which HTTP method is idempotent and safe?',
 '["POST","PUT","GET","PATCH"]', 2,
 'GET is both safe (no side effects) and idempotent.', 6),
('What is the purpose of a foreign key constraint in SQL?',
 '["Speed up queries","Enforce referential integrity","Encrypt data","Partition tables"]', 1,
 'Foreign keys ensure referential integrity between related tables.', 7),
('What does REST stand for?',
 '["Representational State Transfer","Remote Entity Service Transfer","Reliable Event Streaming Transport","Resource Endpoint System Transfer"]', 0,
 'REST is an architectural style for distributed hypermedia systems.', 8),
('Which sorting algorithm has O(n) best-case time complexity?',
 '["Merge Sort","Heap Sort","Insertion Sort","Quick Sort"]', 2,
 'Insertion Sort is O(n) when the array is already sorted.', 9),
('What is the difference between `==` and `===` in JavaScript?',
 '["No difference","=== checks type and value, == only checks value","== checks type and value, === only checks value","=== is for objects only"]', 1,
 '=== is strict equality (no type coercion), == performs type coercion.', 10)
ON CONFLICT DO NOTHING;
