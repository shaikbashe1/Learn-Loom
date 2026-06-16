-- Create Automation Logs Table
CREATE TABLE public.automation_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id uuid NOT NULL,
    source_url text NOT NULL,
    status text NOT NULL,
    message text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view logs
CREATE POLICY "admin_view_logs" ON public.automation_logs
    FOR SELECT
    USING (get_user_role(auth.uid()) = 'admin'::public.user_role);

-- Service Role can insert
-- (Handled implicitly by Service Role Key bypass)
