"""
Knowledge graph synthesis.

Takes ConceptFacts (already stripped of source text — see
knowledge_extraction.py) gathered from multiple sources and merges them
into a single graph: nodes are concepts/skills/technologies, edges are
"depends_on" / "related_to" relationships inferred from co-occurrence and
a small hand-authored set of canonical prerequisite rules per domain.

This is knowledge synthesis, not text rewriting — nothing here is ever a
sentence lifted from a source. It's the structural skeleton a course
generator uses to decide module ordering.
"""
from dataclasses import dataclass, field
from app.services.knowledge_extraction import ConceptFact


@dataclass
class GraphNode:
    concept: str
    kind: str
    weight: int  # corroboration strength across sources
    depends_on: set[str] = field(default_factory=set)
    related_to: set[str] = field(default_factory=set)


# Canonical prerequisite skeletons — these encode general pedagogical ordering
# knowledge (e.g. "variables before functions"), not anything copied from a
# specific course. They act as a backbone the synthesized graph snaps onto.
CANONICAL_PREREQUISITES: dict[str, list[tuple[str, str]]] = {
    "python": [
        ("variables", "data types"), ("data types", "control flow"),
        ("control flow", "functions"), ("functions", "data structures"),
        ("data structures", "object oriented programming"), ("functions", "error handling"),
        ("object oriented programming", "modules and packages"),
    ],
    "java": [
        ("variables", "control flow"), ("control flow", "methods"),
        ("methods", "classes and objects"), ("classes and objects", "inheritance"),
        ("inheritance", "interfaces"), ("interfaces", "collections"),
        ("collections", "exception handling"),
    ],
    "ai-ml": [
        ("statistics", "data preprocessing"), ("data preprocessing", "supervised learning"),
        ("supervised learning", "model evaluation"), ("model evaluation", "unsupervised learning"),
        ("unsupervised learning", "neural networks"), ("neural networks", "deep learning"),
    ],
    "devops": [
        ("version control", "continuous integration"), ("continuous integration", "containerization"),
        ("containerization", "orchestration"), ("orchestration", "infrastructure as code"),
        ("infrastructure as code", "monitoring"),
    ],
}


class KnowledgeGraph:
    def __init__(self, category_slug: str):
        self.category_slug = category_slug
        self.nodes: dict[str, GraphNode] = {}

    def ingest(self, facts: list[ConceptFact]) -> None:
        for f in facts:
            if f.concept not in self.nodes:
                self.nodes[f.concept] = GraphNode(
                    concept=f.concept, kind=f.kind, weight=f.source_count
                )
            else:
                self.nodes[f.concept].weight += f.source_count

        self._apply_canonical_prerequisites()
        self._infer_related_edges()

    def _apply_canonical_prerequisites(self) -> None:
        for prereq, target in CANONICAL_PREREQUISITES.get(self.category_slug, []):
            if target in self.nodes:
                self.nodes[target].depends_on.add(prereq)
                if prereq not in self.nodes:
                    self.nodes[prereq] = GraphNode(concept=prereq, kind="concept", weight=1)

    def _infer_related_edges(self) -> None:
        concepts = list(self.nodes.keys())
        for i, a in enumerate(concepts):
            for b in concepts[i + 1:]:
                a_words, b_words = set(a.split()), set(b.split())
                if a_words & b_words and a != b:
                    self.nodes[a].related_to.add(b)
                    self.nodes[b].related_to.add(a)

    def topological_learning_path(self) -> list[str]:
        """Simple Kahn's-algorithm ordering respecting depends_on edges, ties broken by weight."""
        visited: set[str] = set()
        path: list[str] = []

        def visit(node_name: str):
            if node_name in visited or node_name not in self.nodes:
                return
            visited.add(node_name)
            for dep in self.nodes[node_name].depends_on:
                visit(dep)
            path.append(node_name)

        ordered_by_weight = sorted(self.nodes.values(), key=lambda n: -n.weight)
        for node in ordered_by_weight:
            visit(node.concept)

        return path

    def top_concepts(self, kind: str | None = None, limit: int = 20) -> list[GraphNode]:
        nodes = [n for n in self.nodes.values() if kind is None or n.kind == kind]
        return sorted(nodes, key=lambda n: -n.weight)[:limit]
