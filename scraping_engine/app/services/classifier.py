"""
Rule-based + optional LLM-backed content classifier.
Falls back gracefully when OpenAI key is not configured.
"""
import re
import hashlib
from typing import Tuple, List, Optional
from difflib import SequenceMatcher

from app.core.config import settings
from app.core.logging import logger
from app.models.resource import DifficultyLevel, ResourceType


# Keyword maps for category inference
CATEGORY_KEYWORDS: dict[str, List[str]] = {
    "python": ["python", "django", "flask", "fastapi", "pandas", "numpy", "pytorch", "tensorflow"],
    "java": ["java", "spring", "maven", "gradle", "jvm", "hibernate", "jakarta"],
    "data-structures": ["data structure", "linked list", "stack", "queue", "tree", "graph", "hash table"],
    "advanced-dsa": ["algorithm", "dynamic programming", "greedy", "backtracking", "complexity", "big-o", "leetcode"],
    "full-stack": ["full stack", "fullstack", "frontend", "backend", "rest api", "web development"],
    "mern-stack": ["mern", "mongodb", "express", "react", "node", "nodejs", "next.js"],
    "ai-ml": ["machine learning", "deep learning", "neural network", "nlp", "computer vision", "ai", "artificial intelligence", "llm"],
    "cyber-security": ["cybersecurity", "security", "penetration", "ethical hacking", "ctf", "vulnerability", "encryption"],
    "cloud-computing": ["aws", "azure", "gcp", "cloud", "kubernetes", "terraform", "serverless", "lambda"],
    "devops": ["devops", "ci/cd", "docker", "jenkins", "ansible", "monitoring", "prometheus", "grafana", "git"],
}

# Fine-grained TOPIC taxonomy — finer than CATEGORY_KEYWORDS above (which
# buckets into the 10 broad LearnLoom categories). Used by the discovery
# pipeline to tag resources/courses with a specific topic for the
# monitoring dashboard's per-topic counts (e.g. "AI courses generated",
# "MERN courses generated") and for duplicate-prevention topic matching.
# Order matters: more specific topics are checked before their broader
# parent topic so e.g. "deep learning" wins over generic "machine learning".
TOPIC_KEYWORDS: dict[str, List[str]] = {
    "Prompt Engineering": ["prompt engineering", "prompt design", "few-shot prompting", "chain-of-thought"],
    "Generative AI": ["generative ai", "genai", "diffusion model", "stable diffusion", "dall-e", "text-to-image"],
    "LLMs": ["large language model", "llm", "gpt", "transformer model", "fine-tuning", "rag", "retrieval augmented"],
    "Deep Learning": ["deep learning", "neural network", "cnn", "rnn", "backpropagation", "pytorch", "tensorflow"],
    "Machine Learning": ["machine learning", "scikit-learn", "regression", "classification model", "supervised learning", "unsupervised learning"],
    "AI": ["artificial intelligence", "ai agent", "computer vision", "nlp", "natural language processing"],
    "Data Science": ["data science", "pandas", "data analysis", "data visualization", "jupyter"],
    "MERN Stack": ["mern stack", "mern"],
    "React": ["react", "jsx", "react hooks", "react component"],
    "Node.js": ["node.js", "nodejs", "node js"],
    "Express.js": ["express.js", "expressjs", "express middleware"],
    "MongoDB": ["mongodb", "mongoose", "nosql document"],
    "Next.js": ["next.js", "nextjs", "server-side rendering", "app router"],
    "TypeScript": ["typescript", "type-safe", "interface type", "generic type"],
    "Cloud": ["aws", "azure", "gcp", "cloud computing", "serverless", "lambda function", "ec2", "s3 bucket"],
    "DevOps": ["devops", "ci/cd", "docker", "kubernetes", "jenkins", "ansible", "terraform", "infrastructure as code"],
    "System Design": ["system design", "scalability", "load balancer", "microservices", "distributed system", "high availability"],
    "Python": ["python", "django", "flask", "fastapi"],
}


def classify_topic(title: str, description: str = "") -> str:
    """Returns the single best-matching fine-grained topic, or 'General' if nothing matches."""
    text = f"{title} {description}".lower()
    scores: dict[str, int] = {}
    for topic, keywords in TOPIC_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in text)
        if score:
            scores[topic] = score
    if not scores:
        return "General"
    return max(scores, key=lambda k: scores[k])


