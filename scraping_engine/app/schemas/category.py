from pydantic import BaseModel
from datetime import datetime


class CategoryBase(BaseModel):
    name: str
    slug: str
    description: str | None = None
    icon: str | None = None
    color: str | None = None
    is_active: bool = True


class CategoryCreate(CategoryBase):
    pass


class CategoryResponse(CategoryBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
