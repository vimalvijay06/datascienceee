"""
src/storage_service.py

Raw & Processed Data Storage Engine.
Saves raw API JSON responses under data/raw/openaq/YYYY/MM/DD/ for reproducibility.
Stores processed measurements into SQLite database (data/air_quality.db) and CSV (data/processed/air_quality_measurements.csv).
Implements deduplication handling to prevent duplicate database records.
"""

import os
import json
import sqlite3
import logging
from datetime import datetime
from pathlib import Path
import pandas as pd
from typing import Dict, Any, List, Optional

BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = BASE_DIR / "data" / "raw" / "openaq"
PROCESSED_DIR = BASE_DIR / "data" / "processed"
DB_PATH = BASE_DIR / "data" / "air_quality.db"

logger = logging.getLogger("StorageService")


class StorageService:
    """
    Manages raw JSON archiving, SQLite relational storage, and processed CSV exports.
    """

    def __init__(self, db_path: Path = DB_PATH):
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self):
        """Initializes SQLite database schema with deduplication indices."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS air_quality_measurements (
                measurement_id TEXT PRIMARY KEY,
                source TEXT DEFAULT 'OpenAQ',
                location_id INTEGER,
                sensor_id INTEGER,
                station_name TEXT,
                country_name TEXT,
                city_name TEXT,
                latitude REAL,
                longitude REAL,
                co_aqi_value REAL,
                ozone_aqi_value REAL,
                no2_aqi_value REAL,
                pm25_aqi_value REAL,
                predicted_aqi_category TEXT,
                confidence_score REAL,
                exceedance_status TEXT,
                measurement_timestamp TEXT,
                collected_at TEXT
            )
        """)
        conn.commit()
        conn.close()

    def save_raw_json(self, location_id: int, payload: Dict[str, Any]) -> Path:
        """
        Saves original un-modified API JSON payload under data/raw/openaq/YYYY/MM/DD/.
        """
        now = datetime.utcnow()
        date_dir = RAW_DIR / now.strftime("%Y") / now.strftime("%m") / now.strftime("%d")
        date_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp_str = now.strftime("%Y%m%d_%H%M%S")
        filepath = date_dir / f"raw_{location_id}_{timestamp_str}.json"
        
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)
            
        logger.info(f"Raw API JSON archived to: {filepath}")
        return filepath

    def save_processed_measurement(self, record: Dict[str, Any]) -> bool:
        """
        Inserts processed measurement into SQLite database with deduplication.
        Appends to data/processed/air_quality_measurements.csv.
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        measurement_id = record.get("measurement_id") or f"{record.get('location_id')}_{record.get('measurement_timestamp')}"
        collected_at = datetime.utcnow().isoformat()

        try:
            cursor.execute("""
                INSERT OR IGNORE INTO air_quality_measurements (
                    measurement_id, source, location_id, sensor_id, station_name, country_name,
                    city_name, latitude, longitude, co_aqi_value, ozone_aqi_value, no2_aqi_value,
                    pm25_aqi_value, predicted_aqi_category, confidence_score, exceedance_status,
                    measurement_timestamp, collected_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                measurement_id,
                record.get("source", "OpenAQ"),
                record.get("location_id"),
                record.get("sensor_id"),
                record.get("station_name"),
                record.get("country_name"),
                record.get("city_name"),
                record.get("latitude"),
                record.get("longitude"),
                record.get("co_aqi_value"),
                record.get("ozone_aqi_value"),
                record.get("no2_aqi_value"),
                record.get("pm2.5_aqi_value"),
                record.get("predicted_aqi_category"),
                record.get("confidence_score"),
                record.get("exceedance_status"),
                record.get("measurement_timestamp"),
                collected_at
            ))
            
            changes = conn.total_changes
            conn.commit()

            # Append to CSV
            csv_path = PROCESSED_DIR / "air_quality_measurements.csv"
            df_new = pd.DataFrame([record])
            if not csv_path.exists():
                df_new.to_csv(csv_path, index=False)
            else:
                df_new.to_csv(csv_path, mode="a", header=False, index=False)

            # Additive: Dual-write to new SQLAlchemy store data/readings.db & check quality anomalies
            self._dual_write_readings_db(record)

            return changes > 0

        except Exception as e:
            logger.error(f"Error saving measurement to DB: {e}")
            return False
        finally:
            conn.close()

    def _dual_write_readings_db(self, record: Dict[str, Any]):
        """
        Non-destructively records individual pollutant readings into data/readings.db
        and logs data quality flags (negative values, extreme spikes).
        """
        try:
            from database_models import SessionLocal, AtmosphericReading, DataQualityLog, init_readings_db
            init_readings_db()

            station_id = str(record.get("location_id") or record.get("station_name") or "unknown")
            country = str(record.get("country_name") or "Unknown")
            city = str(record.get("city_name") or record.get("station_name") or "")
            source = str(record.get("source") or "OpenAQ")
            lat = float(record.get("latitude") or 0.0)
            lon = float(record.get("longitude") or 0.0)
            obs_at = str(record.get("measurement_timestamp") or datetime.utcnow().isoformat())

            pollutants_map = {
                "CO": (record.get("co_aqi_value"), "AQI_val"),
                "O3": (record.get("ozone_aqi_value"), "AQI_val"),
                "NO2": (record.get("no2_aqi_value"), "AQI_val"),
                "PM2.5": (record.get("pm2.5_aqi_value") or record.get("pm25_aqi_value"), "AQI_val")
            }

            db_session = SessionLocal()
            try:
                for pol_name, (val, unit) in pollutants_map.items():
                    if val is not None:
                        val_float = float(val)
                        # Check data quality anomalies
                        if val_float < 0:
                            db_session.add(DataQualityLog(
                                station_id=station_id,
                                source=source,
                                pollutant=pol_name,
                                raw_value=val_float,
                                flag_type="NEGATIVE_VALUE",
                                description=f"Negative value observed: {val_float} for {pol_name}"
                            ))
                        elif val_float > 1000:
                            db_session.add(DataQualityLog(
                                station_id=station_id,
                                source=source,
                                pollutant=pol_name,
                                raw_value=val_float,
                                flag_type="EXTREME_SPIKE",
                                description=f"Extreme spike beyond 1000 AQI: {val_float} for {pol_name}"
                            ))

                        # Save reading (deduplicating on station_id, pollutant, observed_at)
                        existing = db_session.query(AtmosphericReading).filter_by(
                            station_id=station_id,
                            pollutant=pol_name,
                            observed_at=obs_at
                        ).first()

                        if not existing:
                            db_session.add(AtmosphericReading(
                                source=source,
                                station_id=station_id,
                                city=city,
                                country=country,
                                lat=lat,
                                lon=lon,
                                pollutant=pol_name,
                                value=val_float,
                                unit=unit,
                                observed_at=obs_at
                            ))

                db_session.commit()
            except Exception as sub_err:
                db_session.rollback()
                logger.warning(f"Dual-write to readings.db skipped due to: {sub_err}")
            finally:
                db_session.close()

        except Exception as err:
            logger.warning(f"Error in dual-write handler: {err}")


    def get_recent_measurements(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieves recent measurements from SQLite database."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM air_quality_measurements ORDER BY collected_at DESC LIMIT ?", (limit,))
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]


if __name__ == "__main__":
    storage = StorageService()
    print(f"Database initialized at: {storage.db_path}")
