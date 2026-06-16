from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.base import get_db
from app.services.category_service import CategoryService
from app.schemas.category import CategoryResponse

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", response_model=list[CategoryResponse])
async def list_categories(
    active_only: bool = Query(True),
    db: AsyncSession = Depends(get_db),
):
    svc = CategoryService(db)
    return await svc.get_all(active_only=active_only)


@router.get("/{slug}", response_model=CategoryResponse)
async def get_category(slug: str, db: AsyncSession = Depends(get_db)):
    from fastapi import HTTPException
    svc = CategoryService(db)
    cat = await svc.get_by_slug(slug)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    return cat
