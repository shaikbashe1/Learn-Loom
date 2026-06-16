from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
import math

from app.database.base import get_db
from app.services.resource_service import ResourceService
from app.schemas.resource import (
    ResourceResponse,
    ResourceListResponse,
    ResourceFilter,
    ResourceCreate,
    CoursePackageResponse,
)
from app.models.resource import DifficultyLevel, ResourceType
from app.core.config import settings

router = APIRouter(prefix="/resources", tags=["Resources"])


@router.get("", response_model=ResourceListResponse)
async def list_resources(
    category_id: int | None = Query(None),
    difficulty: DifficultyLevel | None = Query(None),
    source_id: int | None = Query(None),
    resource_type: ResourceType | None = Query(None),
    tag: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(settings.DEFAULT_PAGE_SIZE, ge=1, le=settings.MAX_PAGE_SIZE),
    db: AsyncSession = Depends(get_db),
):
    filters = ResourceFilter(
        category_id=category_id,
        difficulty=difficulty,
        source_id=source_id,
        resource_type=resource_type,
        tag=tag,
        page=page,
        page_size=page_size,
    )
    svc = ResourceService(db)
    items, total = await svc.list_resources(filters)
    total_pages = math.ceil(total / page_size) if total else 0

    return ResourceListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/trending", response_model=list[ResourceResponse])
async def trending_resources(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    svc = ResourceService(db)
    return await svc.get_trending(limit)


@router.get("/{resource_id}", response_model=ResourceResponse)
async def get_resource(resource_id: int, db: AsyncSession = Depends(get_db)):
    svc = ResourceService(db)
    resource = await svc.get_by_id(resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    return resource


@router.get("/{resource_id}/course", response_model=CoursePackageResponse)
async def get_resource_course_package(resource_id: int, db: AsyncSession = Depends(get_db)):
    """
    The full structured course package — course_title/modules/lessons/
    quizzes/assignments/references — exactly as produced by
    app/processors/course_builder.py. Returns 404 for anything not
    READY_TO_PUBLISH; there is no way to fetch a CRAWLED/HUMANIZED/
    REJECTED resource's content through this or any other endpoint.
    """
    svc = ResourceService(db)
    package = await svc.get_course_package(resource_id)
    if not package:
        raise HTTPException(status_code=404, detail="Course package not found or not yet published")
    return package
