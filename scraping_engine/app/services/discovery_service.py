"""
Domain Discovery Service.

SCOPING NOTE — read before extending this: "discovery" here means
periodically deciding which ALREADY-APPROVED sources are due for a fresh
crawl (based on each Source.scrape_interval_hours and last_scraped_at),
not autonomously crawling the open web to find brand-new domains. This is
a deliberate choice, not a missing feature: this engine's entire
compliance model is a hardcoded allow-list (STRICT_ALLOWED_SPIDERS in
app/services/compliance_service.py) that a human only widens after a real
robots.txt + ToS/license review. Autonomously discovering and crawling
unknown domains would either (a) bypass that review entirely, which is
the one thing this codebase has been built around never doing, or (b)
require a human in the loop per new domain anyway — at which point it's
not really "automatic" discovery. If true open-web source discovery is
wanted, it should feed a queue of CANDIDATE sources for manual compliance
review (see compliance/COMPLIANCE_REPORT-style writeups elsewhere in this
project), never a direct path to crawling.
"""
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models import Source
from app.services.compliance_service import is_strictly_allowed
from app.core.logging import logger


def find_sources_due_for_crawl(session: Session) -> list[Source]:
    """
    Returns active, allow-listed sources whose last crawl is older than
    their configured scrape_interval_hours (or have never been crawled).
    """
    sources = session.execute(
        select(Source).where(Source.is_active == True)
    ).scalars().all()

    due = []
    now = datetime.now(timezone.utc)

    for source in sources:
        if not is_strictly_allowed(source.spider_name):
            # Defense in depth — is_active should already prevent this,
            # but the allow-list is the real authority, not the DB flag.
            logger.warning(
                "Source %s (id=%d) is is_active=True but NOT on the strict "
                "allow-list — skipping. Check scripts/seed_sources.py sync.",
                source.spider_name, source.id,
            )
            continue

        if not source.last_scraped_at:
            due.append(source)
            continue

        try:
            last_scraped = datetime.fromisoformat(source.last_scraped_at)
        except ValueError:
            due.append(source)
            continue

        interval = timedelta(hours=source.scrape_interval_hours or 24)
        if now - last_scraped >= interval:
            due.append(source)

    return due
