"""
processors/quality_checker.py

Computes the Quality Score and Readability Score gates required before a
generated course may even reach the drafts queue (READY_TO_PUBLISH).
Combined with OriginalityResult.overall_similarity (converted to a 0-100
"originality score" as 100 * (1 - similarity)), a course is only queued
for admin review when ALL THREE scores are >= 80.

These are heuristic, not ML-based, scores — documented as such rather than
overclaiming sophistication:

Quality Score (0-100): structural completeness — does the course actually
have a real title, explanation, example, exercise, quiz, and summary, and
are they substantive (not just a sentence fragment)?

Readability Score (0-100): a simplified Flesch-Reading-Ease-style heuristic
based on average sentence length and average word length — favors the
short sentences and plain language a beginner-friendly course should have.
"""
import re
from dataclasses import dataclass

from app.processors.humanizer import HumanizedContent

MIN_SUBSTANTIVE_CHARS = 80  # below this, a section is "too thin to count"


@dataclass
class QualityResult:
    quality_score: float
    readability_score: float
    notes: list[str]


def _word_count(text: str) -> int:
    return len(re.findall(r"\b\w+\b", text))


def _sentence_count(text: str) -> int:
    sentences = re.split(r"[.!?]+", text)
    return max(1, len([s for s in sentences if s.strip()]))


def _syllable_estimate(word: str) -> int:
    word = word.lower()
    vowels = "aeiouy"
    count = 0
    prev_was_vowel = False
    for ch in word:
        is_vowel = ch in vowels
        if is_vowel and not prev_was_vowel:
            count += 1
        prev_was_vowel = is_vowel
    return max(1, count)


def compute_quality_score(humanized: HumanizedContent) -> tuple[float, list[str]]:
    notes = []
    checks = {
        "title": bool(humanized.title and len(humanized.title) > 5),
        "explanation": len(humanized.explanation or "") >= MIN_SUBSTANTIVE_CHARS,
        "example": len(humanized.example or "") >= MIN_SUBSTANTIVE_CHARS,
        "exercise": len(humanized.exercise or "") >= MIN_SUBSTANTIVE_CHARS,
        "summary": len(humanized.summary or "") >= 30,
        "quizzes": len(humanized.quiz_questions) >= 2,
        "learning_objectives": len(humanized.learning_objectives) >= 1,
    }
    passed = sum(1 for v in checks.values() if v)
    total = len(checks)
    score = round(100 * passed / total, 1)

    for name, ok in checks.items():
        if not ok:
            notes.append(f"missing or too thin: {name}")

    return score, notes


def compute_readability_score(text: str) -> float:
    """
    Simplified Flesch Reading Ease: 206.835 - 1.015*(words/sentences) - 84.6*(syllables/words).
    Clamped to 0-100. Higher = easier to read, which is what we want for a
    beginner-friendly humanized course.
    """
    words = re.findall(r"\b\w+\b", text)
    if not words:
        return 0.0

    word_count = len(words)
    sentence_count = _sentence_count(text)
    syllable_count = sum(_syllable_estimate(w) for w in words)

    score = (
        206.835
        - 1.015 * (word_count / sentence_count)
        - 84.6 * (syllable_count / word_count)
    )
    return round(max(0.0, min(100.0, score)), 1)


def check_quality(humanized: HumanizedContent) -> QualityResult:
    quality_score, notes = compute_quality_score(humanized)

    full_text = "\n\n".join(filter(None, [
        humanized.explanation, humanized.example, humanized.exercise, humanized.summary,
    ]))
    readability_score = compute_readability_score(full_text)

    return QualityResult(quality_score=quality_score, readability_score=readability_score, notes=notes)
