from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "learnloom",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_reject_on_worker_lost=True,
    task_soft_time_limit=3600,   # 1 hour soft limit
    task_time_limit=7200,        # 2 hour hard limit
    result_expires=86400,        # results expire after 24h
)

# Beat schedule
celery_app.conf.beat_schedule = {
    "discover-and-crawl-every-6-hours": {
        "task": "app.workers.tasks.discover_and_crawl",
        "schedule": crontab(minute=0, hour="*/6"),  # 00:00, 06:00, 12:00, 18:00 UTC
    },
    "scrape-all-sources-daily": {
        "task": "app.workers.tasks.scrape_all_sources",
        "schedule": crontab(hour=2, minute=0),  # 2 AM UTC daily — full sweep, in addition to discovery
    },
    "cleanup-old-logs": {
        "task": "app.workers.tasks.cleanup_old_logs",
        "schedule": crontab(hour=3, minute=0),  # 3 AM UTC daily
    },
    "humanize-pending-resources-safety-net": {
        "task": "app.workers.tasks.humanize_pending_resources",
        "schedule": crontab(minute="*/30"),  # every 30 minutes
    },
}
