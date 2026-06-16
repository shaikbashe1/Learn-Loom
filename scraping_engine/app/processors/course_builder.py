"""
processors/course_builder.py

Stage 5 of the pipeline (assembly, immediately before Save): takes the
HumanizedContent + ExtractedFacts for one resource and assembles the
publication-ready course package in the exact schema LearnLoom expects,
so this output requires no additional processing on the consuming side.

Output schema (always exactly these six top-level keys):
{
  "course_title": "",
  "modules": [],
  "lessons": [],
  "quizzes": [],
  "assignments": [],
  "references": []
}

`references` carries attribution (source URL + title) ONLY — never the
raw scraped body text. This is the one place the original source_url is
allowed to appear in published output, and it appears as a citation, not
as content.
"""
from app.processors.fact_extractor import ExtractedFacts
from app.processors.humanizer import HumanizedContent


def build_course_package(facts: ExtractedFacts, humanized: HumanizedContent) -> dict:
    module = {
        "module_id": "module_01",
        "title": humanized.title,
        "learning_objectives": humanized.learning_objectives,
        "difficulty": facts.difficulty,
        "category": facts.category_slug,
    }

    lesson = {
        "lesson_id": "lesson_01",
        "module_id": "module_01",
        "title": humanized.title,
        "explanation": humanized.explanation,
        "example": humanized.example,
        "exercise": humanized.exercise,
        "summary": humanized.summary,
    }

    quizzes = [
        {
            "quiz_id": f"quiz_{i+1:02d}",
            "module_id": "module_01",
            "question": q["question"],
            "answer": q["answer"],
        }
        for i, q in enumerate(humanized.quiz_questions)
    ]

    assignments = [
        {
            "assignment_id": "assignment_01",
            "module_id": "module_01",
            "instructions": humanized.exercise,
        }
    ] if humanized.exercise else []

    references = [
        {
            "source_title": facts.source_title,
            "source_url": facts.source_url,
            "note": "Attribution only — no source text is reproduced above.",
        }
    ] if facts.source_url else []

    return {
        "course_title": humanized.title,
        "modules": [module],
        "lessons": [lesson],
        "quizzes": quizzes,
        "assignments": assignments,
        "references": references,
    }
