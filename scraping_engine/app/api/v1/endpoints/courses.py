from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database.base import get_db
from app.models import CourseGenerationLog
from app.schemas.course import (
    CourseGenerateRequest,
    CourseGenerateResponse,
    CourseGenerationLogResponse,
)
from app.services.course_generator import CourseGenerationOrchestrator

router = APIRouter(prefix="/courses", tags=["Courses"])


@router.post("/generate", response_model=CourseGenerateResponse)
async def generate_course(
    request: CourseGenerateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Runs the full pipeline: extract concepts from approved-source resources
    → synthesize a knowledge graph → author original content → validate
    originality/copyright → write /courses/{category_slug}/*.txt.
    Only ever reads from sources whose compliance status is approved.
    """
    orchestrator = CourseGenerationOrchestrator(db)
    result = await orchestrator.generate(request.category_slug, request.topic_name)
    return CourseGenerateResponse(**result.__dict__)


@router.get("/logs", response_model=list[CourseGenerationLogResponse])
async def list_course_generation_logs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(CourseGenerationLog).order_by(CourseGenerationLog.created_at.desc())
    )
    return result.scalars().all()
