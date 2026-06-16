import json
from typing import Dict, Any, List

class CourseBuilder:
    def __init__(self):
        pass

    def generate_course_schema(self, humanized_text: str, source_data: Dict[str, Any], originality_score: float) -> Dict[str, Any]:
        """
        Assembles the humanized text into the required LearnLoom course schema.
        """
        print("[CourseBuilder] Assembling course schema...")
        
        # MOCK LLM STRUCTURING
        # In reality, you'd use LLM JSON-mode or Instructor to output this exact schema.
        
        schema = {
            "title": source_data.get("title", "Generated Course").replace("Raw Extracted Concept", "Introduction to Concept"),
            "description": "An automatically generated course covering foundational concepts.",
            "modules": [
                {
                    "title": "Module 1: Basics",
                    "description": "Understanding the core principles."
                }
            ],
            "lessons": [
                {
                    "module_index": 0,
                    "title": "Lesson 1: Introduction",
                    "content": humanized_text,
                    "type": "reading",
                    "duration_minutes": 15
                }
            ],
            "quizzes": [
                {
                    "module_index": 0,
                    "title": "Knowledge Check",
                    "passing_score": 80,
                    "questions": [
                        {
                            "question": "What is the core principle discussed?",
                            "options": ["A", "B", "C", "D"],
                            "answer_index": 0
                        }
                    ]
                }
            ],
            "assignments": [],
            "learning_objectives": [
                "Understand the basic facts",
                "Apply knowledge to introductory problems"
            ],
            "references": [
                f"Derived from {source_data.get('url')}"
            ],
            "source_urls": [source_data.get("url")],
            "originality_score": originality_score
        }
        
        return schema

course_builder = CourseBuilder()
