"""
Celery tasks for scraping orchestration.
"""
import subprocess
import sys
from datetime import datetime, timezone, timedelta
from celery import shared_task
from celery.utils.log import get_task_logger
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app.workers.celery_app import celery_app
from app.core.config import settings
from app.models import Source, ScrapingLog
from app.models.scraping_log import JobStatus
from app.services.discovery_service import find_sources_due_for_crawl

logger = get_task_logger(__name__)


def _get_sync_session():
    engine = create_engine(settings.SYNC_DATABASE_URL, pool_pre_ping=True)
    Session = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    return engine, Session


@celery_app.task(
    name="app.workers.tasks.scrape_source_task",
    bind=True,
    max_retries=3,
    default_retry_delay=300,
)
def scrape_source_task(self, source_id: int, job_id: str):
    """Run a single Scrapy spider for the given source."""
    engine, Session = _get_sync_session()
    session = Session()

    try:
        source = session.execute(
            select(Source).where(Source.id == source_id)
        ).scalar_one_or_none()

        if not source:
            logger.error("Source %d not found", source_id)
            return

        log = session.execute(
            select(ScrapingLog).where(ScrapingLog.job_id == job_id)
        ).scalar_one_or_none()

        if log:
            log.status = JobStatus.RUNNING
            session.commit()

        # Run Scrapy in a subprocess to isolate the Twisted reactor
        result = subprocess.run(
            [
                sys.executable, "-m", "scrapy", "crawl", source.spider_name,
                "-s", f"SOURCE_ID={source_id}",
                "-s", f"JOB_ID={job_id}",
                "--logfile", f"logs/spider_{source.spider_name}_{job_id[:8]}.log",
            ],
            capture_output=True,
            text=True,
            timeout=settings.SCRAPE_TIMEOUT * 200,
        )

        if log:
            log.status = JobStatus.COMPLETED if result.returncode == 0 else JobStatus.FAILED
            log.completed_at = datetime.now(timezone.utc)
            if result.returncode != 0:
                log.error_message = result.stderr[-2000:]
            session.commit()

        # Update source last_scraped_at
        source.last_scraped_at = datetime.now(timezone.utc).isoformat()
        session.commit()

        logger.info("Spider %s finished with code %d", source.spider_name, result.returncode)

        if result.returncode == 0:
            from app.models import Resource, Category, ProcessingStatus

            # Humanization: every resource this run just saved is sitting at
            # processing_status=CRAWLED (the model default) and is NOT yet
            # publishable. Queue the per-resource pipeline
            # (Clean -> Extract Facts -> Humanize -> Originality Check -> Save)
            # for each one — this is what moves CRAWLED -> READY_TO_PUBLISH.
            pending_resource_ids = session.execute(
                select(Resource.id)
                .where(
                    Resource.source_id == source_id,
                    Resource.processing_status == ProcessingStatus.CRAWLED,
                )
            ).scalars().all()
            for resource_id in pending_resource_ids:
                humanize_resource_task.delay(resource_id)
            logger.info("Queued humanization for %d resource(s) from source_id=%d",
                        len(pending_resource_ids), source_id)

            # Autonomous category-level course synthesis (separate, multi-resource
            # pipeline — see app/services/course_generator.py) still runs too.
            category_slugs = session.execute(
                select(Category.slug)
                .join(Resource, Resource.category_id == Category.id)
                .where(Resource.source_id == source_id)
                .distinct()
            ).scalars().all()
            for slug in category_slugs:
                generate_course_task.delay(slug, slug.replace("-", " ").title())

    except subprocess.TimeoutExpired:
        logger.error("Spider %s timed out for job %s", source_id, job_id)
        if log:
            log.status = JobStatus.FAILED
            log.error_message = "Timeout"
            log.completed_at = datetime.now(timezone.utc)
            session.commit()
        raise self.retry(exc=Exception("Spider timeout"))

    except Exception as exc:
        logger.exception("Spider task failed: %s", exc)
        if session:
            try:
                log = session.execute(
                    select(ScrapingLog).where(ScrapingLog.job_id == job_id)
                ).scalar_one_or_none()
                if log:
                    log.status = JobStatus.FAILED
                    log.error_message = str(exc)[:2000]
                    log.completed_at = datetime.now(timezone.utc)
                    session.commit()
            except Exception:
                pass
        raise self.retry(exc=exc)

    finally:
        session.close()
        engine.dispose()


