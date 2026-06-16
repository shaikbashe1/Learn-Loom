from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.base import get_db
from app.services.monitoring_service import get_monitoring_stats
from app.schemas.monitoring import MonitoringStatsResponse

router = APIRouter(prefix="/monitoring", tags=["Monitoring"])


@router.get("/stats", response_model=MonitoringStatsResponse)
async def monitoring_stats(db: AsyncSession = Depends(get_db)):
    """
    Backend data for the requested monitoring dashboard: sources crawled,
    courses generated (overall + by topic, including AI/MERN counts),
    failed jobs in the last 24h, and last crawl time. This is a JSON API,
    not a rendered dashboard UI — wire it into whatever admin frontend
    LearnLoom uses.
    """
    return await get_monitoring_stats(db)
