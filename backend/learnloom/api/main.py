from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
from learnloom.worker.tasks import generate_course_pipeline

app = FastAPI(title="LearnLoom Course Service API", version="1.0.0")

class AutoImportRequest(BaseModel):
    urls: List[str]

class ReviewRequest(BaseModel):
    course_id: str
    action: str # "approve" or "reject"
    feedback: Optional[str] = None

class PublishRequest(BaseModel):
    course_id: str

@app.post("/courses/auto-import")
async def auto_import_courses(request: AutoImportRequest):
    """
    Triggers the automated course generation pipeline for a list of URLs.
    Runs asynchronously via Celery.
    """
    task_ids = []
    for url in request.urls:
        # Dispatch to Celery worker
        task = generate_course_pipeline.delay(url)
        task_ids.append(task.id)
        
    return {"message": f"Started pipeline for {len(request.urls)} sources.", "task_ids": task_ids}

@app.post("/courses/review")
async def review_course(request: ReviewRequest):
    """
    Admin endpoint to review a generated course.
    Transitions status from READY_FOR_REVIEW to APPROVED.
    """
    # In a real app, update the status in Supabase.
    if request.action == "approve":
        print(f"[API] Approving course: {request.course_id}")
        # update status to 'APPROVED'
        return {"message": "Course approved successfully.", "course_id": request.course_id, "status": "APPROVED"}
    else:
        print(f"[API] Rejecting course: {request.course_id}")
        return {"message": "Course rejected.", "course_id": request.course_id, "status": "REJECTED"}

@app.post("/courses/publish")
async def publish_course(request: PublishRequest):
    """
    Admin endpoint to publish an approved course.
    Transitions status from APPROVED to PUBLISHED.
    """
    print(f"[API] Publishing course: {request.course_id}")
    # Update status to 'PUBLISHED' and maybe trigger a build/notification
    return {"message": "Course published successfully.", "course_id": request.course_id, "status": "PUBLISHED"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("learnloom.api.main:app", host="0.0.0.0", port=8000, reload=True)
