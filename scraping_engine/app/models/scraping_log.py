import enum
from datetime import datetime
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, Enum, func
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.database.base import Base


class JobStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    PARTIAL = "partial"


class ScrapingLog(Base):
    __tablename__ = "scraping_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    job_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    source_id: Mapped[int | None] = mapped_column(ForeignKey("sources.id"))
    spider_name: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[JobStatus] = mapped_column(Enum(JobStatus), default=JobStatus.PENDING)

    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    items_scraped: Mapped[int] = mapped_column(Integer, default=0)
    items_saved: Mapped[int] = mapped_column(Integer, default=0)
    items_duplicate: Mapped[int] = mapped_column(Integer, default=0)
    items_failed: Mapped[int] = mapped_column(Integer, default=0)

    error_message: Mapped[str | None] = mapped_column(Text)
    metadata_json: Mapped[str | None] = mapped_column(Text)

    source: Mapped["Source | None"] = relationship(back_populates="scraping_logs")  # noqa: F821