@celery_app.task(name="app.workers.tasks.scrape_all_sources")
def scrape_all_sources():
    """Triggered by Celery Beat — scrapes all active sources."""
    engine, Session = _get_sync_session()
    session = Session()
    try:
        sources = session.execute(
            select(Source).where(Source.is_active == True)
        ).scalars().all()

        import uuid
        job_id = str(uuid.uuid4())
        queued = 0

        for source in sources:
            full_job_id = f"{job_id}:{source.spider_name}"
            log = ScrapingLog(
                job_id=full_job_id,
                source_id=source.id,
                spider_name=source.spider_name,
                status=JobStatus.PENDING,
            )
            session.add(log)
            session.flush()

            scrape_source_task.delay(source.id, full_job_id)
            queued += 1

        session.commit()
        logger.info("Scheduled %d spider(s) for job=%s", queued, job_id)
        return {"job_id": job_id, "queued": queued}

    finally:
        session.close()
        engine.dispose()


@celery_app.task(name="app.workers.tasks.discover_and_crawl")
def discover_and_crawl():
    """
    Runs every 6 hours (see celery_app.py beat schedule). Finds approved
    sources due for a fresh crawl (see app/services/discovery_service.py
    for what "discovery" deliberately does and doesn't mean here) and
    queues scrape_source_task for each — which in turn auto-queues
    humanize_resource_task for anything newly scraped (see scrape_source_task
    above). This is the entrypoint requirement #8 ("run automatically every
    6 hours") wires into.
    """
    engine, Session = _get_sync_session()
    session = Session()
    try:
        due_sources = find_sources_due_for_crawl(session)
        if not due_sources:
            logger.info("Discovery cycle: no sources due for crawl right now")
            return {"queued": 0}

        import uuid
        job_id = str(uuid.uuid4())
        queued = 0

        for source in due_sources:
            full_job_id = f"{job_id}:{source.spider_name}"
            session.add(ScrapingLog(
                job_id=full_job_id,
                source_id=source.id,
                spider_name=source.spider_name,
                status=JobStatus.PENDING,
            ))
            session.flush()
            scrape_source_task.delay(source.id, full_job_id)
            queued += 1

        session.commit()
        logger.info("Discovery cycle queued %d source(s) for crawl: %s",
                     queued, [s.spider_name for s in due_sources])
        return {"job_id": job_id, "queued": queued}
    finally:
        session.close()
        engine.dispose()


@celery_app.task(
    name="app.workers.tasks.generate_course_task",
    bind=True,
    max_retries=2,
    default_retry_delay=600,
)
def generate_course_task(self, category_slug: str, topic_name: str):
    """
    Runs the autonomous course-generation pipeline for one category:
    extract → graph → author → validate → write → log SAFE_TO_PUBLISH /
    REVIEW_REQUIRED / FAILED. Triggered automatically after a successful
    scrape, or manually via POST /api/v1/courses/generate.
    """
    import asyncio
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    from app.services.course_generator import CourseGenerationOrchestrator

    async def _run():
        engine = create_async_engine(settings.DATABASE_URL)
        Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        async with Session() as session:
            orchestrator = CourseGenerationOrchestrator(session)
            result = await orchestrator.generate(category_slug, topic_name)
            await session.commit()
            return result
        await engine.dispose()

    try:
        result = asyncio.run(_run())
        logger.info(
            "Course generation for category=%s finished with status=%s",
            category_slug, result.status,
        )
        return {"category_slug": category_slug, "status": result.status.value}
    except Exception as exc:
        logger.exception("Course generation task failed for category=%s: %s", category_slug, exc)
        raise self.retry(exc=exc)


