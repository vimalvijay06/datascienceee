# CHANGELOG

All notable improvements to the **Global Air Pollution Dashboard** are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Step 9] — 2026-10-27 — Final Polish

### Added
- `05_model_evaluation_results.py` — Standalone evaluation script with per-class report, confusion matrix, feature importances, and leakage assessment
- `reports/evaluation_report.md` — Generated evaluation report (Accuracy: 99.915%, Macro F1: 0.9852)
- `CHANGELOG.md` — Full change log of all improvement steps

### Confirmed
- All 52 tests still passing (`python -m pytest`)
- External zip backup created: `air_quality_dashboard_step9_final.zip`

---

## [Step 8] — 2026-10-27 — Packaging & Testing

### Added
- `requirements.txt` — Pinned project-only dependencies (Flask, pandas, scikit-learn, SQLAlchemy, APScheduler, pytest)
- `.env.example` — Safe environment variable template (OPENAQ_API_KEY, FLASK_SECRET_KEY, ENABLE_SCHEDULER, etc.)
- `pytest.ini` — Test discovery config with custom `slow` / `integration` markers
- `tests/conftest.py` — Shared Flask test client fixture
- `tests/test_exceedance_logic.py` — 10 unit tests for ExceedanceDetector (standard mapping, threshold logic, legal-violation safety invariant)
- `tests/test_api_routes.py` — 30 integration tests covering all API endpoints with valid, invalid, and edge-case inputs
- `tests/test_predictor.py` — 6 unit tests for ML model artifacts and FeatureMapper
- `Dockerfile` — Multi-stage build (Node 20 → Python 3.11-slim), with health check and non-root user
- `docker-compose.yml` — Full-stack orchestration with persistent SQLite volume and optional `--profile dev` Vite frontend
- `README.md` — Comprehensive documentation with ASCII architecture diagram, API reference, project structure, env vars

### Test Results
- **52 passed, 7 skipped, 0 failed** (`5.36s`)

---

## [Step 7] — 2026-10-27 — Frontend Improvements

### Added
- `GET /api/trend` — Hourly-bucketed AQI readings for one or two cities from SQLite (with synthetic fallback)
- `frontend/src/components/TrendChart.jsx` — Interactive time-range chart (24h/3d/7d/30d), pollutant toggles, AQI 100 dashed threshold reference line, colorblind palette toggle
- `frontend/src/components/CompareCitiesPanel.jsx` — Side-by-side city comparison with stat pills (Mean AQI, Peak AQI, % above 100)
- `frontend/src/pages/AnalyticsPage.jsx` — Integrated TrendChart and CompareCitiesPanel below existing charts
- `frontend/src/index.css` — Added `--accent-primary` CSS variable alias and `@keyframes spin`

---

## [Step 6] — 2026-10-27 — API Hardening

### Added
- `GET /api/health` — Structured health check (model_loaded, dataset_available, uptime, timestamp)
- `GET /api/sources/status` — Live status of all configured data sources
- `POST /api/predict` — Strict input validation: rejects negative values, values > 1500, non-numeric types (HTTP 400)
- `frontend/src/components/AQISimulator.jsx` — Colorblind-safe Okabe-Ito palette toggle with advisory labels

---

## [Step 5] — 2026-10-27 — Background Scheduler

### Added
- `scheduler.py` — APScheduler-based background ingestion daemon
- Background ingestion disabled by default (`ENABLE_SCHEDULER=false`)
- `SCHEDULER_INTERVAL_MINUTES` environment variable for configurable polling interval

---

## [Step 4] — 2026-10-27 — Database Persistence

### Added
- `data/air_quality.db` — SQLAlchemy SQLite database with `readings` and `data_quality_log` tables
- `src/storage_service.py` — ORM models, upsert logic, data quality logging
- OpenAQ client retry logic with exponential backoff
- `config/regions.json` — City → region / country mapping configuration

---

## [Step 3] — 2026-10-27 — Model Card & Evaluation Notebook

### Added
- `MODEL_CARD.md` — Formal model documentation: intended use, architecture, training data, metrics, limitations, leakage risk discussion
- `04_model_evaluation.ipynb` — Baseline evaluation notebook with leakage risk analysis

---

## [Step 2] — 2026-10-27 — Exceedance Enrichment

### Added
- `GET /api/official-violations` — Records classified as regulatory exceedances under official national standards
- Enriched exceedance metadata: `ratio_to_limit`, `regulatory_standard`, `is_legal_violation`, `legal_notice`
- UI relabeling: "Violations" → "Atmospheric Exceedances" with tooltip clarifying legal vs. scientific distinction
- `config/pollutant_thresholds.json` — WHO 2021, US EPA, India CPCB, EU thresholds with per-country mapping

---

## [Step 1] — 2026-10-27 — Official AQI Conversion

### Added
- `src/data_processor.py` — Official EPA and CPCB piecewise-linear AQI breakpoint engine with proper truncation rules
- `convert_gas_unit()` — Ideal gas law unit conversion (ppm ↔ ppb ↔ µg/m³ ↔ mg/m³)
- `calculate_epa_aqi()`, `calculate_cpcb_aqi()` — Per-pollutant AQI calculators with correct averaging periods
- `tests/test_aqi_conversion.py` — 6 unit tests for conversion accuracy and backward compatibility
- `USE_PROPER_AQI_CONVERSION` env variable (disabled by default to preserve backward compatibility)

---

## [Step 0] — 2026-10-27 — Safety Checkpoint

### Added
- `git init`, `.gitignore`, `improvements` branch
- External zip backup of the original working version (`air_quality_dashboard_backup.zip`)
- Baseline commit `42416d8` preserving the original working state
