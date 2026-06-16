"""
Knowledge extraction layer for the autonomous course-generation pipeline.

Hard rule enforced here: this module NEVER persists or returns raw scraped
text. It reads Resource rows (title/description/tags — already short
metadata per the compliance pipeline), and reduces them further into
structured facts: concepts, definitions, skills, technologies, and
applications. The original sentences are read only transiently in-memory
to extract these facts and are discarded immediately after.

Source gating: only resources whose Source passed the compliance gate
(is_active=True, which itself is only ever set True for sources with
ApprovalStatus.APPROVED — see compliance_service.py) are eligible input.
"""
import re
from dataclasses import dataclass, field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import Resource, Source, Category
from app.core.logging import logger


@dataclass
class ConceptFact:
    """A single distilled fact — never a copied sentence."""
    concept: str
    kind: str  # "concept" | "skill" | "technology" | "best_practice" | "application"
    category_slug: str
    source_count: int = 1
    related_terms: set[str] = field(default_factory=set)


# Lightweight keyword taxonomy per category — used to classify extracted
# noun phrases into concept/skill/technology buckets without ever quoting
# the source sentence they were found near.
SKILL_MARKERS = {"how to", "implement", "build", "deploy", "configure", "debug", "optimize", "test"}
TECH_MARKERS = {
    "python", "java", "docker", "kubernetes", "react", "node", "mongodb", "express",
    "aws", "azure", "gcp", "tensorflow", "pytorch", "git", "jenkins", "terraform",
}
BEST_PRACTICE_MARKERS = {"best practice", "recommended", "should always", "avoid", "anti-pattern", "convention"}


def _tokenize_concepts(text: str) -> list[str]:
    """Pull short noun-phrase-like tokens (2-4 words) — not sentences."""
    text = re.sub(r"[^\w\s-]", " ", text.lower())
    words = [w for w in text.split() if len(w) > 2]
    phrases = set()
    for n in (1, 2, 3):
        for i in range(len(words) - n + 1):
            phrase = " ".join(words[i:i + n])
            if 3 <= len(phrase) <= 40:
                phrases.add(phrase)
    return list(phrases)


def _classify(phrase: str) -> str:
    if phrase in TECH_MARKERS or any(t in phrase for t in TECH_MARKERS):
        return "technology"
    if any(m in phrase for m in SKILL_MARKERS):
        return "skill"
    if any(m in phrase for m in BEST_PRACTICE_MARKERS):
        return "best_practice"
    return "concept"


class KnowledgeExtractionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def extract_for_category(self, category_slug: str, limit: int = 200) -> list[ConceptFact]:
        """
        Reads resources for a category from allow-listed sources ONLY, extracts
        structured facts, and returns them. Title/description text is read
        in-memory here and never stored or returned verbatim — only the
        derived ConceptFact list survives this function.

        Filters on Source.spider_name IN strict allow-list explicitly, in
        addition to is_active — defense in depth so this never accidentally
        reads from a non-allow-listed source even if `is_active` drifts.
        """
        from app.services.compliance_service import STRICT_ALLOWED_SPIDERS

        stmt = (
            select(Resource.title, Resource.description, Resource.author)
            .join(Source, Resource.source_id == Source.id)
            .join(Category, Resource.category_id == Category.id)
            .where(
                Category.slug == category_slug,
                Source.is_active == True,
                Source.spider_name.in_(STRICT_ALLOWED_SPIDERS),
                Resource.is_active == True,
            )
            .limit(limit)
        )
        rows = (await self.db.execute(stmt)).all()

        if not rows:
            logger.info("No approved-source resources found for category=%s", category_slug)
            return []

        fact_map: dict[str, ConceptFact] = {}

        for title, description, _author in rows:
            raw_text = f"{title or ''} {description or ''}"
            phrases = _tokenize_concepts(raw_text)
            # raw_text goes out of scope here — nothing from it is stored beyond the phrases below

            for phrase in phrases:
                kind = _classify(phrase)
                if phrase in fact_map:
                    fact_map[phrase].source_count += 1
                else:
                    fact_map[phrase] = ConceptFact(
                        concept=phrase, kind=kind, category_slug=category_slug
                    )

        # Keep only facts corroborated by 2+ distinct source mentions OR
        # exact technology/skill matches — single-mention noise is dropped.
        facts = [
            f for f in fact_map.values()
            if f.source_count >= 2 or f.kind in ("technology", "skill")
        ]
        facts.sort(key=lambda f: (-f.source_count, f.concept))

        logger.info(
            "Extracted %d distilled concept facts for category=%s from %d resources",
            len(facts), category_slug, len(rows),
        )
        return facts[:100]
