"""Add humanization pipeline fields to resources.

Revision ID: 0004
Revises: 0003
Create Date: 2026-06-16 01:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    processing_status_enum = postgresql.ENUM(
        "CRAWLED", "HUMANIZED", "COURSE_GENERATED", "READY_TO_PUBLISH", "REJECTED",
        name="processingstatus", create_type=True,
    )
    processing_status_enum.create(op.get_bind(), checkfirst=True)

    op.add_column("resources", sa.Column("source_url", sa.String(2000)))
    op.add_column("resources", sa.Column("source_title", sa.String(500)))
    op.add_column("resources", sa.Column("originality_score", sa.Float()))
    op.add_column("resources", sa.Column("generated_content", sa.Text()))
    op.add_column(
        "resources",
        sa.Column(
            "processing_status",
            processing_status_enum,
            nullable=False,
            server_default="CRAWLED",
        ),
    )

    # Backfill: anything already in the table predates this pipeline and was
    # stored as raw scraped metadata — mark it CRAWLED (not publishable)
    # rather than assuming it was ever humanized.
    op.execute("UPDATE resources SET source_url = course_url, source_title = title WHERE source_url IS NULL")

    op.create_index(
        "ix_resources_processing_status", "resources", ["processing_status", "is_active"],
    )


def downgrade() -> None:
    op.drop_index("ix_resources_processing_status", table_name="resources")
    op.drop_column("resources", "processing_status")
    op.drop_column("resources", "generated_content")
    op.drop_column("resources", "originality_score")
    op.drop_column("resources", "source_title")
    op.drop_column("resources", "source_url")
    op.execute("DROP TYPE IF EXISTS processingstatus")