DIFFICULTY_KEYWORDS = {
    DifficultyLevel.BEGINNER: ["beginner", "introduction", "intro", "basics", "fundamentals", "101", "getting started", "for beginners"],
    DifficultyLevel.INTERMEDIATE: ["intermediate", "mid-level", "practical", "hands-on"],
    DifficultyLevel.ADVANCED: ["advanced", "expert", "senior", "in-depth", "deep dive", "production", "architecture"],
}

RESOURCE_TYPE_PATTERNS = {
    ResourceType.VIDEO: ["youtube.com", "youtu.be", "vimeo.com", "udemy.com", "coursera.org"],
    ResourceType.DOCUMENTATION: ["docs.", "documentation", "developer.", "reference", "api reference"],
    ResourceType.ARTICLE: ["medium.com", "dev.to", "hashnode", "blog", "article"],
    ResourceType.COURSE: ["course", "curriculum", "bootcamp", "learn", "tutorial"],
}

TAG_STOPWORDS = {
    "the", "and", "for", "with", "from", "this", "that", "are", "you",
    "how", "what", "when", "your", "will", "can", "its", "all",
}


def classify_category(title: str, description: str = "") -> Optional[str]:
    text = f"{title} {description}".lower()
    scores: dict[str, int] = {}

    for slug, keywords in CATEGORY_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in text)
        if score:
            scores[slug] = score

    if not scores:
        return None
    return max(scores, key=lambda k: scores[k])


def classify_difficulty(title: str, description: str = "") -> DifficultyLevel:
    text = f"{title} {description}".lower()
    for level, keywords in DIFFICULTY_KEYWORDS.items():
        if any(kw in text for kw in keywords):
            return level
    return DifficultyLevel.BEGINNER


def classify_resource_type(url: str, title: str = "") -> ResourceType:
    url_lower = url.lower()
    title_lower = title.lower()

    for rtype, patterns in RESOURCE_TYPE_PATTERNS.items():
        if any(p in url_lower or p in title_lower for p in patterns):
            return rtype

    return ResourceType.COURSE


def extract_tags(title: str, description: str = "", max_tags: int = 8) -> List[str]:
    text = f"{title} {description}".lower()
    # Remove punctuation
    text = re.sub(r"[^\w\s]", " ", text)
    words = text.split()

    # Single words
    candidates = [w for w in words if len(w) > 3 and w not in TAG_STOPWORDS]

    # Known multi-word tags
    multi_word = [
        "machine learning", "deep learning", "neural network", "data science",
        "web development", "full stack", "open source", "version control",
        "object oriented", "functional programming", "design patterns",
    ]
    for mw in multi_word:
        if mw in text:
            candidates.insert(0, mw)

    # Deduplicate preserving order
    seen = set()
    unique = []
    for c in candidates:
        if c not in seen:
            seen.add(c)
            unique.append(c)

    return unique[:max_tags]


def compute_content_hash(url: str, title: str) -> str:
    content = f"{url.strip().lower()}:{title.strip().lower()}"
    return hashlib.sha256(content.encode()).hexdigest()[:64]


def is_duplicate(title_a: str, title_b: str, threshold: float = None) -> bool:
    t = threshold or settings.SIMILARITY_THRESHOLD
    ratio = SequenceMatcher(None, title_a.lower(), title_b.lower()).ratio()
    return ratio >= t


class ContentClassifier:
    """Orchestrates rule-based classification with optional LLM enhancement."""

    async def classify(
        self,
        title: str,
        description: str,
        url: str,
        category_slugs: List[str],
    ) -> dict:
        category_slug = classify_category(title, description) or "python"
        if category_slug not in category_slugs:
            category_slug = category_slugs[0] if category_slugs else "python"

        difficulty = classify_difficulty(title, description)
        resource_type = classify_resource_type(url, title)
        tags = extract_tags(title, description)
        content_hash = compute_content_hash(url, title)

        return {
            "category_slug": category_slug,
            "difficulty": difficulty,
            "resource_type": resource_type,
            "tags": tags,
            "content_hash": content_hash,
        }
