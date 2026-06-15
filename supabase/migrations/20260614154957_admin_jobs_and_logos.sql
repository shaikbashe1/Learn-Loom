-- ============================================================
-- LearnLoom Migration — Jobs & Logo Storage
-- ============================================================

-- 1. Jobs Table
CREATE TABLE public.jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    company_name TEXT NOT NULL,
    location TEXT,
    salary_range TEXT,
    job_type TEXT DEFAULT 'full-time',
    description TEXT,
    requirements TEXT,
    application_url TEXT,
    deadline TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Job Applications Table
CREATE TABLE public.job_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
    resume_url TEXT,
    cover_letter TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'rejected', 'accepted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. RLS for Jobs
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published jobs viewable by everyone" ON public.jobs
  FOR SELECT USING (status = 'published' OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id::text = auth.uid()::text AND role::text IN ('super_admin', 'admin')) OR
    auth.uid()::text IN (SELECT user_id FROM public.user_organizations WHERE organization_id = jobs.organization_id AND role IN ('admin', 'owner'))
  );

CREATE POLICY "Jobs can be managed by org owners or admins" ON public.jobs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id::text = auth.uid()::text AND role::text IN ('super_admin', 'admin')) OR
    auth.uid()::text IN (SELECT user_id FROM public.user_organizations WHERE organization_id = jobs.organization_id AND role IN ('admin', 'owner'))
  );

CREATE POLICY "Users can view their own applications" ON public.job_applications
  FOR SELECT USING (
    user_id = auth.uid()::text OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id::text = auth.uid()::text AND role::text IN ('super_admin', 'admin')) OR
    auth.uid()::text IN (
      SELECT user_id FROM public.user_organizations 
      WHERE organization_id = (SELECT organization_id FROM public.jobs WHERE id = job_applications.job_id) 
      AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Users can insert their own applications" ON public.job_applications
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Admins can update application status" ON public.job_applications
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id::text = auth.uid()::text AND role::text IN ('super_admin', 'admin')) OR
    auth.uid()::text IN (
      SELECT user_id FROM public.user_organizations 
      WHERE organization_id = (SELECT organization_id FROM public.jobs WHERE id = job_applications.job_id) 
      AND role IN ('admin', 'owner')
    )
  );

-- 4. Storage Bucket for Logos
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access for logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'logos');

CREATE POLICY "Admins and Org owners can upload logos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'logos' AND (
      EXISTS (SELECT 1 FROM public.profiles WHERE id::text = auth.uid()::text AND role::text IN ('super_admin', 'admin'))
      OR EXISTS (SELECT 1 FROM public.user_organizations WHERE user_id = auth.uid()::text AND role IN ('admin', 'owner'))
    )
  );

CREATE POLICY "Admins and Org owners can update logos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'logos' AND (
      EXISTS (SELECT 1 FROM public.profiles WHERE id::text = auth.uid()::text AND role::text IN ('super_admin', 'admin'))
      OR EXISTS (SELECT 1 FROM public.user_organizations WHERE user_id = auth.uid()::text AND role IN ('admin', 'owner'))
    )
  );

CREATE POLICY "Admins and Org owners can delete logos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'logos' AND (
      EXISTS (SELECT 1 FROM public.profiles WHERE id::text = auth.uid()::text AND role::text IN ('super_admin', 'admin'))
      OR EXISTS (SELECT 1 FROM public.user_organizations WHERE user_id = auth.uid()::text AND role IN ('admin', 'owner'))
    )
  );