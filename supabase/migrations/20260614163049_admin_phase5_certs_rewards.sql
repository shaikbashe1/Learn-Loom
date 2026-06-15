-- ============================================================
-- LearnLoom Migration — Phase 5: Certificates, Rewards, Notifications
-- ============================================================

-- 1. Certificate Templates
CREATE TABLE public.certificate_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure base tables exist
INSERT INTO public.certificate_templates (title, description, is_active)
VALUES ('Standard Developer', 'Used for 85% of technical courses', true),
       ('Premium Elite Tier', 'Experimental gold-leaf digital design', false);

-- 2. Reward Configurations
CREATE TABLE public.reward_configurations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action_type TEXT NOT NULL UNIQUE, -- e.g., 'complete_course', 'pass_quiz', 'solve_problem'
    points INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.reward_configurations (action_type, points) VALUES
('complete_course', 100),
('pass_quiz', 20),
('solve_problem', 50),
('forum_upvote', 5);

-- 3. Notifications (Alter existing table)
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS title TEXT DEFAULT 'Notification';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE public.notifications ALTER COLUMN user_id DROP NOT NULL;
-- In previous migration `read` was used instead of `is_read`. Let's add `is_read` or rename.
ALTER TABLE public.notifications RENAME COLUMN read TO is_read;

-- RLS Policies
ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Certificate templates viewable by everyone" ON public.certificate_templates FOR SELECT USING (true);
CREATE POLICY "Admins manage certificate templates" ON public.certificate_templates FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id::text = auth.uid()::text AND role::text IN ('super_admin', 'admin')));

CREATE POLICY "Reward configurations viewable by everyone" ON public.reward_configurations FOR SELECT USING (true);
CREATE POLICY "Admins manage reward configurations" ON public.reward_configurations FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id::text = auth.uid()::text AND role::text = 'super_admin'));

DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;

CREATE POLICY "Users view own or broadcast notifications" ON public.notifications FOR SELECT USING (user_id IS NULL OR user_id::text = auth.uid()::text);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (user_id::text = auth.uid()::text);
CREATE POLICY "Admins manage all notifications" ON public.notifications FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id::text = auth.uid()::text AND role::text IN ('super_admin', 'admin')));
