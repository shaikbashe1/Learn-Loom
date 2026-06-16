from pydantic import BaseModel
from datetime import datetime
from app.models.compliance import RobotsStatus, TosReviewResult, ApprovalStatus


class ComplianceLogResponse(BaseModel):
    id: int
    website_name: str
    base_url: str
    spider_name: str
    robots_txt_status: RobotsStatus
    robots_txt_notes: str | None
    tos_review_result: TosReviewResult
    tos_notes: str | None
    license_notes: str | None
    approval_status: ApprovalStatus
    reviewed_by: str
    date_checked: datetime

    class Config:
        from_attributes = True
