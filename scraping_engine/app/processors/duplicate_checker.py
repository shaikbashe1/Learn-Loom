"""
processors/duplicate_checker.py

Requirement 6 — duplicate prevention: do not create courses that already
exist. Checks title similarity, topic similarity, and source similarity
against existing drafts/published courses before a new one is allowed to
proceed to course generation.

Takes a sync SQLAlchemy Session because it's called from
humanize_resource_task (a Celery task using the sync engine, consistent
with the rest of app/workers/tasks.py).
"""
from dataclasses import dataclass
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.services.classifier import is_duplicate

TITLE_SIMILARITY_THRESHOLD = 0.85


@dataclass
class DuplicateCheckResult:
    is_duplicate: bool
    reason: str = ""
    matched_resource_id: int | None = None


def check_for_duplicate(
    session: Session,
    candidate_title: str,
    topic: str | None,
    source_id: int,
    exclude_resource_id: int,
) -> DuplicateCheckResult:
    from app.models import Resource
    from app.models.resource import ProcessingStatus

    # Only compare against things that already made it past automation —
    # comparing against other CRAWLED rows would be noisy and pointless.
    candidates_stmt = select(Resource).where(
        Resource.processing_status.in_([
            ProcessingStatus.READY_TO_PUBLISH,
            ProcessingStatus.PUBLISHED,
        ]),
        Resource.id != exclude_resource_id,
    )

    if topic:
        candidates_stmt = candidates_stmt.where(Resource.topic == topic)

    candidates = session.execute(candidates_stmt).scalars().all()

    for existing in candidates:
        # Title similarity
        if existing.title and is_duplicate(candidate_title, existing.title, threshold=TITLE_SIMILARITY_THRESHOLD):
            return DuplicateCheckResult(
                True,
                f"Title too similar to existing resource #{existing.id} ('{existing.title}')",
                existing.id,
            )

        # Source similarity — same source AND same topic is a strong duplicate signal
        # even if the title phrasing differs slightly.
        if existing.source_id == source_id and existing.topic == topic and topic is not None:
            return DuplicateCheckResult(
                True,
                f"Same source + same topic ('{topic}') as existing resource #{existing.id}",
                existing.id,
            )

    return DuplicateCheckResult(False)
