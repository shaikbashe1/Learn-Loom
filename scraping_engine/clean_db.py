import asyncio
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent))

from app.database.base import AsyncSessionLocal
from sqlalchemy import text

async def clean():
    async with AsyncSessionLocal() as db:
        try:
            print("Cleaning duplicate dummy problems...")
            await db.execute(text("DELETE FROM public.coding_problems;"))
            await db.commit()
            print("Database cleaned successfully! It is now empty.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(clean())
