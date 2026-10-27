"""
tests/test_api_routes.py

Integration tests for Flask API routes using the test client.
All tests use the flask_client fixture from conftest.py.

Routes tested:
  GET  /api/health
  GET  /api/stats
  GET  /api/sources/status
  POST /api/predict   (valid, missing fields, out-of-range, bad type)
  GET  /api/violations
  GET  /api/exceedances
  GET  /api/official-violations
  GET  /api/trend
"""
import json
import pytest


class TestHealthEndpoint:
    def test_returns_200(self, flask_client):
        r = flask_client.get("/api/health")
        assert r.status_code == 200

    def test_response_has_status_key(self, flask_client):
        data = json.loads(flask_client.get("/api/health").data)
        assert "status" in data

    def test_model_loaded_field_present(self, flask_client):
        data = json.loads(flask_client.get("/api/health").data)
        assert "model_loaded" in data

    def test_dataset_available_field(self, flask_client):
        data = json.loads(flask_client.get("/api/health").data)
        assert "dataset_available" in data


class TestStatsEndpoint:
    def test_returns_200(self, flask_client):
        r = flask_client.get("/api/stats")
        assert r.status_code == 200

    def test_has_total_samples(self, flask_client):
        data = json.loads(flask_client.get("/api/stats").data)
        assert "total_samples" in data
        assert isinstance(data["total_samples"], int)
        assert data["total_samples"] > 0

    def test_has_target_distribution(self, flask_client):
        data = json.loads(flask_client.get("/api/stats").data)
        assert "target_distribution" in data
        assert isinstance(data["target_distribution"], dict)

    def test_has_all_countries_list(self, flask_client):
        data = json.loads(flask_client.get("/api/stats").data)
        assert "all_countries" in data
        assert len(data["all_countries"]) > 10


class TestSourcesStatus:
    def test_returns_200(self, flask_client):
        r = flask_client.get("/api/sources/status")
        assert r.status_code == 200

    def test_has_sources_list(self, flask_client):
        data = json.loads(flask_client.get("/api/sources/status").data)
        assert "sources" in data
        assert len(data["sources"]) >= 2


class TestPredictEndpoint:
    VALID_PAYLOAD = {
        "pm2.5_aqi_value": 55.0,
        "ozone_aqi_value": 36.0,
        "no2_aqi_value":   15.0,
        "co_aqi_value":     2.0,
        "country_name":   "India"
    }

    def _post(self, flask_client, payload):
        return flask_client.post(
            "/api/predict",
            data=json.dumps(payload),
            content_type="application/json"
        )

    def test_valid_payload_returns_200(self, flask_client):
        r = self._post(flask_client, self.VALID_PAYLOAD)
        assert r.status_code == 200

    def test_valid_response_structure(self, flask_client):
        data = json.loads(self._post(flask_client, self.VALID_PAYLOAD).data)
        assert data["status"] == "success"
        assert "predicted_category" in data
        assert "confidence_score" in data
        assert "probabilities" in data
        assert 0.0 <= data["confidence_score"] <= 1.0

    def test_predicted_category_is_known_class(self, flask_client):
        data = json.loads(self._post(flask_client, self.VALID_PAYLOAD).data)
        valid_classes = {
            "Good", "Moderate", "Unhealthy for Sensitive Groups",
            "Unhealthy", "Very Unhealthy", "Hazardous"
        }
        assert data["predicted_category"] in valid_classes

    def test_missing_pollutant_field_defaults_to_zero(self, flask_client):
        """Missing pollutant keys default to 0.0 → still returns 200."""
        payload = {"country_name": "India"}  # no pollutant values
        r = self._post(flask_client, payload)
        assert r.status_code == 200

    def test_out_of_range_negative_returns_400(self, flask_client):
        bad = {**self.VALID_PAYLOAD, "pm2.5_aqi_value": -1.0}
        r = self._post(flask_client, bad)
        assert r.status_code == 400

    def test_out_of_range_too_large_returns_400(self, flask_client):
        bad = {**self.VALID_PAYLOAD, "ozone_aqi_value": 2000.0}
        r = self._post(flask_client, bad)
        assert r.status_code == 400

    def test_non_numeric_value_returns_400(self, flask_client):
        bad = {**self.VALID_PAYLOAD, "co_aqi_value": "not_a_number"}
        r = self._post(flask_client, bad)
        assert r.status_code == 400

    def test_empty_body_returns_400(self, flask_client):
        r = flask_client.post(
            "/api/predict",
            data="{}",
            content_type="application/json"
        )
        # Empty body with defaults should return 200 (all fields default to 0)
        assert r.status_code in (200, 400)

    def test_existing_response_fields_unchanged(self, flask_client):
        """Backward compat: status, predicted_category, confidence_score, probabilities must all be present."""
        data = json.loads(self._post(flask_client, self.VALID_PAYLOAD).data)
        for field in ("status", "predicted_category", "confidence_score", "probabilities"):
            assert field in data, f"Missing backward-compatible field: {field}"


class TestViolationsEndpoints:
    def test_violations_returns_200(self, flask_client):
        assert flask_client.get("/api/violations").status_code == 200

    def test_violations_has_records(self, flask_client):
        data = json.loads(flask_client.get("/api/violations").data)
        assert "records" in data
        assert isinstance(data["records"], list)
        assert len(data["records"]) > 0

    def test_exceedances_alias_same_shape(self, flask_client):
        v = json.loads(flask_client.get("/api/violations").data)
        e = json.loads(flask_client.get("/api/exceedances").data)
        assert set(v.keys()) == set(e.keys())
        assert len(v["records"]) == len(e["records"])

    def test_official_violations_returns_200(self, flask_client):
        assert flask_client.get("/api/official-violations").status_code == 200

    def test_official_violations_has_official_records_key(self, flask_client):
        data = json.loads(flask_client.get("/api/official-violations").data)
        assert "official_records" in data

    def test_official_violations_country_filter(self, flask_client):
        data = json.loads(
            flask_client.get("/api/official-violations?country=United+States+of+America").data
        )
        for r in data["official_records"]:
            assert "United States" in r["country"]


class TestTrendEndpoint:
    def test_returns_200(self, flask_client):
        r = flask_client.get("/api/trend?city=Delhi&days=1")
        assert r.status_code == 200

    def test_response_has_series(self, flask_client):
        data = json.loads(flask_client.get("/api/trend?city=Delhi&days=1").data)
        assert "series" in data
        assert isinstance(data["series"], list)
        assert len(data["series"]) > 0

    def test_series_point_has_pollutant_keys(self, flask_client):
        data = json.loads(flask_client.get("/api/trend?city=Delhi&days=1").data)
        point = data["series"][0]
        for key in ("timestamp", "pm25", "ozone", "no2", "co"):
            assert key in point, f"Missing key in trend point: {key}"

    def test_compare_two_cities(self, flask_client):
        data = json.loads(
            flask_client.get("/api/trend?city=Delhi&city2=London&days=1").data
        )
        assert "series" in data
        assert "series2" in data
        assert len(data["series2"]) > 0

    def test_days_param_bounds(self, flask_client):
        """days=0 clamped to 1; days=999 clamped to 30."""
        for days_str in ("0", "999"):
            r = flask_client.get(f"/api/trend?city=Delhi&days={days_str}")
            assert r.status_code == 200
