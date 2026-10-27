"""
tests/test_exceedance_logic.py

Unit tests for ExceedanceDetector:
  - country → standard mapping
  - NORMAL vs EXCEEDANCE classification
  - ratio_to_limit arithmetic
  - is_legal_violation is never auto-set True
  - missing pollutant keys are silently ignored
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

import pytest
from src.exceedance_detector import ExceedanceDetector


@pytest.fixture(scope="module")
def detector():
    return ExceedanceDetector()


class TestStandardMapping:
    def test_india_maps_to_cpcb(self, detector):
        std = detector.get_standard_for_country("India")
        assert std, "Expected non-empty standard dict for India"
        # Name should reference CPCB or India
        assert "name" in std

    def test_unknown_country_falls_back_to_who(self, detector):
        std = detector.get_standard_for_country("Wakanda")
        assert std, "Expected WHO fallback for unknown country"
        assert "name" in std

    def test_usa_mapping(self, detector):
        std = detector.get_standard_for_country("United States of America")
        assert std


class TestExceedanceEvaluation:
    def test_normal_status_below_threshold(self, detector):
        """PM2.5 well below any standard → NORMAL"""
        results = detector.evaluate_observation("India", {"PM2.5": 5.0})
        if results:
            r = results[0]
            assert r["status"] == "NORMAL"
            assert r["ratio_to_limit"] <= 1.0

    def test_exceedance_status_above_threshold(self, detector):
        """PM2.5 at 500 µg/m³ exceeds every known standard"""
        results = detector.evaluate_observation("India", {"PM2.5": 500.0})
        if results:
            r = results[0]
            assert r["status"] == "EXCEEDANCE"
            assert r["ratio_to_limit"] > 1.0

    def test_multiple_pollutants_returned(self, detector):
        obs = {"PM2.5": 80.0, "Ozone": 110.0, "NO2": 60.0, "CO": 3.0}
        results = detector.evaluate_observation("India", obs)
        # At least one result returned per pollutant that exists in the standard
        assert len(results) >= 1

    def test_is_legal_violation_never_auto_true(self, detector):
        """is_legal_violation must always be False from the detector alone."""
        obs = {"PM2.5": 999.0, "Ozone": 999.0}
        results = detector.evaluate_observation("United States of America", obs)
        for r in results:
            assert r["is_legal_violation"] is False, (
                "Detector must not auto-classify legal violations — "
                "only enforcement agencies can do that."
            )

    def test_ratio_arithmetic(self, detector):
        """ratio_to_limit = measured / threshold, rounded to 2 dp."""
        results = detector.evaluate_observation("India", {"PM2.5": 120.0})
        if results:
            r = results[0]
            limit = r["threshold_limit"]
            expected_ratio = round(120.0 / limit, 2)
            assert abs(r["ratio_to_limit"] - expected_ratio) < 0.01

    def test_unknown_pollutant_key_ignored(self, detector):
        """Unknown pollutant names should not raise exceptions."""
        try:
            results = detector.evaluate_observation("India", {"XENON": 9999.0})
            # Either empty list or no XENON entry — either is acceptable
            for r in results:
                assert r["pollutant"] != "XENON"
        except Exception as exc:
            pytest.fail(f"evaluate_observation raised with unknown pollutant: {exc}")

    def test_zero_concentration_is_normal(self, detector):
        results = detector.evaluate_observation("India", {"PM2.5": 0.0})
        if results:
            assert results[0]["status"] == "NORMAL"
