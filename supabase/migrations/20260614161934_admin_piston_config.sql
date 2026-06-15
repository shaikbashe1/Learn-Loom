-- ============================================================
-- LearnLoom Migration — Admin Piston Config
-- ============================================================

CREATE TABLE public.piston_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    proxy_url TEXT NOT NULL DEFAULT 'https://emkc.org/api/v2/piston',
    max_execution_time_ms INTEGER DEFAULT 5000,
    allowed_runtimes TEXT[] DEFAULT '{"python", "javascript", "typescript", "java", "cpp", "c", "rust"}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default row
INSERT INTO public.piston_config (id) VALUES (gen_random_uuid());

ALTER TABLE public.piston_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Piston config viewable by everyone" ON public.piston_config
  FOR SELECT USING (true);

CREATE POLICY "Piston config updated by super admins" ON public.piston_config
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id::text = auth.uid()::text AND role::text = 'super_admin')
  );

CREATE POLICY "Piston config inserted by super admins" ON public.piston_config
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id::text = auth.uid()::text AND role::text = 'super_admin')
  );