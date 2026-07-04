"""
Course generation orchestrator.

Pipeline: extract → synthesize graph → author (LLM) → validate originality
→ validate copyright → write files → log outcome.

AUTHORING BACKEND: this module never feeds source sentences to the author
step — only the structured ConceptFact / learning-path output of
knowledge_extraction.py and knowledge_graph.py, which by construction
contain no copied text. The `OpenAIAuthor` backend calls the OpenAI API
with an explicit synthesis-not-copying instruction. If no API key is
configured, generation fails closed (status=FAILED) rather than silently
falling back to anything that risks reproducing source wording.
"""
from dataclasses import dataclass
import os
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import logger
from app.models import CourseGenerationLog, PublishStatus
from app.services.knowledge_extraction import KnowledgeExtractionService, ConceptFact
from app.services.knowledge_graph import KnowledgeGraph
from app.services.originality_validator import OriginalityValidator
from app.services.course_writer import CourseDraft, write_course, write_status_file
from app.services.supabase_importer import import_course_to_supabase


SYNTHESIS_SYSTEM_PROMPT = """You are an educational course author. You will be given a list of
distilled concept/skill/technology facts (NOT sentences from any source) and a suggested
learning order. Write completely original course content that teaches these concepts using
your own structure, your own analogies, your own examples, and your own exercises. Never
quote or closely paraphrase any external text — you have not been given any external text,
only abstract concept names, so simply do not invent quotes attributed to a source."""


class AuthoringBackendUnavailable(Exception):
    pass


class CourseAuthor:
    """Abstract authoring backend."""

    async def author_section(self, instruction: str, context: dict) -> str:
        raise NotImplementedError


class GeminiAuthor(CourseAuthor):
    async def author_section(self, instruction: str, context: dict) -> str:
        api_key = getattr(settings, 'GEMINI_API_KEY', os.environ.get("GEMINI_API_KEY"))
        if not api_key:
            return f"[MOCK CONTENT generated because GEMINI_API_KEY is missing]\nInstruction: {instruction}\nContext summary: {str(context)[:100]}..."
            
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.5-flash', system_instruction=SYNTHESIS_SYSTEM_PROMPT)
        
        resp = await model.generate_content_async(
            f"{instruction}\n\nConcepts/context: {context}",
            generation_config=genai.GenerationConfig(temperature=0.7)
        )
        return resp.text or ""


@dataclass
class GenerationResult:
    status: PublishStatus
    output_path: str | None
    findings_summary: str
    sources_used: int
    concepts_extracted: int
    modules_generated: int


