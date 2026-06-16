"""
Backend for the requested monitoring dashboard. This module returns the
numbers; rendering them as an actual dashboard UI (charts, auto-refresh,
etc.) is a frontend concern outside this backend engine's scope — wire
GET /api/v1/monitoring/stats into whatever admin frontend LearnLoom uses.
"""
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models import Resource, Source, ScrapingLog
from app.models.resource import ProcessingStatus
from app.models.scraping_log import JobStatus


async def get_monitoring_stats(db: AsyncSession) -> dict:
    sources_total = (await db.execute(select(func.count()).select_from(Source))).scalar_one()
    sources_crawled = (
        await db.execute(select(func.count()).select_from(Source).where(Source.last_scraped_at.isnot(None)))
    ).scalar_one()

    status_counts_stmt = select(Resource.processing_status, func.count()).group_by(Resource.processing_status)
    status_counts = dict((await db.execute(status_counts_stmt)).all())

    courses_published = status_counts.get(ProcessingStatus.PUBLISHED, 0)
    courses_pending_review = status_counts.get(ProcessingStatus.READY_TO_PUBLISH, 0)
    courses_rejected = status_counts.get(ProcessingStatus.REJECTED, 0)
    courses_generated_total = (
        status_counts.get(ProcessingStatus.COURSE_GENERATED, 0)
        + courses_pending_review
        + courses_published
    )

    topic_stmt = (
        select(Resource.topic, func.count())
        .where(Resource.topic.isnot(None))
        .where(Resource.processing_status.in_([
            ProcessingStatus.READY_TO_PUBLISH, ProcessingStatus.PUBLISHED,
        ]))
        .group_by(Resource.topic)
    )
    topic_rows = (await db.execute(topic_stmt)).all()
    courses_by_topic = [{"topic": t, "count": c} for t, c in topic_rows]

    ai_topics = {"AI", "Machine Learning", "Deep Learning", "LLMs", "Generative AI", "Prompt Engineering", "Data Science"}
    mern_topics = {"MERN Stack", "React", "Node.js", "Express.js", "MongoDB", "Next.js"}
    ai_count = sum(c for t, c in topic_rows if t in ai_topics)
    mern_count = sum(c for t, c in topic_rows if t in mern_topics)

    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    failed_jobs_stmt = (
        select(func.count())
        .select_from(ScrapingLog)
        .where(ScrapingLog.status == JobStatus.FAILED, ScrapingLog.started_at >= cutoff)
    )
    failed_jobs_last_24h = (await db.execute(failed_jobs_stmt)).scalar_one()

    last_crawl_stmt = select(func.max(ScrapingLog.completed_at))
    last_crawl_time = (await db.execute(last_crawl_stmt)).scalar_one()

    return {
        "sources_crawled": sources_crawled,
        "sources_total": sources_total,
        "courses_generated_total": courses_generated_total,
        "courses_published_total": courses_published,
        "courses_pending_review": courses_pending_review,
        "courses_rejected_total": courses_rejected,
        "courses_by_topic": courses_by_topic,
        "ai_courses_generated": ai_count,
        "mern_courses_generated": mern_count,
        "failed_jobs_last_24h": failed_jobs_last_24h,
        "last_crawl_time": last_crawl_time,
    }
