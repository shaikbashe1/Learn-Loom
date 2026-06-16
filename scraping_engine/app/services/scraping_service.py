import uuid
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models import Source, ScrapingLog
from app.models.scraping_log import JobStatus
from app.schemas.scraping import ScrapeStartRequest, ScrapeStartResponse
from app.core.logging import logger
from app.services.compliance_service import check_source_compliance


class ScrapingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def start_scrape(self, request: ScrapeStartRequest) -> ScrapeStartResponse:
        from app.workers.celery_app import scrape_source_task

        candidates = await self._resolve_sources(request)
        if not candidates:
            return ScrapeStartResponse(
                job_id="none",
                message="No active sources found",
                spiders_queued=[],
            )

        job_id = str(uuid.uuid4())
        spiders_queued = []
        blocked = []

        for source in candidates:
            # Compliance gate — every job is checked against the static ToS/robots.txt
            # registry AND a live robots.txt re-fetch, regardless of the `force` flag.
            # `force` only bypasses the last_scraped_at recency check, never compliance.
            result = await check_source_compliance(source.spider_name)

            log_status = JobStatus.PENDING if result.approved else JobStatus.FAILED
            log = ScrapingLog(
                job_id=f"{job_id}:{source.spider_name}",
                source_id=source.id,
                spider_name=source.spider_name,
                status=log_status,
                error_message=None if result.approved else f"BLOCKED BY COMPLIANCE GATE: {result.reason}",
            )
            self.db.add(log)

            if result.approved:
                spiders_queued.append(source.spider_name)
            else:
                blocked.append(source.spider_name)
                logger.warning(
                    "Compliance gate blocked spider=%s reason=%s",
                    source.spider_name, result.reason,
                )

        await self.db.flush()

        # Queue Celery tasks ONLY for approved spiders
        for source in candidates:
            if source.spider_name in spiders_queued:
                scrape_source_task.delay(source.id, f"{job_id}:{source.spider_name}")
                logger.info("Queued spider=%s job=%s", source.spider_name, job_id)

        message = f"Scraping started for {len(spiders_queued)} source(s)."
        if blocked:
            message += f" {len(blocked)} source(s) blocked by compliance gate: {', '.join(blocked)}."

        return ScrapeStartResponse(
            job_id=job_id,
            message=message,
            spiders_queued=spiders_queued,
        )

    async def get_status(self, job_id: str) -> Optional[ScrapingLog]:
        result = await self.db.execute(
            select(ScrapingLog).where(ScrapingLog.job_id.like(f"{job_id}%"))
        )
        return result.scalars().all()

    async def list_logs(self, limit: int = 50, offset: int = 0):
        count_stmt = select(func.count()).select_from(ScrapingLog)
        total = (await self.db.execute(count_stmt)).scalar_one()

        stmt = (
            select(ScrapingLog)
            .order_by(ScrapingLog.started_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total

    async def _resolve_sources(self, request: ScrapeStartRequest) -> List[Source]:
        stmt = select(Source).where(Source.is_active == True)

        if request.spider_name:
            stmt = stmt.where(Source.spider_name == request.spider_name)
        elif request.source_ids:
            stmt = stmt.where(Source.id.in_(request.source_ids))

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def update_log_status(
        self,
        job_id: str,
        status: JobStatus,
        items_scraped: int = 0,
        items_saved: int = 0,
        items_duplicate: int = 0,
        items_failed: int = 0,
        error_message: Optional[str] = None,
    ):
        result = await self.db.execute(
            select(ScrapingLog).where(ScrapingLog.job_id == job_id)
        )
        log = result.scalar_one_or_none()
        if log:
            log.status = status
            log.items_scraped = items_scraped
            log.items_saved = items_saved
            log.items_duplicate = items_duplicate
            log.items_failed = items_failed
            log.error_message = error_message
            if status in (JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.PARTIAL):
                from datetime import datetime, timezone
                log.completed_at = datetime.now(timezone.utc)
