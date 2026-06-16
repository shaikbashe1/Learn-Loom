import enum
from datetime import datetime
from sqlalchemy import String, Text, DateTime, Enum, Integer, func
from sqlalchemy.orm import mapped_column, Mapped
from app.database.base import Base


class PublishStatus(str, enum.Enum):
    SAFE_TO_PUBLISH = "SAFE_TO_PUBLISH"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    FAILED = "FAILED"


class CourseGenerationLog(Base):
    __tablename__ = "course_generation_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    topic_slug: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    category_slug: Mapped[str] = mapped_column(String(120), nullable=False)

    sources_used: Mapped[int] = mapped_column(Integer, default=0)
    concepts_extracted: Mapped[int] = mapped_column(Integer, default=0)
    modules_generated: Mapped[int] = mapped_column(Integer, default=0)

    status: Mapped[PublishStatus] = mapped_column(Enum(PublishStatus), default=PublishStatus.FAILED)
    findings_summary: Mapped[str | None] = mapped_column(Text)
    output_path: Mapped[str | None] = mapped_column(String(500))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
