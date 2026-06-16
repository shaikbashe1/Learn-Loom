import pytest
from app.services.classifier import (
    classify_category,
    classify_difficulty,
    classify_resource_type,
    extract_tags,
    compute_content_hash,
    is_duplicate,
)
from app.models.resource import DifficultyLevel, ResourceType


def test_classify_category_python():
    result = classify_category("Python Flask Tutorial", "Build REST APIs with Python")
    assert result == "python"


def test_classify_category_ml():
    result = classify_category("Deep Learning with PyTorch", "Neural networks and backpropagation")
    assert result == "ai-ml"


def test_classify_category_devops():
    result = classify_category("Docker and Kubernetes for DevOps")
    assert result == "devops"


def test_classify_difficulty_beginner():
    result = classify_difficulty("Python for Beginners", "Introduction to Python basics")
    assert result == DifficultyLevel.BEGINNER


def test_classify_difficulty_advanced():
    result = classify_difficulty("Advanced System Design", "Production-grade architecture patterns")
    assert result == DifficultyLevel.ADVANCED


def test_classify_resource_type_video():
    result = classify_resource_type("https://www.youtube.com/watch?v=abc123")
    assert result == ResourceType.VIDEO


def test_classify_resource_type_documentation():
    result = classify_resource_type("https://docs.python.org/3/")
    assert result == ResourceType.DOCUMENTATION


def test_extract_tags_returns_list():
    tags = extract_tags("Python Django REST Framework Tutorial", "Build APIs")
    assert isinstance(tags, list)
    assert len(tags) > 0
    assert "python" in tags or "django" in tags


def test_content_hash_deterministic():
    h1 = compute_content_hash("https://example.com/course", "Python Course")
    h2 = compute_content_hash("https://example.com/course", "Python Course")
    assert h1 == h2
    assert len(h1) == 64


def test_content_hash_different_inputs():
    h1 = compute_content_hash("https://example.com/a", "Course A")
    h2 = compute_content_hash("https://example.com/b", "Course B")
    assert h1 != h2


def test_is_duplicate_same_title():
    assert is_duplicate("Python for Beginners", "Python for Beginners", threshold=0.85)


def test_is_duplicate_different_titles():
    assert not is_duplicate("Python Tutorial", "Java Spring Boot Course", threshold=0.85)
