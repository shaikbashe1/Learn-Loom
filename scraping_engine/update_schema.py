import asyncio
from sqlalchemy import text
from app.database.base import AsyncSessionLocal

async def upgrade_schema():
    print("Upgrading database schema...")
    async with AsyncSessionLocal() as db:
        try:
            # 1. Add status column (default to 'pending' instead of is_published)
            await db.execute(text("ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';"))
            
            # 2. Add quality_score (0-100)
            await db.execute(text("ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS quality_score INTEGER DEFAULT 0;"))
            
            # 3. Add source_url
            await db.execute(text("ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS source_url TEXT;"))
            
            # 4. Migrate existing data from is_published to status
            await db.execute(text("UPDATE public.courses SET status = 'published' WHERE is_published = true AND status = 'pending';"))
            await db.execute(text("UPDATE public.courses SET status = 'draft' WHERE is_published = false AND status = 'pending';"))
            
            await db.commit()
            print("Schema upgrade successful!")
        except Exception as e:
            print(f"Error upgrading schema: {e}")
            await db.rollback()

if __name__ == "__main__":
    asyncio.run(upgrade_schema())
