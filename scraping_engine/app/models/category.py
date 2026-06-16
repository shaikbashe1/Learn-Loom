from sqlalchemy import String, Text
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.database.base import Base
from app.models.base import TimestampMixin


class Category(Base, TimestampMixin):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    icon: Mapped[str | None] = mapped_column(String(255))
    color: Mapped[str | None] = mapped_column(String(20))
    is_active: Mapped[bool] = mapped_column(default=True)

    resources: Mapped[list["Resource"]] = relationship(back_populates="category")  # noqa: F821
