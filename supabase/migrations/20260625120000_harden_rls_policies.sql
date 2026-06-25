-- Migration: Harden RLS Policies
-- Description: Secures public.certificates insertions and allows admins to view all student assessment attempts.

-- 1. Secure certificates table insertions
DROP POLICY IF EXISTS "certs_insert_service" ON public.certificates;

CREATE POLICY "certs_insert_own" ON public.certificates
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "admins_insert_all" ON public.certificates
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin'::public.user_role);

-- 2. Allow admins to view all assessment attempts (students can already see their own)
DROP POLICY IF EXISTS "admins_view_attempts" ON public.assessment_attempts;
CREATE POLICY "admins_view_attempts" ON public.assessment_attempts
  FOR SELECT TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin'::public.user_role);
