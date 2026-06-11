
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Programming',
  ADD COLUMN IF NOT EXISTS instructor text NOT NULL DEFAULT 'LearnLoom Instructor',
  ADD COLUMN IF NOT EXISTS rating numeric(2,1) NOT NULL DEFAULT 4.5,
  ADD COLUMN IF NOT EXISTS student_count integer NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS duration_weeks integer NOT NULL DEFAULT 8;
