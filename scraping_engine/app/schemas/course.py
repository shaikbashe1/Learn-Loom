from pydantic import BaseModel
from datetime import datetime
from app.models.course_generation import PublishStatus


class CourseGenerateRequest(BaseModel):
    category_slug: str
    topic_name: str


class CourseGenerateResponse(BaseModel):
    status: PublishStatus
    output_path: str | None
    findings_summary: str
    sources_used: int
    concepts_extracted: int
    modules_generated: int


class CourseGenerationLogResponse(BaseModel):
    id: int
    topic_slug: str
    category_slug: str
    sources_used: int
    concepts_extracted: int
    modules_generated: int
    status: PublishStatus
    findings_summary: str | None
    output_path: str | None
    created_at: datetime

    class Config:
        from_attributes = True
