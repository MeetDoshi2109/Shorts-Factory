import time
import os
import sys
import logging
from pathlib import Path
import requests
import dotenv

# Load environment variables
PROJECT_ROOT = Path(__file__).parent.parent
dotenv.load_dotenv(PROJECT_ROOT / ".env")

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] poll_runner: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
log = logging.getLogger("poll_runner")

# Supabase details
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    log.error("SUPABASE_URL or SUPABASE_SERVICE_KEY missing in .env")
    sys.exit(1)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

def get_pending_runs():
    url = f"{SUPABASE_URL}/rest/v1/runs?status=eq.pending&limit=1"
    try:
        res = requests.get(url, headers=HEADERS)
        if res.status_code == 200:
            return res.json()
    except Exception as e:
        log.error(f"Error fetching pending runs: {e}")
    return []

def update_run_status(run_id, updates):
    url = f"{SUPABASE_URL}/rest/v1/runs?run_id=eq.{run_id}"
    try:
        res = requests.patch(url, headers=HEADERS, json=updates)
        if res.status_code in [200, 204]:
            log.info(f"Updated run {run_id} status successfully: {updates}")
            return True
        else:
            log.error(f"Failed to update status for {run_id}: {res.status_code} - {res.text}")
    except Exception as e:
        log.error(f"Error updating run status: {e}")
    return False

def execute_pipeline(run):
    run_id = run["run_id"]
    topic = run.get("topic")
    
    # 1. Update status to 'running'
    from datetime import datetime
    update_run_status(run_id, {
        "status": "running",
        "started_at": datetime.now().isoformat()
    })
    
    # 2. Import main pipeline
    sys.path.insert(0, str(PROJECT_ROOT / "backend"))
    from main import run_pipeline
    
    log.info(f"Starting execution of run {run_id} (topic: {topic})")
    
    try:
        # Run local pipeline
        result = run_pipeline(topic=topic, dry_run=False, skip_gate=False)
        
        # 3. Update status to success or failed
        if result.get("success"):
            update_run_status(run_id, {
                "status": "success",
                "finished_at": datetime.now().isoformat(),
                "url": result.get("url"),
                "video_id": result.get("video_id")
            })
        else:
            update_run_status(run_id, {
                "status": "failed",
                "finished_at": datetime.now().isoformat(),
                "error": result.get("error") or "Unknown error"
            })
    except Exception as e:
        log.error(f"Exception during run execution: {e}")
        update_run_status(run_id, {
            "status": "failed",
            "finished_at": datetime.now().isoformat(),
            "error": str(e)
        })

def main():
    log.info("Shorts Factory Cloud Listener is running... Polling for scheduled jobs.")
    while True:
        pending = get_pending_runs()
        if pending:
            run = pending[0]
            log.info(f"Found pending run: {run['run_id']}")
            execute_pipeline(run)
        time.sleep(5)

if __name__ == "__main__":
    main()