@celery_app.task(
    name="app.workers.tasks.humanize_resource_task",
    bind=True,
    max_retries=2,
    default_retry_delay=300,
)
def humanize_resource_task(self, resource_id: int):
    """
    The per-resource humanization pipeline:
        Clean -> Extract Facts -> Humanize -> Originality Check ->
        Duplicate Check -> Quality Check -> Save (as a DRAFT)

    Status transitions on the Resource row:
        CRAWLED -> HUMANIZED -> COURSE_GENERATED -> READY_TO_PUBLISH
        (or -> REJECTED if originality, duplicate, or quality checks fail)

    READY_TO_PUBLISH means "sitting in the admin drafts queue"
    (GET /admin/courses/drafts), NOT publicly visible — only
    POST /admin/courses/{id}/approve can move a resource to PUBLISHED,
    which is the only status the public API ever serves (see
    app/services/resource_service.py). No amount of automation alone can
    make content public; a human approval step is mandatory.

    The original scraped title is preserved in `source_title` (and the URL
    in `source_url`) BEFORE anything else happens, so provenance is never
    lost. The public-facing `title`/`description` columns are OVERWRITTEN
    with humanized content once all gates pass — raw scraped text must
    never still be sitting in the columns the public API reads from.
    """
    import json
    from app.models import Resource, ProcessingStatus
    from app.processors.fact_extractor import extract_facts, clean_text
    from app.processors.humanizer import humanize
    from app.processors.originality_checker import check_originality
    from app.processors.quality_checker import check_quality
    from app.processors.duplicate_checker import check_for_duplicate
    from app.processors.course_builder import build_course_package
    from app.services.classifier import classify_topic

    # Publish gate thresholds — all three must clear 80 (requirement: "Publish
    # to Drafts only when Originality/Quality/Readability Score >= 80").
    MIN_ORIGINALITY_PCT = 80.0
    MIN_QUALITY_SCORE = 80.0
    MIN_READABILITY_SCORE = 80.0

    engine, Session = _get_sync_session()
    session = Session()

    try:
        resource = session.execute(
            select(Resource).where(Resource.id == resource_id)
        ).scalar_one_or_none()

        if not resource:
            logger.error("Resource %d not found — cannot humanize", resource_id)
            return

        if resource.processing_status != ProcessingStatus.CRAWLED:
            logger.info(
                "Resource %d already at status=%s — skipping re-processing",
                resource_id, resource.processing_status,
            )
            return

        # Preserve provenance before anything else touches the row
        resource.source_url = resource.course_url
        resource.source_title = resource.title
        resource.topic = classify_topic(resource.title or "", resource.description or "")
        session.commit()

        # Stage: Clean + Extract Facts (raw text never leaves this scope)
        facts = extract_facts({
            "title": resource.title,
            "description": resource.description,
            "course_url": resource.course_url,
            "author": resource.author,
        })
        source_text_for_comparison = clean_text(f"{resource.title or ''} {resource.description or ''}")

        # Stage: Humanize
        humanized = humanize(facts)
        resource.processing_status = ProcessingStatus.HUMANIZED
        session.commit()
        logger.info("Resource %d humanized — title='%s' topic='%s'", resource_id, humanized.title, resource.topic)

        generated_text = "\n\n".join(filter(None, [
            humanized.explanation, humanized.example, humanized.exercise,
            humanized.summary,
            "\n".join(q["question"] + " " + q["answer"] for q in humanized.quiz_questions),
        ]))

        # Stage: Originality Check — hard gate, never bypassed
        originality_result = check_originality(generated_text, source_text_for_comparison)
        originality_pct = round(100 * (1 - originality_result.overall_similarity), 1)
        resource.originality_score = originality_pct

        if not originality_result.passed:
            resource.processing_status = ProcessingStatus.REJECTED
            session.commit()
            logger.warning("Resource %d REJECTED by originality check: %s", resource_id, originality_result.reason)
            return

        # Stage: Duplicate Check — title/topic/source similarity against
        # existing drafts and published courses
        dup_result = check_for_duplicate(
            session, humanized.title, resource.topic, resource.source_id, exclude_resource_id=resource.id,
        )
        if dup_result.is_duplicate:
            resource.processing_status = ProcessingStatus.REJECTED
            session.commit()
            logger.warning("Resource %d REJECTED as duplicate: %s", resource_id, dup_result.reason)
            return

        # Stage: Quality + Readability Check
        quality_result = check_quality(humanized)
        resource.quality_score = quality_result.quality_score
        resource.readability_score = quality_result.readability_score

        failing_gates = []
        if originality_pct < MIN_ORIGINALITY_PCT:
            failing_gates.append(f"originality {originality_pct} < {MIN_ORIGINALITY_PCT}")
        if quality_result.quality_score < MIN_QUALITY_SCORE:
            failing_gates.append(f"quality {quality_result.quality_score} < {MIN_QUALITY_SCORE}")
        if quality_result.readability_score < MIN_READABILITY_SCORE:
            failing_gates.append(f"readability {quality_result.readability_score} < {MIN_READABILITY_SCORE}")

        if failing_gates:
            resource.processing_status = ProcessingStatus.REJECTED
            session.commit()
            logger.warning("Resource %d REJECTED — failed quality gates: %s", resource_id, "; ".join(failing_gates))
            return

        # Stage: Course package assembly
        package = build_course_package(facts, humanized)
        resource.processing_status = ProcessingStatus.COURSE_GENERATED
        resource.generated_content = json.dumps(package)
        session.commit()

        # Stage: Save to drafts — final AUTOMATED status. Overwrite the
        # public-facing columns with humanized content so raw scraped text
        # can never leak through them even if a caller bypasses the
        # processing_status filter. Becoming visible to end users still
        # requires a human admin to call POST /admin/courses/{id}/approve.
        resource.title = humanized.title
        resource.description = humanized.summary[:500] if humanized.summary else None
        resource.processing_status = ProcessingStatus.READY_TO_PUBLISH
        session.commit()

        logger.info(
            "Resource %d -> READY_TO_PUBLISH (drafts) — originality=%.1f quality=%.1f readability=%.1f topic=%s",
            resource_id, originality_pct, quality_result.quality_score,
            quality_result.readability_score, resource.topic,
        )

    except Exception as exc:
        logger.exception("Humanization failed for resource %d: %s", resource_id, exc)
        session.rollback()
        raise self.retry(exc=exc)

    finally:
        session.close()
        engine.dispose()


