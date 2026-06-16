import logging
import azure.functions as func
import os
import uuid
import datetime
from learnloom.integrations.scraping_engine import scraper
from learnloom.integrations.humanizer import humanizer
from learnloom.integrations.originality import originality_checker
from learnloom.integrations.course_builder import course_builder

app = func.FunctionApp()

TARGET_DOMAINS = [
    "https://ocw.mit.edu",
    "https://www.freecodecamp.org/news",
    "https://www.geeksforgeeks.org",
    "https://www.khanacademy.org",
    "https://www.w3schools.com",
    "https://devdocs.io"
]

@app.timer_trigger(schedule="0 0 2 * * *", arg_name="myTimer", run_on_startup=False,
              use_monitor=False) 
def learnloom_factory_cron(myTimer: func.TimerRequest) -> None:
    if myTimer.past_due:
        logging.info('The timer is past due!')

    logging.info('LearnLoom AI Course Factory Timer Trigger executed.')
    
    # In production, we'd iterate over domains, find new sitemap URLs. 
    # For this mock implementation, we select one dummy URL to simulate a discovery hit.
    discovered_urls = ["https://www.freecodecamp.org/news/learn-advanced-ai-patterns/"]
    
    from supabase import create_client, Client
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    
    supabase: Client = None
    if supabase_url and supabase_key:
        supabase = create_client(supabase_url, supabase_key)
        
    for url in discovered_urls:
        job_id = str(uuid.uuid4())
        log_entry(supabase, job_id, url, "STARTED", "Discovered new URL, starting factory pipeline.")
        
        try:
            # 1. Scrape Content
            logging.info(f"Scraping: {url}")
            raw_data = scraper.crawl_source(url)
            log_entry(supabase, job_id, url, "SCRAPED", "Successfully extracted raw content.")
            
            # 2. Humanize
            logging.info("Humanizing content...")
            humanized_text = humanizer.humanize_content(raw_data)
            log_entry(supabase, job_id, url, "HUMANIZED", "Content humanized for beginners.")
            
            # 3. Quality, Originality, Readability Scores
            logging.info("Scoring content...")
            originality = originality_checker.check_originality(humanized_text)
            
            # Mocking Advanced Scores for Factory
            quality_score = 85.0 
            readability_score = 90.0
            
            # 4. Generate Course Schema
            course_schema = course_builder.generate_course_schema(humanized_text, raw_data, originality)
            log_entry(supabase, job_id, url, "SCORED", f"Orig: {originality}, Qual: {quality_score}, Read: {readability_score}")
            
            # 5. Threshold Validation
            if originality >= 80.0 and quality_score >= 80.0 and readability_score >= 80.0:
                # 6. AUTO PUBLISH
                logging.info("Thresholds met. Auto-publishing course...")
                if supabase:
                    db_payload = {
                        "title": course_schema.get("title"),
                        "description": course_schema.get("description"),
                        "instructor_id": "00000000-0000-0000-0000-000000000000",
                        "thumbnail_url": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80",
                        "difficulty_level": "intermediate",
                        "is_published": True, # AUTO PUBLISH IS TRUE
                        "tags": ["auto-published", "azure-factory", "ai"]
                    }
                    res = supabase.table("courses").insert(db_payload).execute()
                    log_entry(supabase, job_id, url, "PUBLISHED", f"Auto-published successfully. ID: {res.data[0]['id']}")
                else:
                    logging.warning("No Supabase connection configured. Dry run complete.")
            else:
                logging.info("Course failed quality thresholds. Rejecting.")
                log_entry(supabase, job_id, url, "FAILED", "Failed quality thresholds. Discarding.")
                
        except Exception as e:
            # 7. Failure Recovery (in real impl we'd enqueue to Azure Service Bus for 3 retries)
            logging.error(f"Factory Exception: {str(e)}")
            log_entry(supabase, job_id, url, "FAILED", f"Exception: {str(e)}")


def log_entry(supabase, job_id, url, status, message):
    if not supabase: return
    try:
        payload = {
            "job_id": job_id,
            "source_url": url,
            "status": status,
            "message": message,
            "created_at": datetime.datetime.utcnow().isoformat()
        }
        supabase.table("automation_logs").insert(payload).execute()
    except Exception as e:
        logging.error(f"Failed to write to automation_logs: {str(e)}")
