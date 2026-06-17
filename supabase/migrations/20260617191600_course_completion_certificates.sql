-- Migration: Auto award certificates upon course completion

CREATE OR REPLACE FUNCTION auto_award_course_completion_certificate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- If course transitions to completed, award a certificate with a default 100% score
  IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
    INSERT INTO certificates (user_id, course_id, score, verification_code)
    VALUES (NEW.user_id, NEW.course_id, 100, '')
    ON CONFLICT (user_id, course_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_course_completion_certificate
AFTER UPDATE ON user_course_enrollments
FOR EACH ROW EXECUTE FUNCTION auto_award_course_completion_certificate();
