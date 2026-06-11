
ALTER TABLE course_modules
  ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS topics text[] NOT NULL DEFAULT '{}';
