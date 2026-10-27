"""
src/exceedance_detector.py

Exceedance Analysis & Regulatory Enforcement Classifier.
Evaluates live concentrations against configurable threshold standards in config/pollutant_thresholds.json.

Distinguishes:
1. AIR QUALITY EXCEEDANCE (Atmospheric metric exceeding standard threshold)
2. LEGAL / REGULATORY VIOLATION (Authoritative enforcement action filed)
"""

import json
import logging
from pathlib import Path
from typing import Dict, Any, List

BASE_DIR = Path(__file__).resolve().parent.parent
THRESHOLDS_PATH = BASE_DIR / "config" / "pollutant_thresholds.json"

logger = logging.getLogger("ExceedanceDetector")


class ExceedanceDetector:
    """
    Detects pollutant concentration exceedances based on configurable national and international standards.
    """

    def __init__(self, thresholds_file: Path = THRESHOLDS_PATH):
        self.thresholds_data = {}
        if thresholds_file.exists():
            with open(thresholds_file, "r", encoding="utf-8") as f:
                self.thresholds_data = json.load(f)

    def get_standard_for_country(self, country_name: str) -> Dict[str, Any]:
        """Resolves applicable regulatory standard for a country."""
        standards = self.thresholds_data.get("standards", {})
        mapping = self.thresholds_data.get("country_to_standard_map", {})
        std_key = mapping.get(country_name, mapping.get("default", "WHO_2021"))
        return standards.get(std_key, standards.get("WHO_2021", {}))

    def evaluate_observation(self, country_name: str, pollutants: Dict[str, float]) -> List[Dict[str, Any]]:
        """
        Evaluates a dictionary of pollutant concentrations against configured thresholds.
        Returns a list of exceedance status objects.
        """
        standard_info = self.get_standard_for_country(country_name)
        std_name = standard_info.get("name", "WHO Guidelines")
        std_pollutants = standard_info.get("pollutants", {})

        exceedances = []

        for pol, conc in pollutants.items():
            pol_key = pol.upper().replace(".5", "2.5")
            if pol_key in std_pollutants:
                pol_meta = std_pollutants[pol_key]
                limit = pol_meta["limit"]
                unit = pol_meta["unit"]

                is_exceeded = conc > limit
                status = "EXCEEDANCE" if is_exceeded else "NORMAL"
                ratio = round(conc / limit, 2) if limit > 0 else 1.0

                exceedances.append({
                    "pollutant": pol_key,
                    "measured_value": conc,
                    "threshold_limit": limit,
                    "unit": unit,
                    "ratio_to_limit": ratio,
                    "status": status,
                    "regulatory_standard": std_name,
                    "is_legal_violation": False,  # Exceedance is an atmospheric metric, NOT automatically a legal violation
                    "legal_notice": "Atmospheric exceedance metric. Requires regulatory agency audit for legal violation filing."
                })

        return exceedances


if __name__ == "__main__":
    detector = ExceedanceDetector()
    results = detector.evaluate_observation("India", {"PM2.5": 85.0, "O3": 110.0})
    print(json.dumps(results, indent=2))
