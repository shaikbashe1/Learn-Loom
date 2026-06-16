import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.services.course_writer import CourseDraft
from app.core.logging import logger

async def import_course_to_supabase(db: AsyncSession, draft: CourseDraft):
    logger.info(f"Importing generated course '{draft.topic_slug}' to Supabase...")
    try:
        # Create Course
        course_id = str(uuid.uuid4())
        
        # Parse metadata
        lines = draft.course_metadata.split('\n')
        title = "Generated Course"
        description = draft.course_metadata
        difficulty = "Beginner"
        
        for line in lines:
            if line.lower().startswith("course name:"):
                title = line.split(":", 1)[1].strip()
            if line.lower().startswith("difficulty level:"):
                difficulty = line.split(":", 1)[1].strip()

        await db.execute(text("""
            INSERT INTO public.courses (id, title, description, difficulty, is_published, tags)
            VALUES (:id, :title, :description, :difficulty, false, :tags)
        """), {
            "id": course_id,
            "title": title,
            "description": description,
            "difficulty": difficulty,
            "tags": ["ai-generated", draft.topic_slug]
        })

        # Create Modules
        for i, module_content in enumerate(draft.modules):
            module_id = str(uuid.uuid4())
            module_title = f"Module {i+1}"
            
            # extract first line as title
            mod_lines = module_content.split('\n')
            for line in mod_lines:
                if line.upper().startswith("MODULE") or "===" not in line:
                    module_title = line.replace("=", "").strip()
                    break

            await db.execute(text("""
                INSERT INTO public.course_modules (id, course_id, title, description, "order")
                VALUES (:id, :course_id, :title, :description, :order)
            """), {
                "id": module_id,
                "course_id": course_id,
                "title": module_title,
                "description": module_content,
                "order": i + 1
            })

        await db.commit()
        logger.info(f"Successfully imported course {course_id} to LearnLoom Drafts.")
    except Exception as e:
        logger.error(f"Failed to import course to Supabase: {e}")
        await db.rollback()
