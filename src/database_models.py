"""
src/database_models.py

SQLAlchemy Relational Database Schema for data/readings.db.
Provides persistent storage for individual atmospheric pollutant readings with deduplication,
as well as an anomaly / data quality audit log.
Existing data/air_quality.db remains intact and untouched.
"""

from datetime import datetime
from pathlib import Path
from sqlalchemy import (
    create_engine, Column, Integer, String, Float, DateTime, Text, UniqueConstraint
)
from sqlalchemy.orm import declarative_base, sessionmaker

BASE_DIR = Path(__file__).resolve().parent.parent
READINGS_DB_PATH = BASE_DIR / "data" / "readings.db"
READINGS_DB_PATH.parent.mkdir(parents=True, exist_ok=True)

Base = declarative_base()

class AtmosphericReading(Base):
    """
    Individual pollutant reading model deduplicated on (station_id, pollutant, observed_at).
    """
    __tablename__ = "readings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source = Column(String(64), nullable=False, default="OpenAQ")
    station_id = Column(String(128), nullable=False)
    city = Column(String(128), nullable=True)
    country = Column(String(128), nullable=False)
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)
    pollutant = Column(String(32), nullable=False)
    value = Column(Float, nullable=False)
    unit = Column(String(32), nullable=False, default="ug/m3")
    observed_at = Column(String(64), nullable=False)
    collected_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("station_id", "pollutant", "observed_at", name="uq_station_pollutant_time"),
    )

class DataQualityLog(Base):
    """
    Audit log table for recording negative values, sensor spikes, and stale readings
    without silently dropping raw measurements.
    """
    __tablename__ = "data_quality_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    station_id = Column(String(128), nullable=False)
    source = Column(String(64), nullable=False)
    pollutant = Column(String(32), nullable=False)
    raw_value = Column(Float, nullable=True)
    flag_type = Column(String(64), nullable=False) # 'NEGATIVE_VALUE' | 'EXTREME_SPIKE' | 'STALE_SENSOR'
    description = Column(Text, nullable=False)
    flagged_at = Column(DateTime, default=datetime.utcnow)

engine = create_engine(f"sqlite:///{READINGS_DB_PATH}", echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_readings_db():
    Base.metadata.create_all(bind=engine)
