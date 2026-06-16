"""
Tests for the humanization pipeline (app/processors/).
"""
from app.processors.fact_extractor import extract_facts, clean_text, ExtractedFacts
from app.processors.humanizer import humanize, TemplateHumanizerBackend, HumanizedContent
from app.processors.originality_checker import check_originality
from app.processors.quality_checker import check_quality
from app.processors.course_builder import build_course_package
from app.services.classifier import classify_topic

SAMPLE_RESOURCE = {
    "title": "Introduction to Linear Algebra",
    "description": "This course covers vectors, matrices, and linear transformations for engineering students.",
    "course_url": "https://ocw.mit.edu/courses/linear-algebra",
    "author": "Prof. Gilbert Strang",
}


def test_fact_extraction_filters_meta_words():
    """Regression test: concepts must never include meta-words about the
    resource itself ('introduction', 'course', 'covers') — these produced
    a nonsensical 'Understanding Introduction' course title before the fix."""
    facts = extract_facts(SAMPLE_RESOURCE)
    meta_words = {"introduction", "course", "covers", "students"}
    for concept in facts.concepts:
        assert concept not in meta_words, f"meta-word leaked into concepts: {concept}"


def test_fact_extraction_finds_multiword_concept():
    facts = extract_facts(SAMPLE_RESOURCE)
    assert "linear algebra" in facts.concepts


def test_clean_text_strips_html_and_entities():
    dirty = "<p>Vectors &amp; Matrices</p>"
    assert clean_text(dirty) == "Vectors & Matrices"


def test_humanizer_produces_original_content_not_source_text():
    facts = extract_facts(SAMPLE_RESOURCE)
    humanized = humanize(facts, backend=TemplateHumanizerBackend())
    assert humanized.explanation
    assert SAMPLE_RESOURCE["description"] not in humanized.explanation


def test_originality_passes_for_humanized_content():
    facts = extract_facts(SAMPLE_RESOURCE)
    humanized = humanize(facts, backend=TemplateHumanizerBackend())
    generated_text = "\n\n".join(filter(None, [
        humanized.explanation, humanized.example, humanized.exercise, humanized.summary,
    ]))
    source_text = clean_text(SAMPLE_RESOURCE["title"] + " " + SAMPLE_RESOURCE["description"])
    result = check_originality(generated_text, source_text)
    assert result.passed is True
    assert result.overall_similarity <= 0.20


def test_originality_rejects_verbatim_copy():
    source_text = clean_text(SAMPLE_RESOURCE["title"] + " " + SAMPLE_RESOURCE["description"])
    result = check_originality(source_text, source_text)
    assert result.passed is False
    assert result.overall_similarity > 0.20


def test_originality_rejects_single_copied_paragraph_even_if_overall_diluted():
    source_text = "Linear algebra is the branch of mathematics concerning linear equations."
    generated_text = (
        "Here is a totally original paragraph about something else entirely, "
        "discussing how cooking pasta requires careful timing and temperature control "
        "to achieve the right texture, which has nothing to do with mathematics.\n\n"
        "Linear algebra is the branch of mathematics concerning linear equations."
    )
    result = check_originality(generated_text, source_text)
    assert result.passed is False
    assert len(result.flagged_paragraphs) == 1


def test_course_package_matches_required_schema():
    facts = extract_facts(SAMPLE_RESOURCE)
    humanized = humanize(facts, backend=TemplateHumanizerBackend())
    package = build_course_package(facts, humanized)
    assert set(package.keys()) == {
        "course_title", "modules", "lessons", "quizzes", "assignments", "references",
    }
    assert isinstance(package["modules"], list) and len(package["modules"]) > 0
    assert isinstance(package["references"], list) and len(package["references"]) > 0


def test_course_package_references_never_contain_raw_description():
    facts = extract_facts(SAMPLE_RESOURCE)
    humanized = humanize(facts, backend=TemplateHumanizerBackend())
    package = build_course_package(facts, humanized)
    for ref in package["references"]:
        assert SAMPLE_RESOURCE["description"] not in str(ref)


def test_template_backend_clears_all_three_publish_gates():
    """
    Regression test: an earlier version of TemplateHumanizerBackend wrote
    long, comma-heavy sentences that repeated the (often multi-syllable)
    concept name in every sentence. That scored a Flesch readability of
    only ~20, which would have caused every single offline-generated
    draft to be REJECTED by the >=80 readability gate in
    humanize_resource_task. Fixed by shortening sentences and replacing
    repeated concept-name mentions with pronouns after first use.
    """
    facts = extract_facts(SAMPLE_RESOURCE)
    humanized = humanize(facts, backend=TemplateHumanizerBackend())
    quality = check_quality(humanized)

    generated_text = "\n\n".join(filter(None, [
        humanized.explanation, humanized.example, humanized.exercise, humanized.summary,
    ]))
    source_text = clean_text(SAMPLE_RESOURCE["title"] + " " + SAMPLE_RESOURCE["description"])
    originality = check_originality(generated_text, source_text)
    originality_pct = 100 * (1 - originality.overall_similarity)

    assert originality_pct >= 80, f"originality gate would fail: {originality_pct}"
    assert quality.quality_score >= 80, f"quality gate would fail: {quality.quality_score}"
    assert quality.readability_score >= 80, f"readability gate would fail: {quality.readability_score}"


def test_classify_topic_fine_grained():
    assert classify_topic("Introduction to Deep Learning with PyTorch", "neural networks") == "Deep Learning"
    assert classify_topic("MERN Stack Tutorial", "MongoDB Express React Node") == "MERN Stack"
    assert classify_topic("Prompt Engineering for LLMs", "chain-of-thought prompting") == "Prompt Engineering"
    assert classify_topic("Totally unrelated content", "nothing matches") == "General"