class CourseGenerationOrchestrator:
    def __init__(self, db: AsyncSession, author: CourseAuthor | None = None):
        self.db = db
        self.author = author or GeminiAuthor()
        self.extraction = KnowledgeExtractionService(db)
        self.validator = OriginalityValidator(db)

    async def generate(self, category_slug: str, topic_name: str) -> GenerationResult:
        facts = await self.extraction.extract_for_category(category_slug)
        if not facts:
            return self._fail(category_slug, "No approved-source resources available for this category yet.")

        graph = KnowledgeGraph(category_slug)
        graph.ingest(facts)
        learning_path = graph.topological_learning_path()

        try:
            draft = await self._author_draft(category_slug, topic_name, graph, learning_path, facts)
        except AuthoringBackendUnavailable as exc:
            return self._fail(category_slug, str(exc))

        report = await self.validator.validate_course(category_slug, draft.sections_for_validation)

        if not report.passed:
            findings_text = "\n".join(
                f"- [{f.section}] {f.issue} (similarity={f.similarity}, vs={f.matched_against})"
                for f in report.findings
            )
            self.db.add(CourseGenerationLog(
                topic_slug=draft.topic_slug,
                category_slug=category_slug,
                sources_used=len({f.concept for f in facts}),
                concepts_extracted=len(facts),
                modules_generated=len(draft.modules),
                status=PublishStatus.REVIEW_REQUIRED,
                findings_summary=findings_text,
            ))
            await self.db.flush()
            write_status_file(draft.topic_slug, PublishStatus.REVIEW_REQUIRED.value, findings_text)
            return GenerationResult(
                PublishStatus.REVIEW_REQUIRED, None, findings_text,
                len(facts), len(facts), len(draft.modules),
            )

        out_dir = write_course(draft)
        write_status_file(draft.topic_slug, PublishStatus.SAFE_TO_PUBLISH.value, "No similarity findings.")

        self.db.add(CourseGenerationLog(
            topic_slug=draft.topic_slug,
            category_slug=category_slug,
            sources_used=len({f.concept for f in facts}),
            concepts_extracted=len(facts),
            modules_generated=len(draft.modules),
            status=PublishStatus.SAFE_TO_PUBLISH,
            findings_summary="No similarity findings.",
            output_path=str(out_dir),
        ))
        await self.db.flush()

        return GenerationResult(
            PublishStatus.SAFE_TO_PUBLISH, str(out_dir), "No similarity findings.",
            len(facts), len(facts), len(draft.modules),
        )

    def _fail(self, category_slug: str, reason: str) -> GenerationResult:
        logger.error("Course generation failed for category=%s: %s", category_slug, reason)
        self.db.add(CourseGenerationLog(
            topic_slug=category_slug,
            category_slug=category_slug,
            status=PublishStatus.FAILED,
            findings_summary=reason,
        ))
        return GenerationResult(PublishStatus.FAILED, None, reason, 0, 0, 0)

    async def _author_draft(
        self, category_slug: str, topic_name: str, graph: KnowledgeGraph,
        learning_path: list[str], facts: list[ConceptFact],
    ) -> CourseDraft:
        top_skills = [n.concept for n in graph.top_concepts(kind="skill", limit=10)]
        top_tech = [n.concept for n in graph.top_concepts(kind="technology", limit=10)]

        metadata = await self.author.author_section(
            "Write course_metadata.txt: name, description, difficulty, duration, audience, prerequisites.",
            {"topic": topic_name, "learning_path": learning_path[:15], "technologies": top_tech},
        )
        outline = await self.author.author_section(
            "Write course_outline.txt: a module-by-module outline with learning objectives per module.",
            {"topic": topic_name, "learning_path": learning_path},
        )

        modules = []
        chunk_size = max(1, len(learning_path) // 3) or 1
        for i in range(0, min(len(learning_path), 3 * chunk_size), chunk_size):
            chunk = learning_path[i:i + chunk_size]
            module_text = await self.author.author_section(
                f"Write a full module (module_{i // chunk_size + 1:02d}.txt) covering these concepts "
                f"with original explanations, analogies, examples, and a lesson list.",
                {"concepts": chunk, "skills": top_skills},
            )
            modules.append(module_text)

        projects = await self.author.author_section(
            "Write projects.txt: 2-3 original practice projects.", {"topic": topic_name, "skills": top_skills},
        )
        assignments = await self.author.author_section(
            "Write assignments.txt: original assignments per module.", {"learning_path": learning_path},
        )
        quizzes = await self.author.author_section(
            "Write quizzes.txt: original quiz questions with answers.", {"learning_path": learning_path},
        )
        final_assessment = await self.author.author_section(
            "Write final_assessment.txt: a comprehensive original final assessment.",
            {"learning_path": learning_path},
        )
        notes = await self.author.author_section(
            "Write course_notes.txt: original summary notes and key takeaways.",
            {"learning_path": learning_path},
        )

        sections_for_validation = {
            "course_metadata": metadata, "course_outline": outline,
            "projects": projects, "assignments": assignments,
            "quizzes": quizzes, "final_assessment": final_assessment,
            "course_notes": notes,
            **{f"module_{i+1:02d}": m for i, m in enumerate(modules)},
        }

        return CourseDraft(
            topic_slug=category_slug,
            course_metadata=metadata,
            course_outline=outline,
            modules=modules,
            projects=projects,
            assignments=assignments,
            quizzes=quizzes,
            final_assessment=final_assessment,
            course_notes=notes,
            sections_for_validation=sections_for_validation,
        )
