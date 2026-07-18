import asyncio
import os
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent))

from app.database.base import AsyncSessionLocal
from sqlalchemy import text

async def fix():
    async with AsyncSessionLocal() as db:
        try:
            print("Applying INSERT policy for coding_problems...")
            await db.execute(text("""
                DO $$ BEGIN
                    CREATE POLICY "Enable insert access for all users" ON public.coding_problems FOR INSERT WITH CHECK (true);
                EXCEPTION WHEN duplicate_object THEN null; END $$;
            """))
            await db.commit()
            print("RLS policy successfully added!")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(fix())
