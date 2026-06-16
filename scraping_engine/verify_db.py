import asyncio
from sqlalchemy import text
from app.database.base import AsyncSessionLocal

async def q():
    async with AsyncSessionLocal() as db:
        await db.execute(text("UPDATE public.courses SET rating=0, student_count=0 WHERE rating IS NULL;"))
        await db.commit()
        print("Updated NULL values to 0!")

asyncio.run(q())
