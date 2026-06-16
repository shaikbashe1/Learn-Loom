from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import Category
from app.database.redis import cache_get, cache_set
from app.core.config import settings


class CategoryService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self, active_only: bool = True) -> List[Category]:
        cache_key = f"categories:all:{active_only}"
        cached = await cache_get(cache_key)
        if cached:
            return cached

        stmt = select(Category).order_by(Category.name)
        if active_only:
            stmt = stmt.where(Category.is_active == True)
        result = await self.db.execute(stmt)
        categories = list(result.scalars().all())

        await cache_set(cache_key, categories, settings.CACHE_TTL_CATEGORIES)
        return categories

    async def get_by_slug(self, slug: str) -> Optional[Category]:
        result = await self.db.execute(
            select(Category).where(Category.slug == slug)
        )
        return result.scalar_one_or_none()

    async def seed_defaults(self):
        defaults = [
            {"name": "Python", "slug": "python", "color": "#3776AB", "icon": "🐍"},
            {"name": "Java", "slug": "java", "color": "#ED8B00", "icon": "☕"},
            {"name": "Data Structures", "slug": "data-structures", "color": "#4CAF50", "icon": "🌲"},
            {"name": "Advanced DSA", "slug": "advanced-dsa", "color": "#FF5722", "icon": "⚡"},
            {"name": "Full Stack Development", "slug": "full-stack", "color": "#9C27B0", "icon": "🌐"},
            {"name": "MERN Stack", "slug": "mern-stack", "color": "#43A047", "icon": "🟢"},
            {"name": "AI & Machine Learning", "slug": "ai-ml", "color": "#00BCD4", "icon": "🤖"},
            {"name": "Cyber Security", "slug": "cyber-security", "color": "#F44336", "icon": "🔒"},
            {"name": "Cloud Computing", "slug": "cloud-computing", "color": "#2196F3", "icon": "☁️"},
            {"name": "DevOps", "slug": "devops", "color": "#FF9800", "icon": "🔧"},
        ]
        for d in defaults:
            existing = await self.db.execute(
                select(Category).where(Category.slug == d["slug"])
            )
            if not existing.scalar_one_or_none():
                self.db.add(Category(**d))
        await self.db.flush()
