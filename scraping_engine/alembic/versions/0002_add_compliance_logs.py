"""Add compliance_logs table for ToS/robots.txt audit trail.

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-16 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    robots_status_enum = postgresql.ENUM(
        "allowed", "partial", "disallowed", "unknown",
        name="robotsstatus", create_type=True,
    )
    tos_review_enum = postgresql.ENUM(
        "permits_automation", "prohibits_automation", "silent", "needs_manual_review",
        name="tosreviewresult", create_type=True,
    )
    approval_status_enum = postgresql.ENUM(
        "approved", "rejected", "pending_review",
        name="approvalstatus", create_type=True,
    )

    op.create_table(
        "compliance_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("website_name", sa.String(150), nullable=False),
        sa.Column("base_url", sa.String(500), nullable=False),
        sa.Column("spider_name", sa.String(100), nullable=False),
        sa.Column("robots_txt_status", robots_status_enum, nullable=False, server_default="unknown"),
        sa.Column("robots_txt_notes", sa.Text()),
        sa.Column("tos_review_result", tos_review_enum, nullable=False, server_default="needs_manual_review"),
        sa.Column("tos_notes", sa.Text()),
        sa.Column("license_notes", sa.Text()),
        sa.Column("approval_status", approval_status_enum, nullable=False, server_default="pending_review"),
        sa.Column("reviewed_by", sa.String(100), nullable=False, server_default="automated-compliance-check"),
        sa.Column("date_checked", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_compliance_logs"),
    )
    op.create_index("ix_compliance_logs_website_name", "compliance_logs", ["website_name"])
    op.create_index("ix_compliance_logs_spider_name", "compliance_logs", ["spider_name"])
    op.create_index("ix_compliance_logs_approval_status", "compliance_logs", ["approval_status"])


def downgrade() -> None:
    op.drop_table("compliance_logs")
    op.execute("DROP TYPE IF EXISTS approvalstatus")
    op.execute("DROP TYPE IF EXISTS tosreviewresult")
    op.execute("DROP TYPE IF EXISTS robotsstatus")
