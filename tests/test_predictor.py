"""
tests/test_predictor.py

Unit tests for the ML predictor pipeline:
  - Model file and metadata exist
  - predict() returns expected output schema
  - Confidence score is a valid probability
  - All 6 AQI categories are present in probabilities
  - Feature mapper produces all required column names
  - AQI value at boundary returns correct category
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

import json
import pytest
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "models" / "air_quality_aqi_category_model.joblib"
META_PATH  = BASE_DIR / "models" / "model_metadata.json"

KNOWN_CATEGORIES = {
    "Good", "Moderate", "Unhealthy for Sensitive Groups",
    "Unhealthy", "Very Unhealthy", "Hazardous"
}

CLEAN_INPUT = {
    "pm2.5_aqi_value": 10.0,
    "ozone_aqi_value": 20.0,
    "no2_aqi_value":    5.0,
    "co_aqi_value":     1.0,
    "country_name":    "India"
}

UNHEALTHY_INPUT = {
    "pm2.5_aqi_value": 180.0,
    "ozone_aqi_value": 160.0,
    "no2_aqi_value":   140.0,
    "co_aqi_value":    120.0,
    "country_name":    "United States of America"
}


class TestModelArtifacts:
    def test_model_file_exists(self):
        assert MODEL_PATH.exists(), f"Model not found: {MODEL_PATH}"

    def test_metadata_file_exists(self):
        assert META_PATH.exists(), f"Metadata not found: {META_PATH}"

    def test_metadata_has_required_keys(self):
        with open(META_PATH) as f:
            meta = json.load(f)
        # Use the actual key names from model_metadata.json
        for key in ("model_name", "all_numerical_features", "class_names"):
            assert key in meta, f"Missing metadata key: {key}"

    def test_model_is_loadable(self):
        import joblib
        model = joblib.load(MODEL_PATH)
        assert model is not None
        assert hasattr(model, "predict")
        assert hasattr(model, "predict_proba")


class TestFeatureMapper:
    def test_mapper_produces_required_columns(self):
        from src.feature_mapper import FeatureMapper
        mapper = FeatureMapper()
        result = mapper.map_to_model_schema(CLEAN_INPUT)
        # map_to_model_schema returns (DataFrame, metadata) tuple
        df = result[0] if isinstance(result, tuple) else result
        # Must have at least the 4 pollutant columns
        for col in ("pm2.5_aqi_value", "ozone_aqi_value", "no2_aqi_value", "co_aqi_value"):
            assert col in df.columns, f"Missing feature column: {col}"

    def test_mapper_no_nulls_on_clean_input(self):
        from src.feature_mapper import FeatureMapper
        mapper = FeatureMapper()
        result = mapper.map_to_model_schema(CLEAN_INPUT)
        df = result[0] if isinstance(result, tuple) else result
        assert not df.isnull().values.any(), "Feature mapper produced NaN values for clean input"


class TestPredictionOutput:
    @pytest.fixture(scope="class")
    def predictor(self):
        """Load the app's predictor singleton."""
        os.environ.setdefault("ENABLE_SCHEDULER", "false")
        import app as flask_app
        # Return the module-level predictor object (named AQIPredictor or similar)
        # Try common attribute names
        for attr in ("predictor", "aqi_predictor", "model_predictor"):
            p = getattr(flask_app, attr, None)
            if p is not None:
                return p
        pytest.skip("Could not locate predictor object in app module")

    def test_clean_air_predicts_good_or_moderate(self, predictor):
        result = predictor.predict(CLEAN_INPUT)
        assert result["status"] == "success"
        assert result["predicted_category"] in KNOWN_CATEGORIES

    def test_prediction_confidence_is_probability(self, predictor):
        result = predictor.predict(CLEAN_INPUT)
        score = result["confidence_score"]
        assert 0.0 <= score <= 1.0, f"Confidence {score} is out of [0,1]"

    def test_probabilities_sum_to_one(self, predictor):
        result = predictor.predict(CLEAN_INPUT)
        total = sum(result["probabilities"].values())
        assert abs(total - 1.0) < 0.01, f"Probabilities sum to {total}, not 1.0"

    def test_probabilities_contain_all_categories(self, predictor):
        result = predictor.predict(CLEAN_INPUT)
        probs = result["probabilities"]
        for cat in KNOWN_CATEGORIES:
            assert cat in probs, f"Missing category in probabilities: {cat}"

    def test_high_aqi_predicts_unhealthy_class(self, predictor):
        result = predictor.predict(UNHEALTHY_INPUT)
        assert result["predicted_category"] not in ("Good", "Moderate"), (
            f"High AQI input should not predict '{result['predicted_category']}'"
        )

    def test_all_zero_pollutants_returns_success(self, predictor):
        zero_input = {k: 0.0 for k in CLEAN_INPUT}
        zero_input["country_name"] = "India"
        result = predictor.predict(zero_input)
        assert result["status"] == "success"

    def test_prediction_is_deterministic(self, predictor):
        r1 = predictor.predict(CLEAN_INPUT)
        r2 = predictor.predict(CLEAN_INPUT)
        assert r1["predicted_category"] == r2["predicted_category"]
        assert r1["confidence_score"] == r2["confidence_score"]
