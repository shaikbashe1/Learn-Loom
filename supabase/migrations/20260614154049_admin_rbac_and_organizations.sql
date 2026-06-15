-- ============================================================
-- LearnLoom Migration — Admin RBAC & Organizations
-- ============================================================

-- 1. Update user_role enum
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'org_admin';

-- 2. Organizations Table
CREATE TABLE public.organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    website TEXT,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. User Organizations Linking Table
CREATE TABLE public.user_organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin', 'owner')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- 4. RLS Policies
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizations are viewable by everyone" ON public.organizations
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create an organization" ON public.organizations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Organizations can be updated by owners or admins" ON public.organizations
  FOR UPDATE USING (
    auth.uid()::text IN (
      SELECT user_id FROM public.user_organizations 
      WHERE organization_id = id AND role IN ('admin', 'owner')
    ) OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id::text = auth.uid()::text AND role::text IN ('super_admin', 'admin'))
  );

CREATE POLICY "User organizations viewable by everyone" ON public.user_organizations
  FOR SELECT USING (true);

CREATE POLICY "User organizations insertable by admins" ON public.user_organizations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id::text = auth.uid()::text AND role::text IN ('super_admin', 'admin'))
    OR auth.uid()::text IN (SELECT user_id FROM public.user_organizations WHERE organization_id = user_organizations.organization_id AND role IN ('admin', 'owner'))
  );

-- 5. RPC for Dashboard Metrics
CREATE OR REPLACE FUNCTION admin_get_dashboard_metrics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_users INT;
  v_active_users INT;
  v_total_courses INT;
  v_course_completions INT;
  v_compiler_executions INT;
BEGIN
  -- basic check for admin/super_admin
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id::text = auth.uid()::text AND role::text IN ('admin', 'super_admin')) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT count(*) INTO v_total_users FROM public.profiles;
  SELECT count(*) INTO v_active_users FROM public.profiles WHERE updated_at > now() - interval '30 days';
  SELECT count(*) INTO v_total_courses FROM public.courses;
  SELECT count(*) INTO v_course_completions FROM public.user_course_progress WHERE completed_at IS NOT NULL;
  SELECT count(*) INTO v_compiler_executions FROM public.coding_submissions;

  RETURN json_build_object(
    'total_users', v_total_users,
    'active_users', v_active_users,
    'total_courses', v_total_courses,
    'course_completions', v_course_completions,
    'compiler_executions', v_compiler_executions
  );
END;
$$;
