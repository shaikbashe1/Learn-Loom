from sqlalchemy import String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.database.base import Base
from app.models.base import TimestampMixin


class Tag(Base, TimestampMixin):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)

    resource_tags: Mapped[list["ResourceTag"]] = relationship(back_populates="tag")  # noqa: F821


class ResourceTag(Base):
    __tablename__ = "resource_tags"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    resource_id: Mapped[int] = mapped_column(ForeignKey("resources.id"), nullable=False)
    tag_id: Mapped[int] = mapped_column(ForeignKey("tags.id"), nullable=False)

    resource: Mapped["Resource"] = relationship(back_populates="resource_tags")  # noqa: F821
    tag: Mapped[Tag] = relationship(back_populates="resource_tags")

    __table_args__ = (UniqueConstraint("resource_id", "tag_id", name="uq_resource_tag"),)
