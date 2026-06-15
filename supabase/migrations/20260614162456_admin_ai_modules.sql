-- ============================================================
-- LearnLoom Migration — Admin AI Modules
-- ============================================================

-- 1. Roadmap Templates
CREATE TABLE public.roadmap_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    domain TEXT NOT NULL,
    description TEXT,
    total_weeks INTEGER DEFAULT 4,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.roadmap_template_nodes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES public.roadmap_templates(id) ON DELETE CASCADE,
    week INTEGER NOT NULL,
    title TEXT NOT NULL,
    goal TEXT,
    tasks TEXT[] DEFAULT '{}',
    resources JSONB DEFAULT '[]', -- [{title, url, type}]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. AI Mentor Settings
CREATE TABLE public.ai_mentor_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    system_prompt TEXT NOT NULL DEFAULT 'You are a helpful AI mentor.',
    max_tokens INTEGER DEFAULT 1000,
    model_name TEXT DEFAULT 'gpt-4',
    temperature NUMERIC(3,2) DEFAULT 0.7,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default AI Mentor settings
INSERT INTO public.ai_mentor_settings (id) VALUES (gen_random_uuid());

-- 3. Resumes and Analysis
CREATE TABLE public.resumes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.resume_analysis (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    resume_id UUID NOT NULL REFERENCES public.resumes(id) ON DELETE CASCADE,
    score INTEGER NOT NULL DEFAULT 0,
    strengths TEXT[] DEFAULT '{}',
    weaknesses TEXT[] DEFAULT '{}',
    suggestions TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Storage Bucket for Resumes
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

-- 5. RLS Policies
ALTER TABLE public.roadmap_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_template_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_mentor_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Roadmap templates viewable by everyone" ON public.roadmap_templates FOR SELECT USING (true);
CREATE POLICY "Roadmap template nodes viewable by everyone" ON public.roadmap_template_nodes FOR SELECT USING (true);
CREATE POLICY "Admins manage roadmaps" ON public.roadmap_templates FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id::text = auth.uid()::text AND role::text IN ('super_admin', 'admin')));
CREATE POLICY "Admins manage roadmap nodes" ON public.roadmap_template_nodes FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id::text = auth.uid()::text AND role::text IN ('super_admin', 'admin')));

CREATE POLICY "Admins manage AI settings" ON public.ai_mentor_settings FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id::text = auth.uid()::text AND role::text = 'super_admin'));
CREATE POLICY "AI settings viewable by authenticated users" ON public.ai_mentor_settings FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users manage own resumes" ON public.resumes FOR ALL USING (user_id = auth.uid()::text);
CREATE POLICY "Admins read all resumes" ON public.resumes FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id::text = auth.uid()::text AND role::text IN ('super_admin', 'admin')));

CREATE POLICY "Users view own resume analysis" ON public.resume_analysis FOR SELECT USING (EXISTS (SELECT 1 FROM public.resumes r WHERE r.id = resume_id AND r.user_id = auth.uid()::text));
CREATE POLICY "Admins read all resume analysis" ON public.resume_analysis FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id::text = auth.uid()::text AND role::text IN ('super_admin', 'admin')));

-- Resumes bucket RLS
CREATE POLICY "Users can upload own resumes" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own resumes" ON storage.objects FOR SELECT USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins can view all resumes" ON storage.objects FOR SELECT USING (bucket_id = 'resumes' AND EXISTS (SELECT 1 FROM public.profiles WHERE id::text = auth.uid()::text AND role::text IN ('super_admin', 'admin')));