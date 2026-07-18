import asyncio
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent))
from app.database.base import AsyncSessionLocal
from sqlalchemy import text

async def reset_roles():
    async with AsyncSessionLocal() as db:
        # Step 1: Temporarily disable the trigger preventing role escalation
        await db.execute(text("DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;"))
        
        # Step 2: Downgrade everyone to student EXCEPT shaikbashe2222@gmail.com
        res_downgrade = await db.execute(text("UPDATE public.profiles SET role = 'student' WHERE email != 'shaikbashe2222@gmail.com';"))
        
        # Step 3: Ensure shaikbashe2222@gmail.com is an admin
        res_upgrade = await db.execute(text("UPDATE public.profiles SET role = 'admin' WHERE email = 'shaikbashe2222@gmail.com';"))
        
        # Step 4: Re-enable the trigger
        await db.execute(text("CREATE TRIGGER trg_prevent_role_escalation BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION prevent_role_escalation();"))
        
        await db.commit()
        print(f"Roles updated successfully. Downgraded accounts to student. Ensured shaikbashe2222@gmail.com is admin.")

if __name__ == "__main__":
    asyncio.run(reset_roles())
