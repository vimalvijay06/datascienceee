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


if __name__ == "__main__":
    client = OpenAQv3Client()
    print(f"API Key present: {bool(client.api_key)}")
    try:
        data = client.fetch_location_by_id(2178)
        print(f"Successfully fetched station: {data.get('name')} | Locality: {data.get('locality')}")
    except Exception as e:
        print(f"Fetch result: {e}")
