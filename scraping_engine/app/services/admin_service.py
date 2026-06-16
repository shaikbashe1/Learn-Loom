"""
Admin review service — the human gate between automated course generation
and public visibility. Nothing in the automated pipeline can set
processing_status=PUBLISHED; only approve_draft() below can.
"""
import json
from datetime import datetime, timezone
from typing import Optional, List, Tuple

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.models import Resource, Category, Source, ResourceTag
from app.models.resource import ProcessingStatus
from app.database.redis import cache_delete_pattern
from app.core.logging import logger


class AdminService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_drafts(
        self, topic: Optional[str] = None, page: int = 1, page_size: int = 20
    ) -> Tuple[List[Resource], int]:
        """GET /admin/courses/drafts — everything sitting at READY_TO_PUBLISH."""
        conditions = [Resource.processing_status == ProcessingStatus.READY_TO_PUBLISH]
        if topic:
            conditions.append(Resource.topic == topic)
        where_clause = and_(*conditions)

        total = (
            await self.db.execute(select(func.count()).select_from(Resource).where(where_clause))
        ).scalar_one()

        stmt = (
            select(Resource)
            .where(where_clause)
            .options(selectinload(Resource.category), selectinload(Resource.source))
            .order_by(Resource.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        items = list((await self.db.execute(stmt)).scalars().all())
        return items, total

    async def get_draft_detail(self, resource_id: int) -> Optional[dict]:
        """Full editable view of a draft — humanized fields + the course package JSON."""
        stmt = select(Resource).where(
            Resource.id == resource_id,
            Resource.processing_status == ProcessingStatus.READY_TO_PUBLISH,
        )
        resource = (await self.db.execute(stmt)).scalar_one_or_none()
        if not resource:
            return None

        return {
            "id": resource.id,
            "title": resource.title,
            "description": resource.description,
            "topic": resource.topic,
            "originality_score": resource.originality_score,
            "quality_score": resource.quality_score,
            "readability_score": resource.readability_score,
            "source_title": resource.source_title,
            "source_url": resource.source_url,
            "course_package": json.loads(resource.generated_content) if resource.generated_content else None,
        }

    async def update_draft_content(self, resource_id: int, generated_content: dict) -> bool:
        """Admin edits to the course package before approval — does not change status."""
        resource = (
            await self.db.execute(
                select(Resource).where(
                    Resource.id == resource_id,
                    Resource.processing_status == ProcessingStatus.READY_TO_PUBLISH,
                )
            )
        ).scalar_one_or_none()
        if not resource:
            return False
        resource.generated_content = json.dumps(generated_content)
        if "course_title" in generated_content:
            resource.title = generated_content["course_title"]
        await self.db.flush()
        return True

    async def approve_draft(self, resource_id: int, reviewed_by: str) -> bool:
        """The ONLY place processing_status can become PUBLISHED."""
        resource = (
            await self.db.execute(
                select(Resource).where(
                    Resource.id == resource_id,
                    Resource.processing_status == ProcessingStatus.READY_TO_PUBLISH,
                )
            )
        ).scalar_one_or_none()
        if not resource:
            return False

        resource.processing_status = ProcessingStatus.PUBLISHED
        resource.reviewed_by = reviewed_by
        resource.reviewed_at = datetime.now(timezone.utc).isoformat()
        await self.db.flush()
        await cache_delete_pattern("resources:*")
        logger.info("Resource %d approved and PUBLISHED by %s", resource_id, reviewed_by)
        return True

    async def reject_draft(self, resource_id: int, reviewed_by: str, reason: str = "") -> bool:
        resource = (
            await self.db.execute(
                select(Resource).where(
                    Resource.id == resource_id,
                    Resource.processing_status == ProcessingStatus.READY_TO_PUBLISH,
                )
            )
        ).scalar_one_or_none()
        if not resource:
            return False

        resource.processing_status = ProcessingStatus.REJECTED
        resource.reviewed_by = reviewed_by
        resource.reviewed_at = datetime.now(timezone.utc).isoformat()
        await self.db.flush()
        logger.info("Resource %d rejected by %s: %s", resource_id, reviewed_by, reason)
        return True
