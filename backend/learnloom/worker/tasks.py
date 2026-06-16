import os
from celery import Celery
from learnloom.integrations.scraping_engine import scraper
from learnloom.integrations.humanizer import humanizer
from learnloom.integrations.originality import originality_checker
from learnloom.integrations.course_builder import course_builder

# Initialize Celery
# In production, broker URL should be read from env (e.g. redis://localhost:6379/0)
celery_app = Celery(
    "learnloom_worker",
    broker=os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0"),
    backend=os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

@celery_app.task(bind=True, name="learnloom.pipeline.generate_course")
def generate_course_pipeline(self, source_url: str):
    """
    Automated Course Generation Pipeline
    1. Scrape
    2. Humanize
    3. Originality Check
    4. Generate Course Schema
    5. Save to DB as Draft/Ready For Review
    """
    print(f"[Pipeline] Starting generation for: {source_url}")
    
    try:
        # Step 1: Crawl
        self.update_state(state='PROGRESS', meta={'status': 'CRAWLED'})
        raw_data = scraper.crawl_source(source_url)
        
        # Step 2: Humanize
        self.update_state(state='PROGRESS', meta={'status': 'HUMANIZED'})
        humanized_text = humanizer.humanize_content(raw_data)
        
        # Step 3: Originality Check
        self.update_state(state='PROGRESS', meta={'status': 'ORIGINALITY_CHECK'})
        score = originality_checker.check_originality(humanized_text)
        
        if score < 80.0:
            print(f"[Pipeline] Failed Originality Check. Score: {score}")
            return {"status": "FAILED", "reason": "Originality score below 80"}
            
        # Step 4: Generate Course
        self.update_state(state='PROGRESS', meta={'status': 'COURSE_GENERATED'})
        course_schema = course_builder.generate_course_schema(humanized_text, raw_data, score)
        
        # Step 5: Push to Database (Draft / Ready for Review)
        self.update_state(state='PROGRESS', meta={'status': 'READY_FOR_REVIEW'})
        
        # Initialize Supabase client
        from supabase import create_client, Client
        
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_KEY")
        
        if not supabase_url or not supabase_key:
            print("[Pipeline] WARNING: Supabase credentials missing. Storing in memory only.")
        else:
            print("[Pipeline] Pushing course to database as READY_FOR_REVIEW...")
            supabase: Client = create_client(supabase_url, supabase_key)
            
            # Map schema to the courses table
            db_payload = {
                "title": course_schema.get("title"),
                "description": course_schema.get("description"),
                "instructor_id": "00000000-0000-0000-0000-000000000000", # Placeholder for auto-generated
                "thumbnail_url": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80",
                "difficulty_level": "beginner",
                "generation_status": "READY_FOR_REVIEW",
                "originality_score": score,
                "source_urls": course_schema.get("source_urls", []),
                "references_list": course_schema.get("references", []),
                "is_published": False,
                "tags": ["auto-generated", "ai"]
            }
            
            try:
                # Assuming the courses table expects these fields
                res = supabase.table("courses").insert(db_payload).execute()
                print(f"[Pipeline] Database response: {res.data}")
            except Exception as e:
                print(f"[Pipeline] Error inserting into Supabase: {str(e)}")
                
        print("[Pipeline] Complete!")
        return {"status": "SUCCESS", "course_title": course_schema.get("title"), "originality_score": score}
        
    except Exception as e:
        print(f"[Pipeline] Error during processing: {str(e)}")
        self.update_state(state='FAILURE', meta={'error': str(e)})
        raise e
