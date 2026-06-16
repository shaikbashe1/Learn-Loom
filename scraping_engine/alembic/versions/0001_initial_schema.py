"""Initial schema with all core tables and full-text search trigger.

Revision ID: 0001
Revises:
Create Date: 2024-01-01 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── categories ──────────────────────────────────────────────────────────
    op.create_table(
        "categories",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("slug", sa.String(120), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("icon", sa.String(255)),
        sa.Column("color", sa.String(20)),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_categories"),
        sa.UniqueConstraint("name", name="uq_categories_name"),
        sa.UniqueConstraint("slug", name="uq_categories_slug"),
    )
    op.create_index("ix_categories_id", "categories", ["id"])
    op.create_index("ix_categories_name", "categories", ["name"])
    op.create_index("ix_categories_slug", "categories", ["slug"])

    # ── sources ─────────────────────────────────────────────────────────────
    op.create_table(
        "sources",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("base_url", sa.String(500), nullable=False),
        sa.Column("spider_name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("logo_url", sa.String(500)),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("requires_js", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("scrape_interval_hours", sa.Integer(), nullable=False, server_default="24"),
        sa.Column("last_scraped_at", sa.String(50)),
        sa.Column("total_resources", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_sources"),
        sa.UniqueConstraint("name", name="uq_sources_name"),
        sa.UniqueConstraint("base_url", name="uq_sources_base_url"),
    )

    # ── tags ────────────────────────────────────────────────────────────────
    op.create_table(
        "tags",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("slug", sa.String(120), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_tags"),
        sa.UniqueConstraint("name", name="uq_tags_name"),
        sa.UniqueConstraint("slug", name="uq_tags_slug"),
    )
    op.create_index("ix_tags_id", "tags", ["id"])
    op.create_index("ix_tags_name", "tags", ["name"])

    # ── resources ───────────────────────────────────────────────────────────
    difficulty_enum = postgresql.ENUM(
        "beginner", "intermediate", "advanced",
        name="difficultylevel", create_type=True,
    )
    resource_type_enum = postgresql.ENUM(
        "course", "article", "documentation", "video", "tutorial", "book",
        name="resourcetype", create_type=True,
    )

    op.create_table(
        "resources",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("author", sa.String(255)),
        sa.Column("course_url", sa.String(2000), nullable=False),
        sa.Column("thumbnail_url", sa.String(2000)),
        sa.Column("duration", sa.String(100)),
        sa.Column("last_updated", sa.String(100)),
        sa.Column("resource_type", resource_type_enum, nullable=False, server_default="course"),
        sa.Column("difficulty", difficulty_enum, nullable=False, server_default="beginner"),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.Column("source_id", sa.Integer(), nullable=False),
        sa.Column("view_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("rating", sa.Float()),
        sa.Column("content_hash", sa.String(64)),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("search_vector", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"], name="fk_resources_category_id_categories"),
        sa.ForeignKeyConstraint(["source_id"], ["sources.id"], name="fk_resources_source_id_sources"),
        sa.PrimaryKeyConstraint("id", name="pk_resources"),
        sa.UniqueConstraint("course_url", name="uq_resources_course_url"),
        sa.UniqueConstraint("content_hash", name="uq_resources_content_hash"),
    )
    op.create_index("ix_resources_id", "resources", ["id"])
    op.create_index("ix_resources_category_id", "resources", ["category_id"])
    op.create_index("ix_resources_source_id", "resources", ["source_id"])
    op.create_index("ix_resources_content_hash", "resources", ["content_hash"])
    op.create_index("ix_resources_category_difficulty", "resources", ["category_id", "difficulty"])
    op.create_index("ix_resources_source_active", "resources", ["source_id", "is_active"])

    # Full-text search index using GIN
    op.execute("""
        ALTER TABLE resources ADD COLUMN IF NOT EXISTS fts_vector tsvector
        GENERATED ALWAYS AS (
            to_tsvector('english',
                coalesce(title, '') || ' ' ||
                coalesce(description, '') || ' ' ||
                coalesce(author, '')
            )
        ) STORED
    """)
    op.execute("CREATE INDEX ix_resources_fts ON resources USING GIN(fts_vector)")

    # ── resource_tags ────────────────────────────────────────────────────────
    op.create_table(
        "resource_tags",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("resource_id", sa.Integer(), nullable=False),
        sa.Column("tag_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["resource_id"], ["resources.id"], name="fk_resource_tags_resource_id_resources"),
        sa.ForeignKeyConstraint(["tag_id"], ["tags.id"], name="fk_resource_tags_tag_id_tags"),
        sa.PrimaryKeyConstraint("id", name="pk_resource_tags"),
        sa.UniqueConstraint("resource_id", "tag_id", name="uq_resource_tag"),
    )

    # ── scraping_logs ────────────────────────────────────────────────────────
    job_status_enum = postgresql.ENUM(
        "pending", "running", "completed", "failed", "partial",
        name="jobstatus", create_type=True,
    )
    op.create_table(
        "scraping_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("job_id", sa.String(100), nullable=False),
        sa.Column("source_id", sa.Integer()),
        sa.Column("spider_name", sa.String(100), nullable=False),
        sa.Column("status", job_status_enum, nullable=False, server_default="pending"),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column("items_scraped", sa.Integer(), server_default="0"),
        sa.Column("items_saved", sa.Integer(), server_default="0"),
        sa.Column("items_duplicate", sa.Integer(), server_default="0"),
        sa.Column("items_failed", sa.Integer(), server_default="0"),
        sa.Column("error_message", sa.Text()),
        sa.Column("metadata_json", sa.Text()),
        sa.ForeignKeyConstraint(["source_id"], ["sources.id"], name="fk_scraping_logs_source_id_sources"),
        sa.PrimaryKeyConstraint("id", name="pk_scraping_logs"),
        sa.UniqueConstraint("job_id", name="uq_scraping_logs_job_id"),
    )
    op.create_index("ix_scraping_logs_job_id", "scraping_logs", ["job_id"])


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_resources_fts")
    op.drop_table("scraping_logs")
    op.drop_table("resource_tags")
    op.drop_table("resources")
    op.drop_table("tags")
    op.drop_table("sources")
    op.drop_table("categories")
    op.execute("DROP TYPE IF EXISTS jobstatus")
    op.execute("DROP TYPE IF EXISTS resourcetype")
    op.execute("DROP TYPE IF EXISTS difficultylevel")
