import asyncio
from sqlalchemy import text
from app.database.base import AsyncSessionLocal

async def setup():
    async with AsyncSessionLocal() as db:
        await db.execute(text("""
            CREATE TABLE IF NOT EXISTS public.scraping_jobs (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                url text NOT NULL,
                status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
                created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
                created_at timestamptz NOT NULL DEFAULT now(),
                updated_at timestamptz NOT NULL DEFAULT now()
            );
        """))
        await db.commit()
        print("Table scraping_jobs created.")

asyncio.run(setup())
