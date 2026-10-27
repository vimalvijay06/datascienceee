# ============================================================
# Dockerfile — Air Quality Dashboard (Flask backend)
# Multi-stage: builds React frontend, serves via Flask static
# ============================================================

# ── Stage 1: Build React frontend ───────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Cache node_modules layer
COPY frontend/package*.json ./
RUN npm ci --silent

# Copy source and build
COPY frontend/ ./
RUN npm run build


# ── Stage 2: Python backend + built frontend ─────────────────
FROM python:3.11-slim

LABEL maintainer="Air Quality Dashboard"
LABEL description="Live web-scraped dashboard for global air pollutant emission violations & AQI prediction"

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first (cached layer)
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY app.py            ./
COPY src/              ./src/
COPY models/           ./models/
COPY config/           ./config/
COPY data/             ./data/
COPY templates/        ./templates/
COPY static/           ./static/
COPY .env.example      ./.env.example

# Copy the compiled React app into the Flask static serving path
# Flask serves frontend/dist/ when FLASK_ENV != development
COPY --from=frontend-builder /app/frontend/dist/ ./frontend/dist/

# Create data directory for SQLite DB
RUN mkdir -p /app/data

# Expose Flask port
EXPOSE 5000

# Health-check (Docker will mark container unhealthy if Flask is down)
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Non-root user for security
RUN useradd -m -u 1001 appuser && chown -R appuser /app
USER appuser

# Start Flask (production mode via gunicorn if available, else flask)
CMD ["python", "app.py"]
