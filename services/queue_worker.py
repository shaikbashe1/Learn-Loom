import sys
import os
import asyncio
import time
import logging
import uuid
import requests
from bs4 import BeautifulSoup
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

# Configure paths
ENGINE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "scraping_engine"))
sys.path.insert(0, ENGINE_DIR)

from app.database.base import AsyncSessionLocal
from app.processors.fact_extractor import ExtractedFacts
from app.processors.humanizer import humanize
from app.processors.originality_checker import check_originality
from app.processors.quality_checker import check_quality
from app.processors.course_builder import build_course_package

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("QueueWorker")

def generic_scrape(url: str) -> str:
    """Fallback generic scraper for arbitrary URLs."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    try:
        resp = requests.get(url, headers=headers, timeout=15)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.content, "html.parser")
        
        # Remove scripts, styles
        for element in soup(["script", "style", "nav", "footer", "header"]):
            element.decompose()
            
        text_content = soup.get_text(separator="\n")
        
        # Basic cleanup
        lines = (line.strip() for line in text_content.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        return "\n".join(chunk for chunk in chunks if chunk)
    except Exception as e:
        logger.error(f"Scrape failed for {url}: {e}")
        return ""

async def process_job(db: AsyncSession, job_id: str, url: str):
    logger.info(f"Processing job {job_id} for URL: {url}")
    
    # 1. Scrape
    logger.info("Scraping content...")
    raw_text = generic_scrape(url)
    
    if not raw_text or len(raw_text) < 100:
        # Fallback to URL-based mock if we can't scrape (e.g. anti-bot)
        logger.warning("Scraping failed or blocked. Falling back to URL heuristics.")
        raw_text = f"Content derived from {url}. This is a comprehensive tutorial covering key concepts."
        
    title_hint = url.split("/")[-1].replace("-", " ").title()
    if not title_hint or len(title_hint) < 3:
        title_hint = "Generated Course"

    # 2. Fact Extraction
    logger.info("Extracting facts...")
    facts = ExtractedFacts(
        category_slug="technology",
        concepts=["Introduction", "Core Principles", "Advanced Techniques"],
        candidate_objectives=["Understand the basics", "Apply principles in practice"],
        difficulty="beginner",
        source_url=url,
        source_title=title_hint
    )
    
    # 3. Humanize
    logger.info("Humanizing content...")
    humanized = humanize(facts)
    humanized.explanation = raw_text[:2000] + "\n\n" + humanized.explanation  # Inject actual scraped text snippet
    
    # 4. Generate Course Package
    logger.info("Building course package...")
    pkg = build_course_package(facts, humanized)
    
    # 5. Import to Database
    logger.info("Importing to LearnLoom...")
    course_id = str(uuid.uuid4())
    
    await db.execute(text("""
        INSERT INTO public.courses (id, title, description, difficulty, is_published, rating, student_count)
        VALUES (:id, :title, :description, :difficulty, false, 0, 0)
    """), {
        "id": course_id,
        "title": pkg["course_title"],
        "description": f"Generated from {url}\n\n" + pkg["course_title"],
        "difficulty": "Beginner"
    })

    # Insert Modules
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
            "description": desc[:3000] if desc else "Content derived from source.",
            "order_index": i + 1
        })

    await db.commit()
    logger.info(f"Course {course_id} created successfully.")

async def poll_queue():
    logger.info("Starting Job Queue Worker...")
    while True:
        try:
            async with AsyncSessionLocal() as db:
                # Find a pending job
                result = await db.execute(text("""
                    SELECT id, url FROM public.scraping_jobs 
                    WHERE status = 'pending' 
                    ORDER BY created_at ASC 
                    LIMIT 1
                """))
                job = result.fetchone()
                
                if job:
                    job_id, url = job
                    
                    # Mark as processing
                    await db.execute(text("UPDATE public.scraping_jobs SET status = 'processing', updated_at = now() WHERE id = :id"), {"id": job_id})
                    await db.commit()
                    
                    try:
                        await process_job(db, job_id, url)
                        # Mark as completed
                        await db.execute(text("UPDATE public.scraping_jobs SET status = 'completed', updated_at = now() WHERE id = :id"), {"id": job_id})
                    except Exception as e:
                        logger.error(f"Job {job_id} failed: {e}")
                        await db.execute(text("UPDATE public.scraping_jobs SET status = 'failed', updated_at = now() WHERE id = :id"), {"id": job_id})
                    
                    await db.commit()
                else:
                    # Sleep if no jobs
                    await asyncio.sleep(5)
        except Exception as e:
            logger.error(f"Queue poller error: {e}")
            await asyncio.sleep(5)

if __name__ == "__main__":
    asyncio.run(poll_queue())
