"""
Writes a generated CourseDraft to /courses/{topic}/ as the exact set of
plain-text files specified by the course-authoring spec.
"""
from pathlib import Path
from dataclasses import dataclass, field

COURSES_DIR = Path("courses")

REQUIRED_FILES = [
    "course_metadata.txt",
    "course_outline.txt",
    "projects.txt",
    "assignments.txt",
    "quizzes.txt",
    "final_assessment.txt",
    "course_notes.txt",
]


@dataclass
class CourseDraft:
    topic_slug: str
    course_metadata: str
    course_outline: str
    modules: list[str]              # one rendered string per module (module_NN.txt content)
    projects: str
    assignments: str
    quizzes: str
    final_assessment: str
    course_notes: str
    sections_for_validation: dict[str, str] = field(default_factory=dict)


def write_course(draft: CourseDraft) -> Path:
    out_dir = COURSES_DIR / draft.topic_slug
    out_dir.mkdir(parents=True, exist_ok=True)

    (out_dir / "course_metadata.txt").write_text(draft.course_metadata, encoding="utf-8")
    (out_dir / "course_outline.txt").write_text(draft.course_outline, encoding="utf-8")

    for i, module_text in enumerate(draft.modules, start=1):
        (out_dir / f"module_{i:02d}.txt").write_text(module_text, encoding="utf-8")

    (out_dir / "projects.txt").write_text(draft.projects, encoding="utf-8")
    (out_dir / "assignments.txt").write_text(draft.assignments, encoding="utf-8")
    (out_dir / "quizzes.txt").write_text(draft.quizzes, encoding="utf-8")
    (out_dir / "final_assessment.txt").write_text(draft.final_assessment, encoding="utf-8")
    (out_dir / "course_notes.txt").write_text(draft.course_notes, encoding="utf-8")

    return out_dir


def write_status_file(topic_slug: str, status: str, findings_summary: str = "") -> Path:
    out_dir = COURSES_DIR / topic_slug
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / "VALIDATION_STATUS.txt"
    path.write_text(f"STATUS: {status}\n\n{findings_summary}", encoding="utf-8")
    return path
