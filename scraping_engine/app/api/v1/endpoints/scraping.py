from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.base import get_db
from app.services.scraping_service import ScrapingService
from app.schemas.scraping import (
    ScrapeStartRequest,
    ScrapeStartResponse,
    ScrapeStatusResponse,
    ScrapingLogListResponse,
)

router = APIRouter(prefix="/scrape", tags=["Scraping"])


@router.post("/start", response_model=ScrapeStartResponse)
async def start_scrape(
    request: ScrapeStartRequest,
    db: AsyncSession = Depends(get_db),
):
    svc = ScrapingService(db)
    return await svc.start_scrape(request)


@router.get("/status/{job_id}", response_model=list[ScrapeStatusResponse])
async def scrape_status(job_id: str, db: AsyncSession = Depends(get_db)):
    svc = ScrapingService(db)
    logs = await svc.get_status(job_id)
    if not logs:
        raise HTTPException(status_code=404, detail="Job not found")
    return logs


@router.get("/logs", response_model=ScrapingLogListResponse)
async def list_scrape_logs(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    svc = ScrapingService(db)
    items, total = await svc.list_logs(limit=limit, offset=offset)
    return ScrapingLogListResponse(items=items, total=total)
