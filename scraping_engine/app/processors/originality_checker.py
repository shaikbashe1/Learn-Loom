"""
processors/originality_checker.py

Stage 4 of the pipeline: ... -> Humanize -> Originality Check -> Save.

Compares the humanized output against the ORIGINAL source text (the raw
title+description that was cleaned in fact_extractor.py — passed in here
explicitly, never re-read from the database transparently, so the
comparison is always against the real source). Two independent checks,
either of which fails the content:

  1. Overall similarity > 20% (SequenceMatcher ratio) — the strict,
     spec-mandated threshold. This is intentionally much tighter than a
     typical plagiarism tool's default, by design.
  2. Any individual paragraph closely matching the source (ratio >= 0.5
     against any source paragraph, OR an exact 8-word run shared with the
     source) — catches a single copied paragraph even when the overall
     document-level similarity is diluted by other, genuinely original
     paragraphs.

Resources that fail are marked REJECTED and never reach READY_TO_PUBLISH.
"""
import re
from dataclasses import dataclass, field
from difflib import SequenceMatcher

OVERALL_SIMILARITY_THRESHOLD = 0.20   # reject if generated content is >20% similar to source
PARAGRAPH_SIMILARITY_THRESHOLD = 0.50  # reject if any single paragraph closely matches
NGRAM_SIZE = 8


@dataclass
class OriginalityResult:
    passed: bool
    overall_similarity: float
    flagged_paragraphs: list[str] = field(default_factory=list)
    reason: str = ""


def _paragraphs(text: str) -> list[str]:
    return [p.strip() for p in re.split(r"\n\s*\n|\n", text) if p.strip()]


def _ngrams(text: str, n: int) -> set:
    words = re.sub(r"[^\w\s]", " ", text.lower()).split()
    return {" ".join(words[i:i + n]) for i in range(len(words) - n + 1)}


def check_originality(generated_text: str, source_text: str) -> OriginalityResult:
    """
    `generated_text` should be the full humanized content concatenated
    (explanation + example + exercise + quiz + summary). `source_text`
    should be the cleaned original title+description — and ONLY that;
    callers must not pass the humanized text back in as its own source.
    """
    if not generated_text or not generated_text.strip():
        return OriginalityResult(False, 0.0, [], "No generated content to check.")

    if not source_text or not source_text.strip():
        # Nothing to compare against (e.g. source had no description) —
        # trivially original, but flagged in the reason for traceability.
        return OriginalityResult(True, 0.0, [], "No source text available for comparison; passed by default.")

    overall_ratio = SequenceMatcher(None, generated_text.lower(), source_text.lower()).ratio()

    flagged: list[str] = []
    gen_paragraphs = _paragraphs(generated_text)
    source_paragraphs = _paragraphs(source_text)
    source_ngrams = _ngrams(source_text, NGRAM_SIZE)

    for gen_para in gen_paragraphs:
        gen_para_ngrams = _ngrams(gen_para, NGRAM_SIZE)
        if gen_para_ngrams and gen_para_ngrams & source_ngrams:
            flagged.append(gen_para)
            continue
        for source_para in source_paragraphs:
            ratio = SequenceMatcher(None, gen_para.lower(), source_para.lower()).ratio()
            if ratio >= PARAGRAPH_SIMILARITY_THRESHOLD:
                flagged.append(gen_para)
                break

    overall_fail = overall_ratio > OVERALL_SIMILARITY_THRESHOLD
    paragraph_fail = len(flagged) > 0
    passed = not (overall_fail or paragraph_fail)

    if passed:
        reason = f"Passed — overall similarity {overall_ratio:.1%} (threshold {OVERALL_SIMILARITY_THRESHOLD:.0%}), no paragraph matches."
    else:
        reasons = []
        if overall_fail:
            reasons.append(f"overall similarity {overall_ratio:.1%} exceeds {OVERALL_SIMILARITY_THRESHOLD:.0%} threshold")
        if paragraph_fail:
            reasons.append(f"{len(flagged)} paragraph(s) closely match the source")
        reason = "Rejected — " + "; ".join(reasons)

    return OriginalityResult(passed, round(overall_ratio, 4), flagged, reason)
