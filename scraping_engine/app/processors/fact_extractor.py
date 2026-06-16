"""
processors/fact_extractor.py

Stage 2 of the pipeline: Crawl -> Clean -> Extract Facts -> Humanize ->
Originality Check -> Save.

Takes ONE freshly crawled Resource and reduces its raw title/description
into structured facts: concepts, key terms, and candidate learning
objectives. This is the boundary past which raw scraped sentences must
never travel — everything downstream (humanizer.py, course_builder.py)
only ever sees the ExtractedFacts dataclass, never `resource.description`
again.

This module also performs the "Clean" step (stripping residual HTML
entities/whitespace from scraped text) since cleaning is a prerequisite
to extraction, not a separate consumer of the raw text.
"""
import re
import html
from dataclasses import dataclass, field

from app.services.classifier import (
    classify_category,
    classify_difficulty,
    classify_resource_type,
)

# General-purpose English stopwords removed before phrase detection — distinct
# from META_WORD_STOPLIST below, which removes meta-words ABOUT a resource
# rather than grammatical filler.
GENERIC_STOPWORDS = {
    "a", "an", "the", "of", "to", "for", "and", "or", "in", "on", "at", "by",
    "is", "are", "was", "were", "be", "been", "being", "it", "its", "as",
    "into", "onto", "through", "using", "use", "used", "via", "you", "we",
}

OBJECTIVE_VERBS = [
    "understand", "explain", "apply", "build", "implement", "analyze",
    "evaluate", "design", "debug", "configure", "compare", "describe",
]

# Meta-words ABOUT a resource (its format, its audience, generic course
# scaffolding language) rather than concepts IN it. extract_tags() from
# classifier.py is tuned for tag-cloud generation and lets these through;
# fact_extractor filters them out here because a course title or learning
# objective built from "introduction" or "covers" is nonsensical.
META_WORD_STOPLIST = {
    "introduction", "introductory", "course", "courses", "covers", "covering",
    "tutorial", "tutorials", "lesson", "lessons", "lecture", "lectures",
    "overview", "guide", "students", "learn", "learning", "study", "studies",
    "topic", "topics", "module", "modules", "basics", "fundamentals",
    "this", "these", "that", "with", "from", "your", "about",
}


@dataclass
class ExtractedFacts:
    source_title: str
    source_url: str
    key_terms: list[str] = field(default_factory=list)
    concepts: list[str] = field(default_factory=list)
    candidate_objectives: list[str] = field(default_factory=list)
    category_slug: str | None = None
    difficulty: str | None = None
    resource_type: str | None = None
    author: str | None = None


def clean_text(raw: str | None) -> str:
    """Strip HTML entities and normalize whitespace. The 'Clean' pipeline stage."""
    if not raw:
        return ""
    text = html.unescape(raw)
    text = re.sub(r"<[^>]+>", " ", text)          # strip any stray tags
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _extract_concept_phrases(text: str, max_phrases: int = 10) -> list[str]:
    """
    Detects concept phrases by removing stopwords/meta-words from the
    cleaned text and treating words that remain ADJACENT after removal as
    a single phrase. "Introduction to Linear Algebra" -> remove
    "introduction"/"to" -> "Linear" and "Algebra" are adjacent in what's
    left -> "linear algebra" is captured as one phrase, not two unrelated
    unigrams. This generalizes far beyond classifier.py's hardcoded
    multi-word list (which only knows specific pairs like "machine
    learning") without ever needing a curated phrase dictionary.
    """
    words = re.sub(r"[^\w\s-]", " ", text.lower()).split()

    phrases: list[str] = []
    current: list[str] = []

    def flush():
        if current:
            phrase = " ".join(current)
            if 3 <= len(phrase) <= 50:
                phrases.append(phrase)
            current.clear()

    for word in words:
        if len(word) <= 2 or word in GENERIC_STOPWORDS or word in META_WORD_STOPLIST:
            flush()
            continue
        current.append(word)
    flush()

    # Longer phrases (more specific concepts) first, then dedupe preserving order
    phrases.sort(key=len, reverse=True)
    seen, unique = set(), []
    for p in phrases:
        if p not in seen:
            seen.add(p)
            unique.append(p)
    return unique[:max_phrases]


def _build_objectives(concepts: list[str], category_slug: str | None) -> list[str]:
    objectives = []
    for i, concept in enumerate(concepts[:5]):
        verb = OBJECTIVE_VERBS[i % len(OBJECTIVE_VERBS)]
        objectives.append(f"{verb.capitalize()} {concept}")
    if not objectives and category_slug:
        objectives.append(f"Understand the fundamentals of {category_slug.replace('-', ' ')}")
    return objectives


def extract_facts(resource: dict) -> ExtractedFacts:
    """
    `resource` is a plain dict with at least: title, description, course_url.
    Optionally: author. Reads the raw text only in-memory here — the
    returned ExtractedFacts never carries a full sentence from the source,
    only short concept/term phrases and objective statements synthesized
    from them.
    """
    title = clean_text(resource.get("title"))
    description = clean_text(resource.get("description"))
    url = resource.get("course_url") or resource.get("source_url") or ""

    category_slug = classify_category(title, description)
    difficulty = classify_difficulty(title, description)
    resource_type = classify_resource_type(url, title)

    # Title phrases first (titles are denser with the actual subject than
    # descriptions), then description phrases not already captured.
    title_phrases = _extract_concept_phrases(title)
    description_phrases = _extract_concept_phrases(description)
    key_terms = title_phrases + [p for p in description_phrases if p not in title_phrases]
    key_terms = key_terms[:10]
    concepts = key_terms[:8]

    objectives = _build_objectives(concepts, category_slug)

    return ExtractedFacts(
        source_title=title,
        source_url=url,
        key_terms=key_terms,
        concepts=concepts,
        candidate_objectives=objectives,
        category_slug=category_slug,
        difficulty=difficulty.value if hasattr(difficulty, "value") else difficulty,
        resource_type=resource_type.value if hasattr(resource_type, "value") else resource_type,
        author=resource.get("author"),
    )
