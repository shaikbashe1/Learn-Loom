"""
Seed default scraping sources into the database.

IMPORTANT: `is_active` is derived from the compliance registry
(app/services/compliance_service.py), NOT hardcoded to True. A source whose
ToS review is "rejected" or "pending_review" is seeded with is_active=False
so it cannot be scraped even if someone calls POST /scrape/start without
filters. Flipping is_active to True manually does NOT bypass the compliance
gate in ScrapingService — that gate is re-checked at scrape time regardless.

Run: python scripts/seed_sources.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select
from app.models import Source
from app.database.base import Base
from app.core.config import settings
from app.services.compliance_service import STRICT_ALLOWED_SPIDERS

SOURCES = [
    {
        "name": "freeCodeCamp",
        "base_url": "https://www.freecodecamp.org",
        "spider_name": "freecodecamp",
        "description": "Free coding tutorials and articles",
        "requires_js": False,
    },
    {
        "name": "MIT OpenCourseWare",
        "base_url": "https://ocw.mit.edu",
        "spider_name": "mit_ocw",
        "description": "Free MIT university courses",
        "requires_js": False,
    },
    {
        "name": "GeeksForGeeks",
        "base_url": "https://www.geeksforgeeks.org",
        "spider_name": "geeksforgeeks",
        "description": "CS tutorials, DSA, and interview prep",
        "requires_js": False,
    },
    {
        "name": "Khan Academy",
        "base_url": "https://www.khanacademy.org",
        "spider_name": "khan_academy",
        "description": "Free computing and programming courses",
        "requires_js": True,
    },
    {
        "name": "W3Schools",
        "base_url": "https://www.w3schools.com",
        "spider_name": "w3schools",
        "description": "Web development and programming references",
        "requires_js": False,
    },
    {
        "name": "DevDocs",
        "base_url": "https://devdocs.io",
        "spider_name": "devdocs",
        "description": "Aggregated programming documentation",
        "requires_js": False,
    },
    {
        "name": "MDN Web Docs",
        "base_url": "https://developer.mozilla.org",
        "spider_name": "mdn",
        "description": "Web platform, HTML/CSS/JavaScript documentation (CC-BY-SA)",
        "requires_js": False,
    },
    {
        "name": "Kubernetes Documentation",
        "base_url": "https://kubernetes.io",
        "spider_name": "kubernetes_docs",
        "description": "Official Kubernetes concept documentation (CC BY 4.0)",
        "requires_js": False,
    },
    {
        "name": "Microsoft Learn",
        "base_url": "https://learn.microsoft.com",
        "spider_name": "microsoft_learn",
        "description": "Microsoft Learn training content — ToS prohibits redistribution, REJECTED",
        "requires_js": False,
    },
    {
        "name": "Python Documentation",
        "base_url": "https://docs.python.org",
        "spider_name": "python_docs",
        "description": "Official Python documentation — license not yet verified, PENDING_REVIEW",
        "requires_js": False,
    },
    {
        "name": "Node.js Documentation",
        "base_url": "https://nodejs.org",
        "spider_name": "nodejs_docs",
        "description": "Official Node.js documentation — robots.txt path ambiguity, PENDING_REVIEW",
        "requires_js": False,
    },
    {
        "name": "React Documentation",
        "base_url": "https://react.dev",
        "spider_name": "react_docs",
        "description": "Official React documentation — license not yet verified, PENDING_REVIEW",
        "requires_js": False,
    },
    {
        "name": "TypeScript Documentation",
        "base_url": "https://www.typescriptlang.org",
        "spider_name": "typescript_docs",
        "description": "Official TypeScript documentation — license not yet verified, PENDING_REVIEW",
        "requires_js": False,
    },
    {
        "name": "PostgreSQL Documentation",
        "base_url": "https://www.postgresql.org",
        "spider_name": "postgresql_docs",
        "description": "Official PostgreSQL documentation — license not yet verified, PENDING_REVIEW",
        "requires_js": False,
    },
    {
        "name": "MongoDB Documentation",
        "base_url": "https://www.mongodb.com",
        "spider_name": "mongodb_docs",
        "description": "Official MongoDB documentation — not yet reviewed, PENDING_REVIEW",
        "requires_js": False,
    },
    {
        "name": "Express.js Documentation",
        "base_url": "https://expressjs.com",
        "spider_name": "express_docs",
        "description": "Official Express.js documentation — not yet reviewed, PENDING_REVIEW",
        "requires_js": False,
    },
    {
        "name": "Next.js Documentation",
        "base_url": "https://nextjs.org",
        "spider_name": "nextjs_docs",
        "description": "Official Next.js documentation — not yet reviewed, PENDING_REVIEW",
        "requires_js": False,
    },
    {
        "name": "Docker Documentation",
        "base_url": "https://docs.docker.com",
        "spider_name": "docker_docs",
        "description": "Official Docker documentation — not yet reviewed, PENDING_REVIEW",
        "requires_js": False,
    },
    {
        "name": "AWS Documentation",
        "base_url": "https://docs.aws.amazon.com",
        "spider_name": "aws_docs",
        "description": "Official AWS documentation — AWS site terms likely restrict scraping, PENDING_REVIEW",
        "requires_js": False,
    },
    {
        "name": "Azure Documentation",
        "base_url": "https://learn.microsoft.com",
        "spider_name": "azure_docs",
        "description": "Azure docs on learn.microsoft.com — same ToS as Microsoft Learn, REJECTED",
        "requires_js": False,
    },
]


async def seed():
    engine = create_async_engine(settings.DATABASE_URL)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with Session() as session:
        for data in SOURCES:
            is_active = data["spider_name"] in STRICT_ALLOWED_SPIDERS
            data = {**data, "is_active": is_active}

            exists = (
                await session.execute(select(Source).where(Source.spider_name == data["spider_name"]))
            ).scalar_one_or_none()

            if not exists:
                session.add(Source(**data))
                status = "ACTIVE (compliance approved)" if is_active else "INACTIVE (blocked/pending review)"
                print(f"  + Added source: {data['name']} — {status}")
            else:
                exists.is_active = is_active
                print(f"  ~ Synced: {data['name']} — is_active={is_active}")

        await session.commit()

    await engine.dispose()
    print("\nSeeding complete. Run GET /api/v1/compliance/logs to see full review notes per source.")


if __name__ == "__main__":
    asyncio.run(seed())
