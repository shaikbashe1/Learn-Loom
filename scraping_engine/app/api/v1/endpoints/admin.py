"""
Admin review endpoints — the human-in-the-loop gate between automated
course generation and public visibility.

IMPORTANT: as with the rest of this codebase (see the security audit
findings from earlier in this project), these endpoints have NO
authentication wired in yet. Before deploying this for real, put these
behind whatever auth/RBAC system protects your actual admin area — do
not expose /admin/* on the open internet as-is. This is flagged here
deliberately rather than silently shipped.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.base import get_db
from app.services.admin_service import AdminService
from app.schemas.admin import (
    DraftListResponse,
    DraftDetailResponse,
    DraftUpdateRequest,
    DraftReviewRequest,
)

router = APIRouter(prefix="/admin/courses", tags=["Admin"])


@router.get("/drafts", response_model=DraftListResponse)
async def list_drafts(
    topic: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    svc = AdminService(db)
    items, total = await svc.list_drafts(topic=topic, page=page, page_size=page_size)
    return DraftListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/drafts/{resource_id}", response_model=DraftDetailResponse)
async def get_draft(resource_id: int, db: AsyncSession = Depends(get_db)):
    svc = AdminService(db)
    draft = await svc.get_draft_detail(resource_id)
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    return draft


@router.put("/drafts/{resource_id}")
async def edit_draft(resource_id: int, request: DraftUpdateRequest, db: AsyncSession = Depends(get_db)):
    svc = AdminService(db)
    ok = await svc.update_draft_content(resource_id, request.generated_content)
    if not ok:
        raise HTTPException(status_code=404, detail="Draft not found")
    return {"message": "Draft updated"}


@router.post("/{resource_id}/approve")
async def approve_course(resource_id: int, request: DraftReviewRequest, db: AsyncSession = Depends(get_db)):
    svc = AdminService(db)
    ok = await svc.approve_draft(resource_id, reviewed_by=request.reviewed_by)
    if not ok:
        raise HTTPException(status_code=404, detail="Draft not found")
    return {"message": "Course approved and published"}


@router.post("/{resource_id}/reject")
async def reject_course(resource_id: int, request: DraftReviewRequest, db: AsyncSession = Depends(get_db)):
    svc = AdminService(db)
    ok = await svc.reject_draft(resource_id, reviewed_by=request.reviewed_by, reason=request.reason or "")
    if not ok:
        raise HTTPException(status_code=404, detail="Draft not found")
    return {"message": "Course rejected"}
