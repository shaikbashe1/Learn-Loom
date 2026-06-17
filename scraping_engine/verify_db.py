import asyncio
from sqlalchemy import text
from app.database.base import AsyncSessionLocal

async def q():
    async with AsyncSessionLocal() as db:
        r = await db.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public';"))
        for t in r.fetchall():
            print(t[0])

asyncio.run(q())
