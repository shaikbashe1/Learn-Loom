from pydantic import BaseModel
from datetime import datetime


class TopicCount(BaseModel):
    topic: str
    count: int


class MonitoringStatsResponse(BaseModel):
    sources_crawled: int
    sources_total: int
    courses_generated_total: int          # COURSE_GENERATED or later (drafts + published)
    courses_published_total: int
    courses_pending_review: int           # READY_TO_PUBLISH — sitting in /admin/courses/drafts
    courses_rejected_total: int
    courses_by_topic: list[TopicCount]
    ai_courses_generated: int
    mern_courses_generated: int
    failed_jobs_last_24h: int
    last_crawl_time: datetime | None
