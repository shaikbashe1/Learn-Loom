"""
Originality + copyright safety validation.

Runs AFTER course content is authored, BEFORE publication. Compares every
generated text block against the stored source metadata (titles/short
descriptions only — that's all this system ever retains) using sliding
n-gram overlap and sequence similarity. This catches accidental near-copies
that might slip through authoring (e.g. a generated example that happens to
mirror a source's wording).

This is a safety net, not the primary originality mechanism — the primary
mechanism is that authoring is instructed to synthesize from extracted
ConceptFacts, never from source sentences (those are never even passed to
the authoring step — see knowledge_extraction.py).
"""
import re
from dataclasses import dataclass
from difflib import SequenceMatcher
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import Resource, Source, Category
from app.core.logging import logger

SIMILARITY_FAIL_THRESHOLD = 0.55   # sequence-matcher ratio above this = suspect
NGRAM_SIZE = 8                      # an 8-word run matching a source verbatim is a hard fail
MAX_RESOURCES_CHECKED = 300


@dataclass
class ValidationFinding:
    section: str
    issue: str
    similarity: float
    matched_against: str


@dataclass
class ValidationReport:
    passed: bool
    findings: list[ValidationFinding]

    @property
    def status_label(self) -> str:
        return "SAFE_TO_PUBLISH" if self.passed else "REVIEW_REQUIRED"


def _ngrams(text: str, n: int) -> set[str]:
    words = re.sub(r"[^\w\s]", " ", text.lower()).split()
    return {" ".join(words[i:i + n]) for i in range(len(words) - n + 1)}


class OriginalityValidator:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _source_corpus(self, category_slug: str) -> list[tuple[str, str]]:
        """(label, text) pairs of the short metadata this system actually stores."""
        from app.services.compliance_service import STRICT_ALLOWED_SPIDERS

        stmt = (
            select(Resource.title, Resource.description, Source.name)
            .join(Source, Resource.source_id == Source.id)
            .join(Category, Resource.category_id == Category.id)
            .where(
                Category.slug == category_slug,
                Source.is_active == True,
                Source.spider_name.in_(STRICT_ALLOWED_SPIDERS),
            )
            .limit(MAX_RESOURCES_CHECKED)
        )
        rows = (await self.db.execute(stmt)).all()
        corpus = []
        for title, description, source_name in rows:
            if title:
                corpus.append((f"{source_name}: title", title))
            if description:
                corpus.append((f"{source_name}: description", description))
        return corpus

    async def validate_course(self, category_slug: str, sections: dict[str, str]) -> ValidationReport:
        """
        `sections` maps a human label (e.g. "module_01.lesson_2.explanation")
        to the generated text for that section.
        """
        corpus = await self._source_corpus(category_slug)
        findings: list[ValidationFinding] = []

        for section_label, generated_text in sections.items():
            if not generated_text or not generated_text.strip():
                continue

            gen_ngrams = _ngrams(generated_text, NGRAM_SIZE)

            for source_label, source_text in corpus:
                # Hard fail: any verbatim N-word run shared with a source
                if gen_ngrams and gen_ngrams & _ngrams(source_text, NGRAM_SIZE):
                    findings.append(ValidationFinding(
                        section=section_label,
                        issue=f"Verbatim {NGRAM_SIZE}-word phrase match",
                        similarity=1.0,
                        matched_against=source_label,
                    ))
                    continue

                # Soft fail: overall sequence similarity above threshold
                ratio = SequenceMatcher(None, generated_text.lower(), source_text.lower()).ratio()
                if ratio >= SIMILARITY_FAIL_THRESHOLD:
                    findings.append(ValidationFinding(
                        section=section_label,
                        issue="High sequence similarity to source metadata",
                        similarity=round(ratio, 3),
                        matched_against=source_label,
                    ))

        passed = len(findings) == 0
        if not passed:
            logger.warning(
                "Originality validation FAILED for category=%s — %d finding(s)",
                category_slug, len(findings),
            )
        else:
            logger.info("Originality validation passed for category=%s", category_slug)

        return ValidationReport(passed=passed, findings=findings)
