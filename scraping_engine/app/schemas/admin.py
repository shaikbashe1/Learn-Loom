from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class DraftListItem(BaseModel):
    id: int
    title: str
    topic: Optional[str] = None
    originality_score: Optional[float] = None
    quality_score: Optional[float] = None
    readability_score: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DraftListResponse(BaseModel):
    items: list[DraftListItem]
    total: int
    page: int
    page_size: int


class DraftDetailResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    topic: Optional[str]
    originality_score: Optional[float]
    quality_score: Optional[float]
    readability_score: Optional[float]
    source_title: Optional[str]
    source_url: Optional[str]
    course_package: Optional[dict[str, Any]]


class DraftUpdateRequest(BaseModel):
    generated_content: dict[str, Any]


class DraftReviewRequest(BaseModel):
    reviewed_by: str
    reason: Optional[str] = None
