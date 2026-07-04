import asyncio
import os
from sqlalchemy import text
from app.database.base import AsyncSessionLocal

async def create_v4_schema():
    print("Migrating Database Schema v4 (Coding Problems)...")
    
    async with AsyncSessionLocal() as db:
        try:
            # 0. Drop existing tables to avoid type conflicts from legacy schemas
            await db.execute(text("DROP TABLE IF EXISTS public.user_problem_progress CASCADE;"))
            await db.execute(text("DROP TABLE IF EXISTS public.daily_challenges CASCADE;"))
            await db.execute(text("DROP TABLE IF EXISTS public.user_submissions CASCADE;"))
            await db.execute(text("DROP TABLE IF EXISTS public.problem_testcases CASCADE;"))
            await db.execute(text("DROP TABLE IF EXISTS public.coding_problems CASCADE;"))

            # 1. coding_problems
            await db.execute(text("""
                CREATE TABLE IF NOT EXISTS public.coding_problems (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    title TEXT NOT NULL,
                    slug TEXT UNIQUE NOT NULL,
                    difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
                    description TEXT NOT NULL,
                    topic TEXT,
                    company_tags JSONB DEFAULT '[]'::jsonb,
                    hints JSONB DEFAULT '[]'::jsonb,
                    starter_code JSONB DEFAULT '{}'::jsonb,
                    constraints JSONB DEFAULT '[]'::jsonb,
                    time_limit_ms INTEGER DEFAULT 2000,
                    memory_limit_mb INTEGER DEFAULT 256,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            """))

            # 2. problem_testcases
            await db.execute(text("""
                CREATE TABLE IF NOT EXISTS public.problem_testcases (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    problem_id UUID REFERENCES public.coding_problems(id) ON DELETE CASCADE,
                    input TEXT NOT NULL,
                    expected_output TEXT NOT NULL,
                    is_hidden BOOLEAN DEFAULT false,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            """))

            # 3. user_submissions
            await db.execute(text("""
                CREATE TABLE IF NOT EXISTS public.user_submissions (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
                    problem_id UUID REFERENCES public.coding_problems(id) ON DELETE CASCADE,
                    code TEXT NOT NULL,
                    language TEXT NOT NULL,
                    status TEXT NOT NULL,
                    execution_time_ms INTEGER,
                    memory_mb FLOAT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            """))

            # 4. daily_challenges
            await db.execute(text("""
                CREATE TABLE IF NOT EXISTS public.daily_challenges (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    challenge_date DATE UNIQUE NOT NULL,
                    problem_id UUID REFERENCES public.coding_problems(id) ON DELETE CASCADE,
                    xp_reward INTEGER DEFAULT 50,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            """))

            # 5. user_problem_progress (optional but useful for analytics/XP)
            await db.execute(text("""
                CREATE TABLE IF NOT EXISTS public.user_problem_progress (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
                    problem_id UUID REFERENCES public.coding_problems(id) ON DELETE CASCADE,
                    status TEXT NOT NULL CHECK (status IN ('Attempted', 'Solved')),
                    solved_at TIMESTAMP WITH TIME ZONE,
                    UNIQUE(user_id, problem_id)
                );
            """))

            # RLS Policies
            tables = ['coding_problems', 'problem_testcases', 'user_submissions', 'daily_challenges', 'user_problem_progress']
            for table in tables:
                await db.execute(text(f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY;"))

            # coding_problems (read all, write admin only but we'll just allow read for public for now)
            await db.execute(text("""
                DO $$ BEGIN
                    CREATE POLICY "Enable read access for all users" ON public.coding_problems FOR SELECT USING (true);
                EXCEPTION WHEN duplicate_object THEN null; END $$;
            """))

            # problem_testcases (read all)
            await db.execute(text("""
                DO $$ BEGIN
                    CREATE POLICY "Enable read access for all users" ON public.problem_testcases FOR SELECT USING (true);
                EXCEPTION WHEN duplicate_object THEN null; END $$;
            """))
            
            # daily_challenges (read all)
            await db.execute(text("""
                DO $$ BEGIN
                    CREATE POLICY "Enable read access for all users" ON public.daily_challenges FOR SELECT USING (true);
                EXCEPTION WHEN duplicate_object THEN null; END $$;
            """))

            # user_submissions (read/write own)
            await db.execute(text("""
                DO $$ BEGIN
                    CREATE POLICY "Users can manage their own submissions" ON public.user_submissions 
                        FOR ALL USING (auth.uid() = user_id);
                EXCEPTION WHEN duplicate_object THEN null; END $$;
            """))

            # user_problem_progress (read/write own)
            await db.execute(text("""
                DO $$ BEGIN
                    CREATE POLICY "Users can manage their own progress" ON public.user_problem_progress 
                        FOR ALL USING (auth.uid() = user_id);
                EXCEPTION WHEN duplicate_object THEN null; END $$;
            """))

            await db.commit()
            print("Schema v4 created and RLS applied successfully!")
        except Exception as e:
            print(f"Error during migration: {e}")
            await db.rollback()

if __name__ == "__main__":
    asyncio.run(create_v4_schema())
