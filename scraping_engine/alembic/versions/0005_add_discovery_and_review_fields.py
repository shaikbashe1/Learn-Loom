"""Add topic/quality/readability/review fields and PUBLISHED status.

Revision ID: 0005
Revises: 0004
Create Date: 2026-06-16 02:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ALTER TYPE ... ADD VALUE must run outside the implicit transaction Alembic
    # wraps migrations in, on PostgreSQL < 12 / some pooled connections — if this
    # statement fails with "ALTER TYPE ... cannot run inside a transaction block",
    # run it manually once via `psql` before re-running this migration.
    op.execute("ALTER TYPE processingstatus ADD VALUE IF NOT EXISTS 'PUBLISHED'")

    op.add_column("resources", sa.Column("quality_score", sa.Float()))
    op.add_column("resources", sa.Column("readability_score", sa.Float()))
    op.add_column("resources", sa.Column("topic", sa.String(100)))
    op.add_column("resources", sa.Column("reviewed_by", sa.String(150)))
    op.add_column("resources", sa.Column("reviewed_at", sa.String(50)))

    op.create_index("ix_resources_topic", "resources", ["topic"])


def downgrade() -> None:
    op.drop_index("ix_resources_topic", table_name="resources")
    op.drop_column("resources", "reviewed_at")
    op.drop_column("resources", "reviewed_by")
    op.drop_column("resources", "topic")
    op.drop_column("resources", "readability_score")
    op.drop_column("resources", "quality_score")
    # Note: PostgreSQL cannot drop a single enum value; downgrading PUBLISHED
    # would require recreating the type. Left as a manual step if ever needed.
