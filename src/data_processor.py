"""
src/data_processor.py

Concentration Validation & AQI Breakpoint Transformation Layer.
Converts raw OpenAQ concentrations (PM2.5 µg/m³, O3 ppb/µg/m³, NO2 ppb/µg/m³, CO ppm/mg/m³)
into standard EPA Air Quality Index values (pm2.5_aqi_value, ozone_aqi_value, no2_aqi_value, co_aqi_value).
"""

import math
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("DataProcessor")

def calculate_piecewise_aqi(conc: float, breakpoints: list) -> int:
    """
    Standard EPA AQI piecewise linear equation:
    I = [(I_high - I_low) / (C_high - C_low)] * (C - C_low) + I_low
    """
    if conc < 0:
        return 0

    for c_low, c_high, i_low, i_high in breakpoints:
        if c_low <= conc <= c_high:
            aqi = ((i_high - i_low) / (c_high - c_low)) * (conc - c_low) + i_low
            return int(round(aqi))
    
    # If concentration exceeds highest breakpoint, cap at highest AQI
    last_c_low, last_c_high, last_i_low, last_i_high = breakpoints[-1]
    if conc > last_c_high:
        return int(last_i_high)
        
    return 0


def pm25_concentration_to_aqi(pm25_ugm3: float) -> int:
    """PM2.5 24-hour concentration (µg/m³) to AQI breakpoints."""
    breakpoints = [
        (0.0, 12.0, 0, 50),
        (12.1, 35.4, 51, 100),
        (35.5, 55.4, 101, 150),
        (55.5, 150.4, 151, 200),
        (150.5, 250.4, 201, 300),
        (250.5, 500.4, 301, 500)
    ]
    return calculate_piecewise_aqi(pm25_ugm3, breakpoints)


def ozone_concentration_to_aqi(o3_val: float, unit: str = "ppb") -> int:
    """Ozone concentration to AQI breakpoints. Normalizes µg/m³ to ppb if needed (1 ppb ≈ 1.96 µg/m³)."""
    o3_ppb = o3_val / 1.96 if unit.lower() in ["ug/m3", "µg/m³"] else o3_val
    breakpoints = [
        (0.0, 54.0, 0, 50),
        (55.0, 70.0, 51, 100),
        (71.0, 85.0, 101, 150),
        (86.0, 105.0, 151, 200),
        (106.0, 200.0, 201, 300)
    ]
    return calculate_piecewise_aqi(o3_ppb, breakpoints)


def no2_concentration_to_aqi(no2_val: float, unit: str = "ppb") -> int:
    """NO2 concentration to AQI breakpoints. Normalizes µg/m³ to ppb if needed (1 ppb ≈ 1.88 µg/m³)."""
    no2_ppb = no2_val / 1.88 if unit.lower() in ["ug/m3", "µg/m³"] else no2_val
    breakpoints = [
        (0.0, 53.0, 0, 50),
        (54.0, 100.0, 51, 100),
        (101.0, 360.0, 101, 150),
        (361.0, 649.0, 151, 200),
        (650.0, 1249.0, 201, 300)
    ]
    return calculate_piecewise_aqi(no2_ppb, breakpoints)


def co_concentration_to_aqi(co_val: float, unit: str = "ppm") -> int:
    """CO concentration to AQI breakpoints. Normalizes mg/m³ to ppm if needed (1 ppm ≈ 1.15 mg/m³)."""
    co_ppm = co_val / 1.15 if unit.lower() in ["mg/m3", "mg/m³"] else co_val
    breakpoints = [
        (0.0, 4.4, 0, 50),
        (4.5, 9.4, 51, 100),
        (9.5, 12.4, 101, 150),
        (12.5, 15.4, 151, 200),
        (15.5, 30.4, 201, 300)
    ]
    return calculate_piecewise_aqi(co_ppm, breakpoints)


def transform_openaq_concentrations_to_aqi(raw_pollutants: Dict[str, Any]) -> Dict[str, float]:
    """
    Transforms raw OpenAQ concentration measurements into model-compatible *_aqi_value features.
    """
    transformed = {}

    if "pm2.5" in raw_pollutants:
        val = raw_pollutants["pm2.5"].get("value", 0.0)
        transformed["pm2.5_aqi_value"] = float(pm25_concentration_to_aqi(val))
    elif "pm2.5_concentration" in raw_pollutants:
        val = raw_pollutants["pm2.5_concentration"].get("value", 0.0)
        transformed["pm2.5_aqi_value"] = float(pm25_concentration_to_aqi(val))

    if "o3" in raw_pollutants:
        obj = raw_pollutants["o3"]
        transformed["ozone_aqi_value"] = float(ozone_concentration_to_aqi(obj.get("value", 0.0), obj.get("unit", "ppb")))

    if "no2" in raw_pollutants:
        obj = raw_pollutants["no2"]
        transformed["no2_aqi_value"] = float(no2_concentration_to_aqi(obj.get("value", 0.0), obj.get("unit", "ppb")))

    if "co" in raw_pollutants:
        obj = raw_pollutants["co"]
        transformed["co_aqi_value"] = float(co_concentration_to_aqi(obj.get("value", 0.0), obj.get("unit", "ppm")))

    return transformed


if __name__ == "__main__":
    test_pm25 = 42.0  # µg/m³
    aqi_pm25 = pm25_concentration_to_aqi(test_pm25)
    print(f"PM2.5 concentration: {test_pm25} µg/m³ -> Calculated AQI: {aqi_pm25}")
