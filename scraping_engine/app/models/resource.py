import enum
from sqlalchemy import String, Text, Integer, Float, ForeignKey, Enum, Index
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.database.base import Base
from app.models.base import TimestampMixin


class DifficultyLevel(str, enum.Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class ResourceType(str, enum.Enum):
    COURSE = "course"
    ARTICLE = "article"
    DOCUMENTATION = "documentation"
    VIDEO = "video"
    TUTORIAL = "tutorial"
    BOOK = "book"


class ProcessingStatus(str, enum.Enum):
    """
    The pipeline a scraped resource moves through. Nothing is servable by
    the PUBLIC API until PUBLISHED — see app/services/resource_service.py.
    READY_TO_PUBLISH is the drafts queue surfaced at GET /admin/courses/drafts;
    an admin (or POST /admin/courses/{id}/approve) is required to move a
    resource from there to PUBLISHED. Automation alone never makes content
    publicly visible — see app/processors/* and app/workers/tasks.py.

    CRAWLED            -> raw scrape just landed, not yet processed
    HUMANIZED           -> fact-extracted + rewritten into original content
    COURSE_GENERATED    -> assembled into the full course package JSON
    READY_TO_PUBLISH    -> passed originality + quality + duplicate checks;
                           sitting in /admin/courses/drafts awaiting human review
    PUBLISHED           -> an admin approved it; now servable by the public API
    REJECTED            -> failed originality, quality, or dedup checks; never published
    """
    CRAWLED = "CRAWLED"
    HUMANIZED = "HUMANIZED"
    COURSE_GENERATED = "COURSE_GENERATED"
    READY_TO_PUBLISH = "READY_TO_PUBLISH"
    PUBLISHED = "PUBLISHED"
    REJECTED = "REJECTED"


class Resource(Base, TimestampMixin):
    __tablename__ = "resources"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Core content fields
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    author: Mapped[str | None] = mapped_column(String(255))
    course_url: Mapped[str] = mapped_column(String(2000), nullable=False, unique=True)
    thumbnail_url: Mapped[str | None] = mapped_column(String(2000))
    duration: Mapped[str | None] = mapped_column(String(100))
    last_updated: Mapped[str | None] = mapped_column(String(100))

    # Classification
    resource_type: Mapped[ResourceType] = mapped_column(
        Enum(ResourceType), default=ResourceType.COURSE
    )
    difficulty: Mapped[DifficultyLevel] = mapped_column(
        Enum(DifficultyLevel), default=DifficultyLevel.BEGINNER
    )

    # Relationships
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"), nullable=False, index=True)
    source_id: Mapped[int] = mapped_column(ForeignKey("sources.id"), nullable=False, index=True)

    category: Mapped["Category"] = relationship(back_populates="resources")  # noqa: F821
    source: Mapped["Source"] = relationship(back_populates="resources")  # noqa: F821
    resource_tags: Mapped[list["ResourceTag"]] = relationship(  # noqa: F821
        back_populates="resource", cascade="all, delete-orphan"
    )

    # Metrics
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    rating: Mapped[float | None] = mapped_column(Float)

    # Dedup
    content_hash: Mapped[str | None] = mapped_column(String(64), unique=True, index=True)
    is_active: Mapped[bool] = mapped_column(default=True)

    # Full-text search vector (populated by DB trigger)
    search_vector: Mapped[str | None] = mapped_column(Text)

    # ── Humanization pipeline ──────────────────────────────────────────────
    # `title`/`description` above get overwritten with humanized content once
    # processing completes; these fields preserve the original scrape so the
    # provenance is never lost, while never being exposed by the public API.
    source_url: Mapped[str | None] = mapped_column(String(2000))
    source_title: Mapped[str | None] = mapped_column(String(500))
    originality_score: Mapped[float | None] = mapped_column(Float)
    quality_score: Mapped[float | None] = mapped_column(Float)
    readability_score: Mapped[float | None] = mapped_column(Float)
    generated_content: Mapped[str | None] = mapped_column(Text)  # JSON-encoded course package
    processing_status: Mapped[ProcessingStatus] = mapped_column(
        Enum(ProcessingStatus), default=ProcessingStatus.CRAWLED, index=True, nullable=False
    )
    topic: Mapped[str | None] = mapped_column(String(100), index=True)  # fine-grained topic, see classifier.classify_topic
    reviewed_by: Mapped[str | None] = mapped_column(String(150))  # admin who approved/rejected, set at /admin/courses/{id}/approve|reject
    reviewed_at: Mapped[str | None] = mapped_column(String(50))

    __table_args__ = (
        Index("ix_resources_category_difficulty", "category_id", "difficulty"),
        Index("ix_resources_source_active", "source_id", "is_active"),
        Index("ix_resources_processing_status", "processing_status", "is_active"),
    )
