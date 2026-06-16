"""Add course_generation_logs table.

Revision ID: 0003
Revises: 0002
Create Date: 2026-06-16 00:30:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    publish_status_enum = postgresql.ENUM(
        "SAFE_TO_PUBLISH", "REVIEW_REQUIRED", "FAILED",
        name="publishstatus", create_type=True,
    )
    op.create_table(
        "course_generation_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("topic_slug", sa.String(120), nullable=False),
        sa.Column("category_slug", sa.String(120), nullable=False),
        sa.Column("sources_used", sa.Integer(), server_default="0"),
        sa.Column("concepts_extracted", sa.Integer(), server_default="0"),
        sa.Column("modules_generated", sa.Integer(), server_default="0"),
        sa.Column("status", publish_status_enum, nullable=False, server_default="FAILED"),
        sa.Column("findings_summary", sa.Text()),
        sa.Column("output_path", sa.String(500)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_course_generation_logs"),
    )
    op.create_index("ix_course_generation_logs_topic_slug", "course_generation_logs", ["topic_slug"])


def downgrade() -> None:
    op.drop_table("course_generation_logs")
    op.execute("DROP TYPE IF EXISTS publishstatus")