@celery_app.task(name="app.workers.tasks.humanize_pending_resources")
def humanize_pending_resources(limit: int = 200):
    """
    Safety-net periodic task (see celery_app.py beat schedule): catches any
    resource still sitting at CRAWLED — e.g. because a worker crashed before
    humanize_resource_task ran, or it was inserted by a path other than
    scrape_source_task. Nothing should be permanently stuck unpublishable
    due to a missed trigger.
    """
    from app.models import Resource, ProcessingStatus

    engine, Session = _get_sync_session()
    session = Session()
    try:
        pending_ids = session.execute(
            select(Resource.id)
            .where(Resource.processing_status == ProcessingStatus.CRAWLED)
            .limit(limit)
        ).scalars().all()

        for resource_id in pending_ids:
            humanize_resource_task.delay(resource_id)

        logger.info("Safety-net queued humanization for %d pending resource(s)", len(pending_ids))
        return {"queued": len(pending_ids)}
    finally:
        session.close()
        engine.dispose()


@celery_app.task(name="app.workers.tasks.cleanup_old_logs")
def cleanup_old_logs(days: int = 30):
    """Remove scraping logs older than `days` days."""
    engine, Session = _get_sync_session()
    session = Session()
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        old_logs = session.execute(
            select(ScrapingLog).where(ScrapingLog.started_at < cutoff)
        ).scalars().all()

        count = len(old_logs)
        for log in old_logs:
            session.delete(log)

        session.commit()
        logger.info("Deleted %d old scraping logs (>%d days)", count, days)
        return {"deleted": count}

    finally:
        session.close()
        engine.dispose()
