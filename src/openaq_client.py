"""
src/openaq_client.py

Production-grade OpenAQ v3 API Client.
Loads OPENAQ_API_KEY securely from .env using python-dotenv.
Sends X-API-Key headers and handles HTTP errors, rate limiting, and timeouts gracefully.
"""

import os
import json
import logging
import requests
from pathlib import Path
from dotenv import load_dotenv
from typing import Dict, Any, List, Optional

# Load .env variables
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("OpenAQClient")


class OpenAQv3Client:
    """
    OpenAQ v3 API Client.
    Documentation: https://api.openaq.org/v3
    """

    BASE_URL = "https://api.openaq.org/v3"

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("OPENAQ_API_KEY")
        
        if not self.api_key:
            logger.warning("OPENAQ_API_KEY not found in .env or environment parameters.")

        self.session = requests.Session()
        self.session.headers.update({
            "Accept": "application/json",
            "User-Agent": "GlobalAirPollutionLiveDashboard/1.0"
        })

        if self.api_key:
            self.session.headers.update({"X-API-Key": self.api_key})

    def fetch_location_by_id(self, location_id: int) -> Dict[str, Any]:
        """
        Queries GET /v3/locations/{location_id} endpoint.
        """
        url = f"{self.BASE_URL}/locations/{location_id}"
        logger.info(f"Fetching OpenAQ v3 Location ID: {location_id}")

        try:
            res = self.session.get(url, timeout=12)
            if res.status_code == 401:
                logger.error("HTTP 401 Unauthorized: Invalid or missing OpenAQ API key.")
                raise PermissionError("HTTP 401 Unauthorized: Invalid X-API-Key.")
            elif res.status_code == 429:
                logger.error("HTTP 429 Rate Limit Exceeded.")
                raise RuntimeError("HTTP 429 Rate Limit Exceeded.")
            
            res.raise_for_status()
            data = res.json()
            results = data.get("results", [])
            
            if not results:
                raise ValueError(f"No location record returned for ID {location_id}")
            
            return results[0]

        except requests.exceptions.RequestException as e:
            logger.error(f"Network error fetching location {location_id}: {e}")
            raise e

    def fetch_latest_locations(self, limit: int = 10, country_code: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Queries GET /v3/locations endpoint.
        """
        url = f"{self.BASE_URL}/locations"
        params = {"limit": limit}
        if country_code:
            params["countries_id"] = country_code

        try:
            res = self.session.get(url, params=params, timeout=12)
            res.raise_for_status()
            data = res.json()
            return data.get("results", [])
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching locations list: {e}")
            return []

    # ==========================================================================
    # RELIABILITY WRAPPERS (Exponential Backoff, Retries & Cached Fallback)
    # ==========================================================================

    def fetch_with_retry(
        self,
        endpoint_func,
        *args,
        max_retries: int = 3,
        initial_backoff: float = 1.0,
        **kwargs
    ) -> Any:
        """
        Executes an API request with exponential backoff and rate-limit handling.
        """
        import time
        backoff = initial_backoff

        for attempt in range(1, max_retries + 1):
            try:
                return endpoint_func(*args, **kwargs)
            except Exception as e:
                err_str = str(e)
                # Rate limit or transient network error
                if "429" in err_str or "503" in err_str or "502" in err_str:
                    logger.warning(f"Attempt {attempt}/{max_retries} encountered transient error: {err_str}. Backing off {backoff:.2f}s...")
                    time.sleep(backoff)
                    backoff *= 2.0
                elif attempt == max_retries:
                    logger.error(f"All {max_retries} retries exhausted for {endpoint_func.__name__}: {e}")
                    raise e
                else:
                    logger.warning(f"Attempt {attempt}/{max_retries} failed with error: {e}. Retrying...")
                    time.sleep(backoff)
                    backoff *= 1.5

    def fetch_location_cached_fallback(self, location_id: int) -> Dict[str, Any]:
        """
        Tries to fetch live data with retry. If OpenAQ is offline, falls back to the most recent
        archived raw JSON in data/raw/openaq/ to prevent dashboard failures.
        """
        try:
            return self.fetch_with_retry(self.fetch_location_by_id, location_id)
        except Exception as live_err:
            logger.warning(f"OpenAQ live fetch failed for location {location_id}: {live_err}. Searching cached raw archive...")
            raw_base = BASE_DIR / "data" / "raw" / "openaq"
            if raw_base.exists():
                matching_files = sorted(raw_base.glob(f"**/raw_{location_id}_*.json"), key=os.path.getmtime, reverse=True)
                if matching_files:
                    latest_cache = matching_files[0]
                    logger.info(f"Using cached raw file for fallback: {latest_cache}")
                    with open(latest_cache, "r", encoding="utf-8") as f:
                        return json.load(f)
            
            # If no cached file exists, re-raise original error
            raise live_err


if __name__ == "__main__":
    client = OpenAQv3Client()
    print(f"API Key present: {bool(client.api_key)}")
    try:
        data = client.fetch_location_by_id(2178)
        print(f"Successfully fetched station: {data.get('name')} | Locality: {data.get('locality')}")
    except Exception as e:
        print(f"Fetch result: {e}")

