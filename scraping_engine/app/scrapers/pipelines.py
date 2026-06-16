"""
Scrapy item pipelines.
Runs in order: Validation → Duplicate → Classification → Database

Compliance note: this pipeline enforces "metadata only, never full content"
at the data layer, as a second line of defense behind the spiders themselves
(which already only extract title/meta-description/author, never article body
HTML). DESCRIPTION_MAX_CHARS caps any description field that somehow contains
more than a short summary, and PII patterns are stripped from every text
field before persistence.
"""
import re
import asyncio
from itemadapter import ItemAdapter
from scrapy.exceptions import DropItem

from app.services.classifier import (
    ContentClassifier,
    compute_content_hash,
    is_duplicate,
)
from app.core.logging import logger

DESCRIPTION_MAX_CHARS = 500  # summary only — never store full article/course bodies

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
PHONE_RE = re.compile(r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{3,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b")


def scrub_pii(text: str | None) -> str | None:
    """Strip email addresses and phone-number-like sequences from free text."""
    if not text:
        return text
    text = EMAIL_RE.sub("[redacted-email]", text)
    text = PHONE_RE.sub("[redacted-phone]", text)
    return text


class ValidationPipeline:
    REQUIRED_FIELDS = ["title", "course_url", "source_id"]

    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        for field in self.REQUIRED_FIELDS:
            if not adapter.get(field):
                raise DropItem(f"Missing required field: {field} in {dict(item)}")

        # Clean whitespace
        for field in ["title", "description", "author"]:
            if adapter.get(field):
                adapter[field] = str(adapter[field]).strip()

        # PII scrubbing — never persist emails/phone numbers scraped incidentally
        # from author bylines or page text (requirement: no PII collection)
        for field in ["title", "description", "author"]:
            if adapter.get(field):
                adapter[field] = scrub_pii(adapter[field])

        # Cap description length — metadata/summary only, never full content
        if adapter.get("description") and len(adapter["description"]) > DESCRIPTION_MAX_CHARS:
            adapter["description"] = adapter["description"][:DESCRIPTION_MAX_CHARS].rsplit(" ", 1)[0] + "…"

        # Ensure URL has scheme
        url = adapter.get("course_url", "")
        if url and not url.startswith("http"):
            adapter["course_url"] = f"https://{url}"

        return item


class DuplicatePipeline:
    def __init__(self):
        self._seen_hashes: set[str] = set()
        self._seen_urls: set[str] = set()

    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        url = adapter.get("course_url", "")
        title = adapter.get("title", "")

        content_hash = compute_content_hash(url, title)
        adapter["content_hash"] = content_hash

        if content_hash in self._seen_hashes:
            raise DropItem(f"In-memory duplicate (hash): {url}")

        if url in self._seen_urls:
            raise DropItem(f"In-memory duplicate (url): {url}")

        self._seen_hashes.add(content_hash)
        self._seen_urls.add(url)
        return item


class ClassificationPipeline:
    def __init__(self):
        self.classifier = ContentClassifier()
        self.category_slugs = [
            "python", "java", "data-structures", "advanced-dsa",
            "full-stack", "mern-stack", "ai-ml", "cyber-security",
            "cloud-computing", "devops",
        ]

    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        title = adapter.get("title", "")
        description = adapter.get("description", "") or ""

        # Only classify if category not already set by spider
        if not adapter.get("category_slug"):
            loop = asyncio.new_event_loop()
            result = loop.run_until_complete(
                self.classifier.classify(
                    title=title,
                    description=description,
                    url=adapter.get("course_url", ""),
                    category_slugs=self.category_slugs,
                )
            )
            loop.close()

            adapter["category_slug"] = result["category_slug"]
            adapter["difficulty"] = result["difficulty"]
            adapter["resource_type"] = result["resource_type"]
            adapter["tags"] = result["tags"]

        return item


class DatabasePipeline:
    """Persist items to PostgreSQL via sync SQLAlchemy (Scrapy is sync)."""

    def __init__(self):
        self._engine = None
        self._Session = None

    def open_spider(self, spider):
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        from app.core.config import settings

        self._engine = create_engine(settings.SYNC_DATABASE_URL, pool_pre_ping=True)
        self._Session = sessionmaker(bind=self._engine, autoflush=False, autocommit=False)

    def close_spider(self, spider):
        if self._engine:
            self._engine.dispose()

    def process_item(self, item, spider):
        from app.models import Resource, Category, Source, Tag, ResourceTag
        from sqlalchemy import select

        adapter = ItemAdapter(item)
        session = self._Session()

        try:
            # Resolve category
            cat = session.execute(
                select(Category).where(Category.slug == adapter.get("category_slug"))
            ).scalar_one_or_none()
            if not cat:
                cat = session.execute(select(Category).limit(1)).scalar_one_or_none()
            if not cat:
                raise DropItem("No category found")

            # Dedup by URL in DB
            existing = session.execute(
                select(Resource).where(Resource.course_url == adapter["course_url"])
            ).scalar_one_or_none()
            if existing:
                raise DropItem(f"DB duplicate: {adapter['course_url']}")

            resource = Resource(
                title=adapter["title"],
                description=adapter.get("description"),
                author=adapter.get("author"),
                course_url=adapter["course_url"],
                thumbnail_url=adapter.get("thumbnail_url"),
                duration=adapter.get("duration"),
                last_updated=adapter.get("last_updated"),
                resource_type=adapter.get("resource_type"),
                difficulty=adapter.get("difficulty"),
                category_id=cat.id,
                source_id=adapter["source_id"],
                content_hash=adapter.get("content_hash"),
            )
            session.add(resource)
            session.flush()

            for tag_name in (adapter.get("tags") or []):
                slug = tag_name.lower().replace(" ", "-")
                tag = session.execute(select(Tag).where(Tag.slug == slug)).scalar_one_or_none()
                if not tag:
                    tag = Tag(name=tag_name, slug=slug)
                    session.add(tag)
                    session.flush()
                session.add(ResourceTag(resource_id=resource.id, tag_id=tag.id))

            session.commit()
            logger.info("Saved resource: %s", adapter["title"][:80])
        except DropItem:
            session.rollback()
            raise
        except Exception as exc:
            session.rollback()
            logger.error("DB pipeline error: %s", exc)
            raise DropItem(f"DB error: {exc}")
        finally:
            session.close()

        return item
