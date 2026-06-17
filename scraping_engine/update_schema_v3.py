import asyncio
from sqlalchemy import text
from app.database.base import AsyncSessionLocal

async def upgrade_schema_v3():
    print("Upgrading database schema for v3 (AI Mentor & AI Roadmap)...")
    async with AsyncSessionLocal() as db:
        try:
            # 1. AI Mentor Tables
            await db.execute(text("""
                CREATE TABLE IF NOT EXISTS public.mentor_conversations (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
                    title VARCHAR(255) NOT NULL,
                    context_snapshot JSONB,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
                );
            """))

            await db.execute(text("""
                CREATE TABLE IF NOT EXISTS public.mentor_messages (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    conversation_id UUID REFERENCES public.mentor_conversations(id) ON DELETE CASCADE,
                    role VARCHAR(50) NOT NULL,
                    content TEXT NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
                );
            """))

            # 2. AI Roadmap Tables
            await db.execute(text("""
                CREATE TABLE IF NOT EXISTS public.user_roadmaps (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    domain VARCHAR(100),
                    target_role VARCHAR(100),
                    difficulty VARCHAR(50),
                    estimated_weeks INTEGER DEFAULT 0,
                    progress_percentage INTEGER DEFAULT 0,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
                );
            """))

            await db.execute(text("""
                CREATE TABLE IF NOT EXISTS public.roadmap_stages (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    roadmap_id UUID REFERENCES public.user_roadmaps(id) ON DELETE CASCADE,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    phase_number INTEGER NOT NULL,
                    status VARCHAR(50) DEFAULT 'locked',
                    xp_reward INTEGER DEFAULT 100,
                    order_index INTEGER NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
                );
            """))

            await db.execute(text("""
                CREATE TABLE IF NOT EXISTS public.roadmap_items (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    stage_id UUID REFERENCES public.roadmap_stages(id) ON DELETE CASCADE,
                    title VARCHAR(255) NOT NULL,
                    item_type VARCHAR(50) NOT NULL,
                    resource_url TEXT,
                    status VARCHAR(50) DEFAULT 'pending',
                    duration_minutes INTEGER DEFAULT 0,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
                );
            """))

            await db.commit()
            print("Schema v3 upgrade successful!")
        except Exception as e:
            print(f"Error upgrading schema v3: {e}")
            await db.rollback()

if __name__ == "__main__":
    asyncio.run(upgrade_schema_v3())
