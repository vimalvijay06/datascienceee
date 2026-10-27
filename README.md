# 🌍 Global Air Pollution Dashboard

> **Live Web-Scraped Dashboard for Aggregating Global Air Pollutant Emission Violations & AQI Prediction**

A full-stack, production-ready dashboard that ingests real-time sensor data from the OpenAQ v3 API, applies official EPA / CPCB AQI breakpoint conversions, detects atmospheric exceedances against WHO/EPA/CPCB regulatory thresholds, and predicts AQI categories with a scikit-learn Random Forest pipeline.

---

## ✨ Features

| Feature | Details |
|---|---|
| 🔴 **Live OpenAQ Ingestion** | Polls 10+ global cities via OpenAQ v3 REST API with retry/backoff |
| 🔬 **AQI Conversion** | Official EPA & CPCB piecewise-linear breakpoints with proper truncation rules |
| 🚨 **Exceedance Detection** | WHO 2021, US EPA, India CPCB, EU standards — configurable per country |
| 🤖 **ML AQI Prediction** | scikit-learn pipeline (Random Forest) predicting 6 AQI categories with probability |
| 📈 **Trend Chart** | Interactive time-range chart (24h–30d) with pollutant toggles & AQI 100 threshold line |
| 🏙️ **City Compare** | Side-by-side PM2.5/O3/NO2/CO comparison for any two cities with stat pills |
| 🗺️ **Global Map** | Leaflet choropleth of violations by country |
| ♿ **Colorblind Mode** | Okabe-Ito accessible palette toggle throughout the UI |
| 🗄️ **SQLite History** | Persistent hourly readings stored in `data/air_quality.db` |
| 🩺 **Health Endpoint** | `/api/health` for load-balancer/Docker health checks |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Browser (React 19 + Vite)                    │
│  OverviewPage  │  AnalyticsPage  │  ViolationsPage  │  Predict  │
│  TrendChart    │  CompareCities  │  Leaflet Map     │  AQISim   │
└──────────────────────────┬──────────────────────────────────────┘
                           │  Vite proxy → :5000 (dev)
                           │  Direct fetch → :5000 (prod)
┌──────────────────────────▼──────────────────────────────────────┐
│                    Flask REST API (app.py)                       │
│                                                                 │
│  GET  /api/stats            POST /api/predict                   │
│  GET  /api/health           GET  /api/openaq/predict            │
│  GET  /api/sources/status   GET  /api/trend                     │
│  GET  /api/violations       GET  /api/exceedances               │
│  GET  /api/official-violations                                  │
└──────┬────────────────────┬────────────────────┬───────────────┘
       │                    │                    │
