from pydantic import BaseModel, HttpUrl, field_validator
from datetime import datetime
from typing import Optional, List, Any
from app.models.resource import DifficultyLevel, ResourceType, ProcessingStatus


class TagResponse(BaseModel):
    id: int
    name: str
    slug: str

    class Config:
        from_attributes = True


class SourceBrief(BaseModel):
    id: int
    name: str
    base_url: str

    class Config:
        from_attributes = True


class CategoryBrief(BaseModel):
    id: int
    name: str
    slug: str

    class Config:
        from_attributes = True


class ResourceBase(BaseModel):
    title: str
    description: Optional[str] = None
    author: Optional[str] = None
    course_url: str
    thumbnail_url: Optional[str] = None
    duration: Optional[str] = None
    last_updated: Optional[str] = None
    resource_type: ResourceType = ResourceType.COURSE
    difficulty: DifficultyLevel = DifficultyLevel.BEGINNER


class ResourceCreate(ResourceBase):
    category_id: int
    source_id: int
    tags: List[str] = []


class ResourceResponse(ResourceBase):
    """
    `title`/`description` here are ALWAYS humanized content, never the raw
    scrape — see app/workers/tasks.py::humanize_resource_task, which
    overwrites these columns at the moment a resource reaches
    READY_TO_PUBLISH. This schema deliberately has no field exposing
    `source_title`/`source_url`/`generated_content` directly; use
    GET /resources/{id}/course for the full structured course package.
    """
    id: int
    category: CategoryBrief
    source: SourceBrief
    tags: List[TagResponse] = []
    view_count: int
    rating: Optional[float]
    is_active: bool
    processing_status: ProcessingStatus
    originality_score: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    @field_validator("tags", mode="before")
    @classmethod
    def extract_tags(cls, v):
        if v and hasattr(v[0], "tag"):
            return [rt.tag for rt in v]
        return v

    class Config:
        from_attributes = True


class ResourceListResponse(BaseModel):
    items: List[ResourceResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class CoursePackageResponse(BaseModel):
    """Exact schema produced by app/processors/course_builder.py."""
    course_title: str
    modules: List[Any] = []
    lessons: List[Any] = []
    quizzes: List[Any] = []
    assignments: List[Any] = []
    references: List[Any] = []


class ResourceFilter(BaseModel):
    category_id: Optional[int] = None
    difficulty: Optional[DifficultyLevel] = None
    source_id: Optional[int] = None
    resource_type: Optional[ResourceType] = None
    tag: Optional[str] = None
    page: int = 1
    page_size: int = 20
