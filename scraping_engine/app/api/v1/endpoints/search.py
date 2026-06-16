import math
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.base import get_db
from app.services.resource_service import ResourceService
from app.schemas.resource import ResourceListResponse
from app.core.config import settings

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("", response_model=ResourceListResponse)
async def search_resources(
    q: str = Query(..., min_length=2, description="Search query"),
    page: int = Query(1, ge=1),
    page_size: int = Query(settings.DEFAULT_PAGE_SIZE, ge=1, le=settings.MAX_PAGE_SIZE),
    db: AsyncSession = Depends(get_db),
):
    svc = ResourceService(db)
    items, total = await svc.search(q, page=page, page_size=page_size)
    total_pages = math.ceil(total / page_size) if total else 0

    return ResourceListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )
