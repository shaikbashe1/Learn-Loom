
-- ============================================================
-- 1. STORAGE BUCKET for assignment submissions
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'submissions',
  'submissions',
  false,
  52428800,
  ARRAY['application/pdf','application/zip','application/x-ipynb+json',
        'text/plain','application/octet-stream']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800;

-- Storage RLS policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='Users upload own submissions') THEN
    CREATE POLICY "Users upload own submissions"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'submissions' AND (storage.foldername(name))[1] = 'assignments' AND (storage.foldername(name))[2] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='Users read own submissions storage') THEN
    CREATE POLICY "Users read own submissions storage"
      ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = 'submissions' AND (storage.foldername(name))[2] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='Admins read all submissions storage') THEN
    CREATE POLICY "Admins read all submissions storage"
      ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = 'submissions' AND is_admin(auth.uid()));
  END IF;
END $$;

-- ============================================================
-- 2. Prevent role escalation trigger
-- ============================================================
CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role AND NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins may change roles';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON profiles;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_role_escalation();

-- ============================================================
-- 3. Harden existing RLS policies
-- ============================================================
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users delete own posts" ON forum_posts;
CREATE POLICY "Users delete own posts" ON forum_posts
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users read own submissions" ON assignment_submissions;
CREATE POLICY "Users read own submissions" ON assignment_submissions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins update submissions" ON assignment_submissions;
CREATE POLICY "Admins update submissions" ON assignment_submissions
  FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users read own attempts" ON quiz_attempts;
CREATE POLICY "Users read own attempts" ON quiz_attempts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users read own certs" ON certificates;
CREATE POLICY "Users read own certs" ON certificates
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- ============================================================
-- 4. Input-length constraints
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_forum_title_len') THEN
    ALTER TABLE forum_posts ADD CONSTRAINT chk_forum_title_len CHECK (char_length(title) <= 300);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_forum_content_len') THEN
    ALTER TABLE forum_posts ADD CONSTRAINT chk_forum_content_len CHECK (char_length(content) <= 10000);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_answer_len') THEN
    ALTER TABLE assignment_submissions ADD CONSTRAINT chk_answer_len CHECK (char_length(answer_text) <= 50000);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_full_name_len') THEN
    ALTER TABLE profiles ADD CONSTRAINT chk_full_name_len CHECK (char_length(coalesce(full_name,'')) <= 150);
  END IF;
END $$;

-- ============================================================
-- 5. Audit log table
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id         bigserial   PRIMARY KEY,
  actor_id   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  action     text        NOT NULL CHECK (char_length(action) <= 100),
  table_name text,
  record_id  text,
  diff       jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='audit_logs' AND policyname='Admins read audit logs') THEN
    CREATE POLICY "Admins read audit logs" ON audit_logs
      FOR SELECT TO authenticated
      USING (is_admin(auth.uid()));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_time  ON audit_logs(created_at DESC);
