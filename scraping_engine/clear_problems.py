import asyncio
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent))
from app.database.base import AsyncSessionLocal
from sqlalchemy import text

async def clear_problems():
    async with AsyncSessionLocal() as db:
        await db.execute(text("DELETE FROM public.coding_problems;"))
        await db.commit()
        print("Successfully deleted all old coding problems. Ready for new detailed dataset!")

if __name__ == "__main__":
    asyncio.run(clear_problems())
