import asyncio
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent))
from app.database.base import AsyncSessionLocal
from sqlalchemy import text

async def f():
    async with AsyncSessionLocal() as db:
        res = await db.execute(text("SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user';"))
        funcs = res.fetchall()
        for func in funcs:
            print("--- FUNCTION ---")
            print(func[0])

if __name__ == "__main__":
    asyncio.run(f())
