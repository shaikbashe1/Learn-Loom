-- ============================================================
-- LearnLoom Migration — User Activity Logs (Learning Momentum)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON public.user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON public.user_activity_logs(created_at);

-- RLS Policies
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own activity logs"
    ON public.user_activity_logs
    FOR INSERT
    WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view their own activity logs"
    ON public.user_activity_logs
    FOR SELECT
    USING (auth.uid()::text = user_id::text);

-- RPC for Heatmap Generation
CREATE OR REPLACE FUNCTION public.get_user_activity_heatmap(p_user_id TEXT)
RETURNS TABLE (activity_date DATE, activity_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT DATE(created_at) as activity_date, COUNT(*)::INT as activity_count
    FROM public.user_activity_logs
    WHERE user_id = p_user_id
      AND created_at >= CURRENT_DATE - INTERVAL '6 months'
    GROUP BY DATE(created_at)
    ORDER BY activity_date ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_activity_heatmap(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_activity_heatmap(TEXT) TO authenticated;
