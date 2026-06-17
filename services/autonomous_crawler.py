import sys
import os
import asyncio
import time
import logging
import uuid
import requests
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

ENGINE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "scraping_engine"))
sys.path.insert(0, ENGINE_DIR)

from app.database.base import AsyncSessionLocal
from app.processors.fact_extractor import ExtractedFacts
from app.processors.humanizer import humanize
from app.processors.course_builder import build_course_package

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("AutonomousCrawler")

SUPPORTED_CATEGORIES = [
    "Python (programming language)", "Machine learning", "Artificial intelligence", 
    "React (software)", "Node.js", "Data science", "Cloud computing",
    "DevOps", "Computer security", "System design", "MongoDB", "TypeScript"
]

def fetch_wikipedia_content(topic: str) -> str:
    """Fetches full plain text from Wikipedia for a given topic."""
    url = "https://en.wikipedia.org/w/api.php"
    params = {
        "action": "query",
        "format": "json",
        "prop": "extracts",
        "exintro": False,
        "explaintext": True,
        "titles": topic
    }
    try:
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        pages = data.get("query", {}).get("pages", {})
        for page_id, page_data in pages.items():
            if page_id == "-1": continue
            return page_data.get("extract", "")
    except Exception as e:
        logger.error(f"Failed to fetch {topic} from Wikipedia: {e}")
    return ""

def calculate_quality_score(raw_text: str, humanized_text: str, modules_count: int) -> int:
    """Calculates a 0-100 score based on text length, module density, and readability."""
    score = 50 # Base score
    if len(raw_text) > 5000: score += 20
    elif len(raw_text) > 2000: score += 10
    
    if modules_count >= 5: score += 15
    elif modules_count >= 3: score += 10
    
    if len(humanized_text) > 1000: score += 15
    
    return min(100, score)

async def process_topic(db: AsyncSession, topic: str):
    logger.info(f"--- Processing Topic: {topic} ---")
    
    # Check if we already have a course for this topic
    result = await db.execute(text("SELECT id FROM public.courses WHERE title ILIKE :title"), {"title": f"%{topic.split(' (')[0]}%"})
    if result.fetchone():
        logger.info(f"Course for {topic} already exists. Skipping.")
        return

    logger.info(f"Scraping content from Wikipedia for {topic}...")
    raw_text = fetch_wikipedia_content(topic)
    
    if not raw_text or len(raw_text) < 500:
        logger.warning(f"Not enough content found for {topic}. Skipping.")
        return

    # Mock Extracted Facts to drive the humanizer
    facts = ExtractedFacts(
        category_slug=topic.lower().replace(" ", "-"),
        concepts=["Introduction", "Core Architecture", "Advanced Implementation", "Best Practices"],
        candidate_objectives=[f"Understand {topic}", f"Apply {topic} in real-world scenarios"],
        difficulty="beginner",
        source_url=f"https://en.wikipedia.org/wiki/{topic.replace(' ', '_')}",
        source_title=topic
    )
    
    logger.info("Humanizing content...")
    humanized = humanize(facts)
    # Inject actual scraped text snippet to ensure the course has real meat
    humanized.explanation = raw_text[:3000] + "\n\n" + humanized.explanation
    
    logger.info("Building course package...")
    pkg = build_course_package(facts, humanized)
    
    quality_score = calculate_quality_score(raw_text, humanized.explanation, len(pkg["modules"]))
    logger.info(f"Quality Score calculated: {quality_score}/100")
    
    # Import to Database as Pending Review
    course_id = str(uuid.uuid4())
    display_title = topic.split(" (")[0].title()
    
    await db.execute(text("""
        INSERT INTO public.courses (id, title, description, difficulty, status, rating, student_count, quality_score, source_url)
        VALUES (:id, :title, :description, :difficulty, 'pending_review', 0, 0, :score, :url)
    """), {
        "id": course_id,
        "title": f"Mastering {display_title}",
        "description": f"An AI-generated course derived from comprehensive open-source documentation.\nQuality Score: {quality_score}/100",
        "difficulty": "Beginner",
        "score": quality_score,
        "url": facts.source_url
    })

    for i, mod in enumerate(pkg["modules"]):
        mod_id = str(uuid.uuid4())
        lesson = next((l for l in pkg["lessons"] if l["module_id"] == mod["module_id"]), None)
        desc = ""
        if lesson:
            desc = f"{lesson['explanation']}\n\nExample:\n{lesson['example']}\n\nExercise:\n{lesson['exercise']}\n\nSummary:\n{lesson['summary']}"

        await db.execute(text("""
            INSERT INTO public.course_modules (id, course_id, title, description, order_index)
            VALUES (:id, :course_id, :title, :description, :order_index)
        """), {
            "id": mod_id,
            "course_id": course_id,
            "title": mod["title"],
            "description": desc[:4000] if desc else "Content derived from source.",
            "order_index": i + 1
        })

    await db.commit()
    logger.info(f"SUCCESS: Course '{display_title}' inserted as pending_review!")

async def run_crawler():
    logger.info("Starting Autonomous Crawler Engine...")
    while True:
        try:
            async with AsyncSessionLocal() as db:
                for topic in SUPPORTED_CATEGORIES:
                    try:
                        await process_topic(db, topic)
                    except Exception as e:
                        logger.error(f"Error processing {topic}: {e}")
                        await db.rollback()
                    
                    # Sleep briefly between topics to avoid rate limits
                    await asyncio.sleep(10)
            
            logger.info("Cycle complete. Sleeping for 24 hours...")
            await asyncio.sleep(86400) # Run once a day
        except Exception as e:
            logger.error(f"Crawler loop error: {e}")
            await asyncio.sleep(60)

if __name__ == "__main__":
    asyncio.run(run_crawler())
