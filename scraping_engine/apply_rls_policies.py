import asyncio
from sqlalchemy import text
from app.database.base import AsyncSessionLocal

async def apply_rls_v3():
    print("Applying Row-Level Security (RLS) policies for v3 tables...")
    async with AsyncSessionLocal() as db:
        try:
            tables = [
                'mentor_conversations',
                'mentor_messages',
                'user_roadmaps',
                'roadmap_stages',
                'roadmap_items'
            ]
            
            for table in tables:
                await db.execute(text(f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY;"))
            
            # Policy for mentor_conversations
            await db.execute(text("""
                DO $$ BEGIN
                    CREATE POLICY "Users can manage their own mentor_conversations" ON public.mentor_conversations
                        FOR ALL USING (auth.uid() = user_id);
                EXCEPTION WHEN duplicate_object THEN null; END $$;
            """))

            # Policy for mentor_messages (joins through conversation)
            await db.execute(text("""
                DO $$ BEGIN
                    CREATE POLICY "Users can manage their own mentor_messages" ON public.mentor_messages
                        FOR ALL USING (
                            EXISTS (
                                SELECT 1 FROM public.mentor_conversations
                                WHERE id = mentor_messages.conversation_id
                                AND user_id = auth.uid()
                            )
                        );
                EXCEPTION WHEN duplicate_object THEN null; END $$;
            """))

            # Policy for user_roadmaps
            await db.execute(text("""
                DO $$ BEGIN
                    CREATE POLICY "Users can manage their own user_roadmaps" ON public.user_roadmaps
                        FOR ALL USING (auth.uid() = user_id);
                EXCEPTION WHEN duplicate_object THEN null; END $$;
            """))

            # Policy for roadmap_stages
            await db.execute(text("""
                DO $$ BEGIN
                    CREATE POLICY "Users can manage their own roadmap_stages" ON public.roadmap_stages
                        FOR ALL USING (
                            EXISTS (
                                SELECT 1 FROM public.user_roadmaps
                                WHERE id = roadmap_stages.roadmap_id
                                AND user_id = auth.uid()
                            )
                        );
                EXCEPTION WHEN duplicate_object THEN null; END $$;
            """))

            # Policy for roadmap_items
            await db.execute(text("""
                DO $$ BEGIN
                    CREATE POLICY "Users can manage their own roadmap_items" ON public.roadmap_items
                        FOR ALL USING (
                            EXISTS (
                                SELECT 1 FROM public.roadmap_stages rs
                                JOIN public.user_roadmaps ur ON rs.roadmap_id = ur.id
                                WHERE rs.id = roadmap_items.stage_id
                                AND ur.user_id = auth.uid()
                            )
                        );
                EXCEPTION WHEN duplicate_object THEN null; END $$;
            """))

            await db.commit()
            print("RLS policies applied successfully!")
        except Exception as e:
            print(f"Error applying RLS policies: {e}")
            await db.rollback()

if __name__ == "__main__":
    asyncio.run(apply_rls_v3())
