from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, text
from sqlalchemy.orm import selectinload

from app.models import Resource, Category, Source, Tag, ResourceTag
from app.models.resource import DifficultyLevel, ResourceType, ProcessingStatus
from app.schemas.resource import ResourceCreate, ResourceFilter
from app.database.redis import cache_get, cache_set, cache_delete_pattern
from app.core.config import settings
from app.core.logging import logger


class ResourceService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, resource_id: int) -> Optional[Resource]:
        cache_key = f"resource:{resource_id}"
        cached = await cache_get(cache_key)
        if cached:
            return cached

        stmt = (
            select(Resource)
            .where(
                Resource.id == resource_id,
                Resource.is_active == True,
                Resource.processing_status == ProcessingStatus.PUBLISHED,
            )
            .options(
                selectinload(Resource.category),
                selectinload(Resource.source),
                selectinload(Resource.resource_tags).selectinload(ResourceTag.tag),
            )
        )
        result = await self.db.execute(stmt)
        resource = result.scalar_one_or_none()

        if resource:
            # increment view count
            resource.view_count += 1
            await self.db.flush()
            await cache_set(cache_key, resource, settings.CACHE_TTL_RESOURCES)

        return resource

    async def list_resources(self, filters: ResourceFilter) -> Tuple[List[Resource], int]:
        cache_key = f"resources:list:{filters.model_dump_json()}"
        cached = await cache_get(cache_key)
        if cached:
            return cached["items"], cached["total"]

        # Hard gate: never serve anything that hasn't cleared humanization +
        # the originality check. This is not optional/configurable per-call.
        conditions = [
            Resource.is_active == True,
            Resource.processing_status == ProcessingStatus.PUBLISHED,
        ]

        if filters.category_id:
            conditions.append(Resource.category_id == filters.category_id)
        if filters.difficulty:
            conditions.append(Resource.difficulty == filters.difficulty)
        if filters.source_id:
            conditions.append(Resource.source_id == filters.source_id)
        if filters.resource_type:
            conditions.append(Resource.resource_type == filters.resource_type)
        if filters.tag:
            tag_subq = (
                select(ResourceTag.resource_id)
                .join(Tag)
                .where(Tag.slug == filters.tag)
            )
            conditions.append(Resource.id.in_(tag_subq))

        where_clause = and_(*conditions)

        count_stmt = select(func.count()).select_from(Resource).where(where_clause)
        total = (await self.db.execute(count_stmt)).scalar_one()

        offset = (filters.page - 1) * filters.page_size
        stmt = (
            select(Resource)
            .where(where_clause)
            .options(
                selectinload(Resource.category),
                selectinload(Resource.source),
                selectinload(Resource.resource_tags).selectinload(ResourceTag.tag),
            )
            .order_by(Resource.created_at.desc())
            .offset(offset)
            .limit(filters.page_size)
        )
        result = await self.db.execute(stmt)
        items = list(result.scalars().all())

        await cache_set(cache_key, {"items": items, "total": total}, settings.CACHE_TTL_RESOURCES)
        return items, total

    async def search(
        self, query: str, page: int = 1, page_size: int = 20
    ) -> Tuple[List[Resource], int]:
        cache_key = f"resources:search:{query}:{page}:{page_size}"
        cached = await cache_get(cache_key)
        if cached:
            return cached["items"], cached["total"]

        search_term = f"%{query.lower()}%"
        conditions = [
            Resource.is_active == True,
            Resource.processing_status == ProcessingStatus.PUBLISHED,
            or_(
                func.lower(Resource.title).like(search_term),
                func.lower(Resource.description).like(search_term),
                func.lower(Resource.author).like(search_term),
            ),
        ]

        count_stmt = select(func.count()).select_from(Resource).where(and_(*conditions))
        total = (await self.db.execute(count_stmt)).scalar_one()

        offset = (page - 1) * page_size
        stmt = (
            select(Resource)
            .where(and_(*conditions))
            .options(
                selectinload(Resource.category),
                selectinload(Resource.source),
                selectinload(Resource.resource_tags).selectinload(ResourceTag.tag),
            )
            .order_by(Resource.view_count.desc(), Resource.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        result = await self.db.execute(stmt)
        items = list(result.scalars().all())

        await cache_set(cache_key, {"items": items, "total": total}, 120)
        return items, total

    async def get_trending(self, limit: int = 10) -> List[Resource]:
        cache_key = f"resources:trending:{limit}"
        cached = await cache_get(cache_key)
        if cached:
            return cached

        stmt = (
            select(Resource)
            .where(
                Resource.is_active == True,
                Resource.processing_status == ProcessingStatus.PUBLISHED,
            )
            .options(
                selectinload(Resource.category),
                selectinload(Resource.source),
                selectinload(Resource.resource_tags).selectinload(ResourceTag.tag),
            )
            .order_by(Resource.view_count.desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        items = list(result.scalars().all())

        await cache_set(cache_key, items, settings.CACHE_TTL_TRENDING)
        return items

    async def create(self, data: ResourceCreate) -> Optional[Resource]:
        # Dedup by URL
        existing = await self.db.execute(
            select(Resource).where(Resource.course_url == data.course_url)
        )
        if existing.scalar_one_or_none():
            logger.info("Duplicate URL skipped: %s", data.course_url)
            return None

        resource = Resource(
            title=data.title,
            description=data.description,
            author=data.author,
            course_url=data.course_url,
            thumbnail_url=data.thumbnail_url,
            duration=data.duration,
            last_updated=data.last_updated,
            resource_type=data.resource_type,
            difficulty=data.difficulty,
            category_id=data.category_id,
            source_id=data.source_id,
        )
        self.db.add(resource)
        await self.db.flush()

        # Tags
        for tag_name in data.tags:
            tag = await self._get_or_create_tag(tag_name)
            self.db.add(ResourceTag(resource_id=resource.id, tag_id=tag.id))

        await cache_delete_pattern("resources:*")
        return resource

    async def get_course_package(self, resource_id: int) -> Optional[dict]:
        """
        Returns the structured course package built by
        app/processors/course_builder.py — the only place the full
        modules/lessons/quizzes/assignments/references JSON is exposed.
        Returns None for anything not PUBLISHED, same gate as
        every other read path in this service.
        """
        import json

        stmt = select(Resource.generated_content).where(
            Resource.id == resource_id,
            Resource.is_active == True,
            Resource.processing_status == ProcessingStatus.PUBLISHED,
        )
        result = await self.db.execute(stmt)
        raw = result.scalar_one_or_none()
        return json.loads(raw) if raw else None

    async def _get_or_create_tag(self, name: str) -> Tag:
        slug = name.lower().replace(" ", "-")
        result = await self.db.execute(select(Tag).where(Tag.slug == slug))
        tag = result.scalar_one_or_none()
        if not tag:
            tag = Tag(name=name, slug=slug)
            self.db.add(tag)
            await self.db.flush()
        return tag
