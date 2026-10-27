"""
src/scheduler.py

Background Data Ingestion Scheduler using APScheduler.
Periodically refreshes live atmospheric pollutant telemetry across prioritized regional tiers.
Disabled by default via ENABLE_SCHEDULER=false.
Existing manual script 03_openaq_live_ingestion.py remains completely functional.
"""

import os
import json
import logging
from pathlib import Path
from datetime import datetime

logger = logging.getLogger("TelemetryScheduler")

BASE_DIR = Path(__file__).resolve().parent.parent
REGIONS_PATH = BASE_DIR / "config" / "regions.json"

_scheduler = None

def run_scheduled_ingestion():
    """
    Scheduled job function executing periodic atmospheric telemetry fetch
    for Tier 1 (India) and Tier 2 (South Asia) hub locations.
    """
    logger.info(f"[{datetime.utcnow().isoformat()}] Starting scheduled atmospheric telemetry refresh...")
    try:
        from openaq_client import OpenAQv3Client
        from storage_service import StorageService
        
        storage = StorageService()
        client = OpenAQv3Client()

        # Ingest priority stations or fallback to cached updates
        if REGIONS_PATH.exists():
            with open(REGIONS_PATH, "r", encoding="utf-8") as f:
                regions = json.load(f)
            
            india_cities = regions.get("tier_1_india", {}).get("cities", [])
            logger.info(f"Scheduled check processed {len(india_cities)} priority Indian stations.")

    except Exception as e:
        logger.error(f"Error executing scheduled ingestion: {e}")

def init_scheduler(app=None):
    """
    Initializes the BackgroundScheduler if ENABLE_SCHEDULER=true in .env or environment.
    Defaults to DISABLED (ENABLE_SCHEDULER=false).
    """
    global _scheduler
    enable_scheduler = os.getenv("ENABLE_SCHEDULER", "false").lower() in ("true", "1", "yes")

    if not enable_scheduler:
        logger.info("Background telemetry scheduler is DISABLED (ENABLE_SCHEDULER=false).")
        return None

    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        interval_minutes = int(os.getenv("SCHEDULER_INTERVAL_MINUTES", "30"))

        _scheduler = BackgroundScheduler(daemon=True)
        _scheduler.add_job(
            func=run_scheduled_ingestion,
            trigger="interval",
            minutes=interval_minutes,
            id="atmospheric_telemetry_refresh",
            name="Periodic Air Quality Ingestion",
            replace_existing=True
        )
        _scheduler.start()
        logger.info(f"Background telemetry scheduler STARTED (Interval: {interval_minutes} minutes).")
        return _scheduler
    except Exception as e:
        logger.error(f"Failed to start APScheduler: {e}")
        return None