┌──────▼──────┐  ┌──────────▼──────┐  ┌─────────▼──────────────┐
│  OpenAQ v3  │  │  scikit-learn   │  │  SQLite                │
│  REST API   │  │  RF Pipeline    │  │  data/air_quality.db   │
│             │  │  models/*.joblib│  │  (SQLAlchemy ORM)      │
└─────────────┘  └─────────────────┘  └────────────────────────┘
       │
┌──────▼────────────────────────────────────────────────────────┐
│  src/  modules                                                │
│  ├── openaq_client.py     → API fetch + retry/backoff         │
│  ├── data_processor.py    → EPA/CPCB AQI breakpoint engine    │
│  ├── feature_mapper.py    → Raw → model feature schema        │
│  └── exceedance_detector.py → WHO/EPA/CPCB threshold checks   │
└───────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- (Optional) Docker + Docker Compose

### 1. Clone & Setup

```bash
git clone <repo-url>
cd "Data sciencee"

# Copy env template
cp .env.example .env
# Edit .env and add your OPENAQ_API_KEY
```

### 2. Backend (Flask)

```bash
pip install -r requirements.txt
python app.py
# → http://127.0.0.1:5000
```

### 3. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## 🐳 Docker (Production)

```bash
# Build & start the full stack
docker compose up --build

# Dashboard: http://localhost:5000
# (React SPA served by Flask from frontend/dist/)
```

```bash
# Development mode (with Vite HMR)
docker compose --profile dev up --build
# Backend:  http://localhost:5000
# Frontend: http://localhost:5173
```

---

## 🧪 Tests

```bash
# Run all tests
python -m pytest

# With coverage report
python -m pytest --cov=src --cov=app --cov-report=term-missing

# Run only fast unit tests (skip integration)
python -m pytest -m "not integration"
```

**Test coverage:**

| Module | Tests |
|---|---|
| `src/data_processor.py` | EPA/CPCB breakpoints, unit conversion, backward-compat |
| `src/exceedance_detector.py` | Standard mapping, threshold logic, legal-violation invariant |
| `src/feature_mapper.py` | Column schema, null safety |
| `app.py` (API routes) | `/health`, `/stats`, `/predict` (valid + invalid), `/violations`, `/trend` |
| `models/*.joblib` | Artifact existence, loadability, prediction schema, probability validity |

---

## 🌐 API Reference

### `GET /api/health`
```json
{ "status": "healthy", "model_loaded": true, "dataset_available": true, "timestamp": "..." }
```

### `POST /api/predict`
**Body:**
```json
{
  "pm2.5_aqi_value": 55.0,
  "ozone_aqi_value": 36.0,
  "no2_aqi_value": 15.0,
  "co_aqi_value": 2.0,
  "country_name": "India"
}
```
**Response:**
```json
{
  "status": "success",
  "predicted_category": "Moderate",
  "confidence_score": 0.87,
  "probabilities": { "Good": 0.02, "Moderate": 0.87, ... }
}
```

### `GET /api/trend?city=Delhi&days=7[&city2=London]`
Returns hourly-bucketed AQI readings for one or two cities.

### `GET /api/violations?country=India&limit=50`
Returns atmospheric exceedance records (sorted by ratio to standard limit).

### `GET /api/official-violations?country=India`
Returns records classified as regulatory exceedances under official national standards.

### `GET /api/sources/status`
Returns live status of all configured data sources.

---

## 📁 Project Structure

```
.
├── app.py                          # Flask REST API + SPA serving
├── requirements.txt                # Pinned Python dependencies
├── .env.example                    # Environment variable template
├── pytest.ini                      # Test configuration
├── Dockerfile                      # Multi-stage Docker build
├── docker-compose.yml              # Full-stack container orchestration
├── MODEL_CARD.md                   # Model documentation
│
├── src/
│   ├── openaq_client.py            # OpenAQ v3 API client
│   ├── data_processor.py           # AQI conversion engine (EPA + CPCB)
│   ├── feature_mapper.py           # Raw data → model feature schema
│   └── exceedance_detector.py      # Regulatory threshold evaluation
│
├── models/
│   ├── air_quality_aqi_category_model.joblib
│   └── model_metadata.json
│
├── config/
│   ├── pollutant_thresholds.json   # WHO / EPA / CPCB thresholds
│   └── regions.json                # City → region mapping
│
├── data/
│   ├── air_quality.db              # SQLite database (auto-created)
│   └── processed/                  # Cached processed data
│
├── tests/
│   ├── conftest.py                 # Shared fixtures (Flask test client)
│   ├── test_aqi_conversion.py      # AQI conversion unit tests
│   ├── test_exceedance_logic.py    # Exceedance detector tests
│   ├── test_api_routes.py          # Flask API integration tests
│   └── test_predictor.py           # ML model & feature mapper tests
│
├── frontend/                       # React 19 + Vite SPA
│   └── src/
│       ├── pages/                  # OverviewPage, AnalyticsPage, ViolationsPage, PredictPage
│       └── components/             # Header, Sidebar, TrendChart, CompareCitiesPanel, ...
│
├── 01_air_pollution_ml_training.ipynb
├── 02_air_pollution_prediction.py
├── 03_openaq_live_ingestion.py
└── 04_model_evaluation.ipynb
```

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|---|---|---|
| `OPENAQ_API_KEY` | *(required)* | OpenAQ v3 API key |
| `FLASK_SECRET_KEY` | `change_me` | Flask session secret |
| `FLASK_DEBUG` | `false` | Enable Flask debug mode |
| `ENABLE_SCHEDULER` | `false` | Enable background ingestion |
| `SCHEDULER_INTERVAL_MINUTES` | `30` | Ingestion interval |
| `USE_PROPER_AQI_CONVERSION` | `false` | Use official EPA/CPCB breakpoints |
| `DATABASE_URL` | `sqlite:///data/air_quality.db` | SQLAlchemy connection string |

---

## 🔒 Safety Notes

- **Never retrain or replace** `models/air_quality_aqi_category_model.joblib` — see `MODEL_CARD.md`
- `is_legal_violation` in the exceedance API is **always `false`** from the detector — only government enforcement agencies can classify legal violations
- API keys should live only in `.env` — `.env` is in `.gitignore`

---

## 📄 License

MIT — see LICENSE file for details.
