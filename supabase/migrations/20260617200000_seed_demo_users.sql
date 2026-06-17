-- Create Demo Users (Student and Admin)
-- We set email_confirmed_at to now() so that they can log in without needing to verify their email.

DO $$
DECLARE
  student_id uuid := gen_random_uuid();
  admin_id uuid := gen_random_uuid();
BEGIN
  -- Insert Demo Student
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    student_id, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'student@demo.com', extensions.crypt('demo123', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Demo Student"}', now(), now(), '', '', '', ''
  );

  -- Insert Demo Admin
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    admin_id, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'admin@demo.com', extensions.crypt('admin123', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Demo Admin"}', now(), now(), '', '', '', ''
  );

  -- Update Demo Admin's profile role to 'admin' (The trigger handle_new_user already created the profile)
  DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
  UPDATE public.profiles SET role = 'admin' WHERE id::text = admin_id::text;
  CREATE TRIGGER trg_prevent_role_escalation BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION prevent_role_escalation();

END $$;
