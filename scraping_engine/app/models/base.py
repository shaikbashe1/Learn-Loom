from datetime import datetime
from sqlalchemy import DateTime, func
from sqlalchemy.orm import mapped_column, Mapped
from app.database.base import Base  # noqa: F401 — re-exported for models


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
