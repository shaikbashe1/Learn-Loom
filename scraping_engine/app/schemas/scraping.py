from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from app.models.scraping_log import JobStatus


class ScrapeStartRequest(BaseModel):
    spider_name: Optional[str] = None  # None = scrape all active sources
    source_ids: Optional[List[int]] = None
    force: bool = False  # ignore last_scraped_at check


class ScrapeStartResponse(BaseModel):
    job_id: str
    message: str
    spiders_queued: List[str]


class ScrapeStatusResponse(BaseModel):
    job_id: str
    status: JobStatus
    spider_name: str
    started_at: datetime
    completed_at: Optional[datetime]
    items_scraped: int
    items_saved: int
    items_duplicate: int
    items_failed: int
    error_message: Optional[str]

    class Config:
        from_attributes = True


class ScrapingLogListResponse(BaseModel):
    items: List[ScrapeStatusResponse]
    total: int
