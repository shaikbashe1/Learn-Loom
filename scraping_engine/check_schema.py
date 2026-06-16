import asyncio
from sqlalchemy import text
from app.database.base import AsyncSessionLocal

async def q():
    async with AsyncSessionLocal() as db:
        r = await db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'course_modules';"))
        print(r.fetchall())

asyncio.run(q())
