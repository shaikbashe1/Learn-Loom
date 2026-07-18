-- Migration: Modular Learning System (MLS)

-- 1. Tracks (Sections like Placement Training, Aptitude Training)
CREATE TABLE IF NOT EXISTS public.mls_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    icon_name TEXT,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Modules
CREATE TABLE IF NOT EXISTS public.mls_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    track_id UUID REFERENCES public.mls_tracks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    difficulty TEXT CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced', 'All Levels')),
    estimated_time_mins INTEGER DEFAULT 30,
    order_index INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Materials (Videos, PDFs, Notes)
CREATE TABLE IF NOT EXISTS public.mls_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID REFERENCES public.mls_modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT CHECK (type IN ('video', 'pdf', 'notes', 'link')),
    url TEXT,
    content TEXT, -- Markdown content if type is notes
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Practice Questions
CREATE TABLE IF NOT EXISTS public.mls_practice (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID REFERENCES public.mls_modules(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    explanation TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Quizzes (Simple JSON based for quick checks)
CREATE TABLE IF NOT EXISTS public.mls_quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID REFERENCES public.mls_modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    questions JSONB DEFAULT '[]'::jsonb, -- [{q: "str", options: ["A", "B"], correct: 0, explanation: "str"}]
    passing_percentage INTEGER DEFAULT 70,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. User Progress
CREATE TABLE IF NOT EXISTS public.mls_user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    module_id UUID REFERENCES public.mls_modules(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('started', 'completed')),
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, module_id)
);

-- 7. Bookmarks
CREATE TABLE IF NOT EXISTS public.mls_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    module_id UUID REFERENCES public.mls_modules(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, module_id)
);

-- Enable RLS
ALTER TABLE public.mls_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mls_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mls_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mls_practice ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mls_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mls_user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mls_bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Public Read for published content)
CREATE POLICY "Public tracks are viewable by everyone" ON public.mls_tracks FOR SELECT USING (is_published = true);
CREATE POLICY "Public modules are viewable by everyone" ON public.mls_modules FOR SELECT USING (is_published = true);
CREATE POLICY "Materials viewable by everyone" ON public.mls_materials FOR SELECT USING (true);
CREATE POLICY "Practice viewable by everyone" ON public.mls_practice FOR SELECT USING (true);
CREATE POLICY "Quizzes viewable by everyone" ON public.mls_quizzes FOR SELECT USING (true);

-- RLS Policies (User Specific)
CREATE POLICY "Users can manage their progress" ON public.mls_user_progress 
    FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their bookmarks" ON public.mls_bookmarks 
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies (Admin CRUD - using existing organizations or simple role check if available, 
-- but falling back to TRUE for demo environments to allow easy frontend administration)
-- Note: In a production LearnLoom environment, these would check `user_roles`.
CREATE POLICY "Admins can manage tracks" ON public.mls_tracks FOR ALL USING (true);
CREATE POLICY "Admins can manage modules" ON public.mls_modules FOR ALL USING (true);
CREATE POLICY "Admins can manage materials" ON public.mls_materials FOR ALL USING (true);
CREATE POLICY "Admins can manage practice" ON public.mls_practice FOR ALL USING (true);
CREATE POLICY "Admins can manage quizzes" ON public.mls_quizzes FOR ALL USING (true);
