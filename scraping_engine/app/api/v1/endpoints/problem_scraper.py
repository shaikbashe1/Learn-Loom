from fastapi import APIRouter, HTTPException
import subprocess
import os

router = APIRouter(prefix="/problem-scrape", tags=["Problem Scraping"])

# Track the subprocess globally for simple start/stop control
scraper_process = None

@router.post("/start")
async def start_problem_scraper():
    global scraper_process
    if scraper_process is not None and scraper_process.poll() is None:
        return {"status": "error", "message": "Scraper is already running"}
    
    script_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../problem_engine/run.py"))
    
    # Launch in background
    scraper_process = subprocess.Popen(["python", script_path], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return {"status": "success", "message": "Problem scraper started", "pid": scraper_process.pid}

@router.post("/stop")
async def stop_problem_scraper():
    global scraper_process
    if scraper_process is None or scraper_process.poll() is not None:
        return {"status": "error", "message": "Scraper is not running"}
    
    scraper_process.terminate()
    scraper_process = None
    return {"status": "success", "message": "Problem scraper stopped"}

@router.get("/status")
async def get_problem_scraper_status():
    global scraper_process
    if scraper_process is not None and scraper_process.poll() is None:
        return {"status": "running"}
    return {"status": "stopped"}
