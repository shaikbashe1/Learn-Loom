import enum
from datetime import datetime
from sqlalchemy import String, Text, DateTime, Enum, func
from sqlalchemy.orm import mapped_column, Mapped
from app.database.base import Base


class RobotsStatus(str, enum.Enum):
    ALLOWED = "allowed"
    PARTIAL = "partial"          # some paths disallowed
    DISALLOWED = "disallowed"
    UNKNOWN = "unknown"          # could not fetch/parse


class TosReviewResult(str, enum.Enum):
    PERMITS_AUTOMATION = "permits_automation"
    PROHIBITS_AUTOMATION = "prohibits_automation"
    SILENT = "silent"            # no mention either way
    NEEDS_MANUAL_REVIEW = "needs_manual_review"


class ApprovalStatus(str, enum.Enum):
    APPROVED = "approved"
    REJECTED = "rejected"
    PENDING_REVIEW = "pending_review"


class ComplianceLog(Base):
    """
    Audit trail of the compliance checks performed for each source before
    scraping is permitted. One row per review event — history is preserved
    (never overwritten) so the log can be presented to legal/auditors.
    """
    __tablename__ = "compliance_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    website_name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    base_url: Mapped[str] = mapped_column(String(500), nullable=False)
    spider_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)

    robots_txt_status: Mapped[RobotsStatus] = mapped_column(
        Enum(RobotsStatus), default=RobotsStatus.UNKNOWN
    )
    robots_txt_notes: Mapped[str | None] = mapped_column(Text)

    tos_review_result: Mapped[TosReviewResult] = mapped_column(
        Enum(TosReviewResult), default=TosReviewResult.NEEDS_MANUAL_REVIEW
    )
    tos_notes: Mapped[str | None] = mapped_column(Text)
    license_notes: Mapped[str | None] = mapped_column(Text)

    approval_status: Mapped[ApprovalStatus] = mapped_column(
        Enum(ApprovalStatus), default=ApprovalStatus.PENDING_REVIEW, index=True
    )
    reviewed_by: Mapped[str] = mapped_column(String(100), default="automated-compliance-check")

    date_checked: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
