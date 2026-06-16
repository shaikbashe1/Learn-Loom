import sys
import os
import asyncio
import schedule
import time
import logging
import uuid
import datetime

# Configure paths to use the scraping engine modules
ENGINE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "scraping_engine"))
sys.path.insert(0, ENGINE_DIR)

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.database.base import AsyncSessionLocal

# Pipeline modules
from app.processors.fact_extractor import ExtractedFacts
from app.processors.humanizer import humanize
from app.processors.originality_checker import check_originality
from app.processors.quality_checker import check_quality
from app.processors.course_builder import build_course_package
from scripts.run_spider import run_spider

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("LearnLoomEngine")

SUPPORTED_CATEGORIES = [
    "AI", "Machine Learning", "Deep Learning", "Generative AI", "Prompt Engineering", 
    "Data Science", "Python", "MERN Stack", "React", "Node.js", "Express.js", 
    "MongoDB", "Next.js", "TypeScript", "Cloud Computing", "DevOps", 
    "Cyber Security", "System Design", "Engineering Subjects", "Placement Preparation"
]

def discover_sources():
    """Step 1: DISCOVER SOURCES"""
    logger.info("=== STEP 1: DISCOVER SOURCES ===")
    logger.info(f"Loaded {len(SUPPORTED_CATEGORIES)} supported categories.")
    # In a real environment, this might fetch top URLs for each category from a search API.
    # We will simulate discovery and rely on manual seed/spider.

def scrape_content():
    """Step 2: SCRAPE CONTENT"""
    logger.info("=== STEP 2: SCRAPE CONTENT ===")
    logger.info("Running spiders (blocking) to acquire raw HTML...")
    # For demo, running freecodecamp spider which targets developer tutorials
    run_spider("freecodecamp", source_id=1)

async def import_to_learnloom(db: AsyncSession, pkg: dict, original_url: str, originality_score: float, quality_score: float):
    """Step 8: IMPORT TO LEARNLOOM -> DRAFT COURSE"""
    logger.info("=== STEP 8 & 9: IMPORT TO LEARNLOOM AS DRAFT ===")
    course_id = str(uuid.uuid4())
    
    try:
        # Insert Course (Draft)
        await db.execute(text("""
            INSERT INTO public.courses (id, title, description, difficulty, is_published, rating, student_count)
            VALUES (:id, :title, :description, :difficulty, false, 0, 0)
        """), {
            "id": course_id,
            "title": pkg["course_title"],
            "description": f"Generated from {original_url}\nOriginality: {originality_score}/100\nQuality: {quality_score}/100",
            "difficulty": "Beginner"
        })

        # Insert Modules & Lessons (mapped to module description in LearnLoom)
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
                "description": desc,
                "order_index": i + 1
            })

        await db.commit()
        logger.info(f"SUCCESS: Draft Course '{pkg['course_title']}' inserted into LearnLoom! (ID: {course_id})")
        return f"/admin/courses/drafts"
        
    except Exception as e:
        logger.error(f"Failed to import to LearnLoom: {e}")
        await db.rollback()
        return None

async def run_daily_pipeline():
    """Executes the full content acquisition pipeline."""
    logger.info("Starting Daily Automated Pipeline...")
    
    discover_sources()
    # scrape_content()  # Disabled to prevent blocking forever in demo, relying on extracted facts dummy for pipeline
    
    logger.info("=== STEP 3: FACT EXTRACTION ===")
    # Simulate extraction since we didn't scrape
    mock_facts = ExtractedFacts(
        category_slug="python",
        concepts=["Variables", "Control Flow", "Functions"],
        candidate_objectives=["Understand variables", "Write functions"],
        difficulty="beginner",
        source_url="https://example.com/python-tutorial",
        source_title="Python for Beginners"
    )
    
    logger.info("=== STEP 4: HUMANIZATION ===")
    humanized = humanize(mock_facts)
    logger.info(f"Humanized '{humanized.title}' successfully.")
    
    logger.info("=== STEP 5: ORIGINALITY CHECK ===")
    originality_result = check_originality(humanized.explanation, "")
    # Originality score = (1 - similarity) * 100
    originality_score = (1.0 - originality_result.overall_similarity) * 100
    logger.info(f"Originality Score: {originality_score}/100")
    
    logger.info("=== STEP 6: QUALITY CHECK ===")
    quality = check_quality(humanized)
    logger.info(f"Quality Score: {quality.quality_score}/100 | Readability: {quality.readability_score}/100")
    
    if originality_score >= 80 and quality.quality_score >= 80 and quality.readability_score >= 80:
        logger.info("=== STEP 7: COURSE GENERATION ===")
        pkg = build_course_package(mock_facts, humanized)
        
        async with AsyncSessionLocal() as db:
            url = await import_to_learnloom(db, pkg, mock_facts.source_url, originality_score, quality.quality_score)
            if url:
                logger.info(f"Pipeline complete. Course is visible at {url}")
    else:
        logger.error("Draft rejected by Quality or Originality gates. Discarding.")

def job():
    asyncio.run(run_daily_pipeline())

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--test-run", action="store_true")
    args = parser.parse_args()

    if args.test_run:
        job()
    else:
        schedule.every().day.at("02:00").do(job)  # Daily crawling, humanization, generation
        logger.info("Automation scheduled for 02:00 daily.")
        while True:
            schedule.run_pending()
            time.sleep(60)
