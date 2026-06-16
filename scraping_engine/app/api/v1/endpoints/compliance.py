from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database.base import get_db
from app.models.compliance import ComplianceLog
from app.schemas.compliance import ComplianceLogResponse

router = APIRouter(prefix="/compliance", tags=["Compliance"])


@router.get("/logs", response_model=list[ComplianceLogResponse])
async def list_compliance_logs(db: AsyncSession = Depends(get_db)):
    """
    Full compliance audit trail — robots.txt status, Terms of Service review
    result, and approval status for every configured source. A source with
    approval_status != 'approved' cannot be scraped; POST /scrape/start will
    silently skip it and record the block reason in the scraping log.
    """
    result = await db.execute(select(ComplianceLog).order_by(ComplianceLog.website_name))
    return result.scalars().all()
