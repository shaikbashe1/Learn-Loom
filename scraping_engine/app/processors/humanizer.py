"""
processors/humanizer.py

Stage 3 of the pipeline: ... -> Extract Facts -> Humanize -> Originality
Check -> ...

Takes ExtractedFacts (never raw source text) and produces completely
original educational content: a first-principles explanation, examples,
exercises, quizzes, and a summary. This is the only place in the pipeline
that "writes" course content — course_builder.py only assembles what this
module produces.

Pluggable backend, same pattern as app/services/course_generator.py:
  - OpenAIHumanizerBackend: real LLM-backed writing (requires OPENAI_API_KEY)
  - TemplateHumanizerBackend: deterministic, fully offline fallback that
    still produces original (non-copied) structured content from the
    extracted concepts, so the pipeline is runnable without any external
    API dependency. It is intentionally simple/templated text, not claimed
    to be richly authored — see docs note in course_builder.py output.
"""
import os
from dataclasses import dataclass, field

from app.processors.fact_extractor import ExtractedFacts

HUMANIZER_SYSTEM_PROMPT = (
    "You are an educational writer. You will be given a list of distilled "
    "concepts and candidate learning objectives — NOT source sentences. "
    "Write a completely original, beginner-friendly explanation from first "
    "principles, plus an original example, an original exercise, two "
    "original quiz questions with answers, and a one-paragraph summary. "
    "Never quote or closely paraphrase any external text."
)


@dataclass
class HumanizedContent:
    title: str
    explanation: str
    example: str
    exercise: str
    quiz_questions: list[dict] = field(default_factory=list)   # [{"question":..., "answer":...}]
    summary: str = ""
    learning_objectives: list[str] = field(default_factory=list)


class HumanizerBackend:
    def humanize(self, facts: ExtractedFacts) -> HumanizedContent:
        raise NotImplementedError


class HumanizerBackendUnavailable(Exception):
    pass


class GeminiHumanizerBackend(HumanizerBackend):
    def humanize(self, facts: ExtractedFacts) -> HumanizedContent:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise HumanizerBackendUnavailable(
                "GEMINI_API_KEY not set — GeminiHumanizerBackend cannot run. "
                "Use TemplateHumanizerBackend for an offline run, or set the key."
            )
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.5-flash', system_instruction=HUMANIZER_SYSTEM_PROMPT)
        
        context = (
            f"Concepts: {facts.concepts}\n"
            f"Candidate objectives: {facts.candidate_objectives}\n"
            f"Category: {facts.category_slug}, Difficulty: {facts.difficulty}"
        )
        resp = model.generate_content(context, generation_config=genai.GenerationConfig(temperature=0.7))
        text = resp.text or ""
        # The LLM returns free text; course_builder only needs a single
        # cohesive block, so we store it directly as the explanation and
        # leave example/exercise/quiz as empty unless the model structured
        # them — production deployments should request structured JSON
        # output from the model instead (function calling / response_format).
        return HumanizedContent(
            title=f"Understanding {facts.concepts[0] if facts.concepts else facts.category_slug or 'This Topic'}",
            explanation=text,
            example="",
            exercise="",
            quiz_questions=[],
            summary="",
            learning_objectives=facts.candidate_objectives,
        )


class TemplateHumanizerBackend(HumanizerBackend):
    """
    Fully offline, deterministic backend. Produces original (template-based,
    not source-derived) explanations so the pipeline runs end-to-end without
    any external API. Every sentence is generated from the concept list —
    never from resource.description — so it cannot, by construction, copy
    source wording.
    """

    def humanize(self, facts: ExtractedFacts) -> HumanizedContent:
        """
        Sentences here are kept deliberately short and plain — this isn't
        just style preference. The pipeline gates drafts on a readability
        score (Flesch Reading Ease) of >= 80, which requires short
        sentences and simple words. An earlier version of this template
        wrote longer, comma-heavy sentences and scored only ~20 — it would
        have been rejected by the quality gate on every single resource.
        Caught by tests/unit/test_processors.py and fixed here.
        """
        primary_concept = facts.concepts[0] if facts.concepts else (facts.category_slug or "this topic").replace("-", " ")
        secondary = facts.concepts[1:4]

        title = f"Understanding {primary_concept.title()}"

        # Use the concept name once, then switch to "it" — repeating a long,
        # multi-syllable phrase in every sentence is what kept dragging the
        # Flesch score down even after sentences got shorter.
        explanation = (
            f"Let's start with the basics of {primary_concept}. "
            f"Don't learn the term yet. "
            f"Ask one thing first: what problem does it solve? "
            f"Think about what breaks without it. "
            f"That is the real reason it exists. "
            f"Once you see the problem, the idea is easy. "
            + (f"You will often see it next to {secondary[0]}. " if secondary else "")
        )

        example = (
            f"Try this test. "
            f"Explain {primary_concept} to a friend. "
            f"Use plain words only. "
            f"Skip the hard terms. "
            f"If you can do that, you get it. "
            f"If not, go back and look again."
        )

        exercise = (
            f"Try this short task. "
            f"Write two plain lines about {primary_concept}. "
            f"Do not look anything up first. "
            f"Then think of one time it would have helped you. "
            f"Write that down too."
        )

        quiz_questions = [
            {
                "question": f"What problem does {primary_concept} solve?",
                "answer": "Any answer that names the real need is correct. A repeated term alone is not enough.",
            },
            {
                "question": f"Name one idea often used next to {primary_concept}.",
                "answer": secondary[0] if secondary else "Answers will vary based on the topic covered.",
            },
        ]

        summary = (
            f"Start with the problem {primary_concept} solves. "
            f"Skip the term at first. "
            f"Try the example above. "
            f"Then do the task. "
            f"This builds real understanding, not just memorized words."
        )

        return HumanizedContent(
            title=title,
            explanation=explanation,
            example=example,
            exercise=exercise,
            quiz_questions=quiz_questions,
            summary=summary,
            learning_objectives=facts.candidate_objectives,
        )


def humanize(facts: ExtractedFacts, backend: HumanizerBackend | None = None) -> HumanizedContent:
    """
    Default entrypoint used by the pipeline. Tries OpenAI if a key is
    configured, otherwise falls back to the offline template backend —
    the pipeline always produces a usable result, but production
    deployments should configure OPENAI_API_KEY for genuinely rich,
    LLM-authored content rather than relying on the template fallback.
    """
    chosen_backend = backend
    if chosen_backend is None:
        if os.environ.get("GEMINI_API_KEY"):
            chosen_backend = GeminiHumanizerBackend()
        else:
            chosen_backend = TemplateHumanizerBackend()

    try:
        return chosen_backend.humanize(facts)
    except HumanizerBackendUnavailable:
        return TemplateHumanizerBackend().humanize(facts)
