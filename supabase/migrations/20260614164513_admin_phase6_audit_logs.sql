-- ============================================================
-- LearnLoom Migration — Phase 6: Admin Audit Logs
-- ============================================================

CREATE TABLE public.admin_audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id::text = auth.uid()::text AND role::text IN ('super_admin', 'admin')));
CREATE POLICY "Admins can insert audit logs" ON public.admin_audit_logs FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id::text = auth.uid()::text AND role::text IN ('super_admin', 'admin')));