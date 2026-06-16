from sqlalchemy import String, Text, Boolean, Integer
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.database.base import Base
from app.models.base import TimestampMixin


class Source(Base, TimestampMixin):
    __tablename__ = "sources"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    base_url: Mapped[str] = mapped_column(String(500), unique=True, nullable=False)
    spider_name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    logo_url: Mapped[str | None] = mapped_column(String(500))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    requires_js: Mapped[bool] = mapped_column(Boolean, default=False)
    scrape_interval_hours: Mapped[int] = mapped_column(Integer, default=24)
    last_scraped_at: Mapped[str | None] = mapped_column(String(50))
    total_resources: Mapped[int] = mapped_column(Integer, default=0)

    resources: Mapped[list["Resource"]] = relationship(back_populates="source")  # noqa: F821
    scraping_logs: Mapped[list["ScrapingLog"]] = relationship(back_populates="source")  # noqa: F821
