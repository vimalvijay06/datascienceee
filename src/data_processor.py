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


# ==============================================================================
# PROPER AQI CONVERSION ENGINE (Official Breakpoints, Truncation & CPCB/EPA)
# Controlled by USE_PROPER_AQI_CONVERSION environment variable (Default: False)
# ==============================================================================

import os

USE_PROPER_AQI_CONVERSION = os.getenv("USE_PROPER_AQI_CONVERSION", "false").lower() in ("true", "1", "yes")

# Standard molecular weights at 25°C, 1 atm (1013.25 hPa)
# Conversion formula: C (µg/m³) = C (ppm) * (M / 24.45) * 1000
# Conversely: C (ppm) = C (µg/m³) * (24.45 / M) / 1000
MOL_WEIGHTS = {
    "CO": 28.01,    # 1 ppm ≈ 1.145 mg/m³ ≈ 1145 µg/m³
    "NO2": 46.01,   # 1 ppb ≈ 1.881 µg/m³
    "O3": 48.00,    # 1 ppb ≈ 1.963 µg/m³
    "SO2": 64.07    # 1 ppb ≈ 2.620 µg/m³
}

# US EPA Technical Assistance Document for the Reporting of Daily Air Quality (EPA-454/B-18-007)
EPA_BREAKPOINTS = {
    "PM2.5": [
        # (C_low, C_high, I_low, I_high) in µg/m³, 24-hr avg (truncated to 0.1)
        (0.0, 12.0, 0, 50),
        (12.1, 35.4, 51, 100),
        (35.5, 55.4, 101, 150),
        (55.5, 150.4, 151, 200),
        (150.5, 250.4, 201, 300),
        (250.5, 350.4, 301, 400),
        (350.5, 500.4, 401, 500)
    ],
    "PM10": [
        # µg/m³, 24-hr avg (truncated to integer)
        (0, 54, 0, 50),
        (55, 154, 51, 100),
        (155, 254, 101, 150),
        (255, 354, 151, 200),
        (355, 424, 201, 300),
        (425, 504, 301, 400),
        (505, 604, 401, 500)
    ],
    "O3_8HR": [
        # ppm, 8-hr avg (truncated to 3 decimal places)
        (0.000, 0.054, 0, 50),
        (0.055, 0.070, 51, 100),
        (0.071, 0.085, 101, 150),
        (0.086, 0.105, 151, 200),
        (0.106, 0.200, 201, 300)
    ],
    "CO_8HR": [
        # ppm, 8-hr avg (truncated to 1 decimal place)
        (0.0, 4.4, 0, 50),
        (4.5, 9.4, 51, 100),
        (9.5, 12.4, 101, 150),
        (12.5, 15.4, 151, 200),
        (15.5, 30.4, 201, 300),
        (30.5, 40.4, 301, 400),
        (40.5, 50.4, 401, 500)
    ],
    "NO2_1HR": [
        # ppb, 1-hr avg (truncated to integer)
        (0, 53, 0, 50),
        (54, 100, 51, 100),
        (101, 360, 101, 150),
        (361, 649, 151, 200),
        (650, 1249, 201, 300),
        (1250, 1649, 301, 400),
        (1650, 2049, 401, 500)
    ],
    "SO2_1HR": [
        # ppb, 1-hr avg (truncated to integer)
        (0, 35, 0, 50),
        (36, 75, 51, 100),
        (76, 185, 101, 150),
        (186, 304, 151, 200)
    ]
}

# Central Pollution Control Board (CPCB) India National Air Quality Index Breakpoints
CPCB_BREAKPOINTS = {
    "PM2.5": [
        # µg/m³, 24-hr avg
        (0, 30, 0, 50),
        (31, 60, 51, 100),
        (61, 90, 101, 200),
        (91, 120, 201, 300),
        (121, 250, 301, 400),
        (251, 380, 401, 500)
    ],
    "PM10": [
        # µg/m³, 24-hr avg
        (0, 50, 0, 50),
        (51, 100, 51, 100),
        (101, 250, 101, 200),
        (251, 350, 201, 300),
        (351, 430, 301, 400),
        (431, 500, 401, 500)
    ],
    "NO2": [
        # µg/m³, 24-hr avg
        (0, 40, 0, 50),
        (41, 80, 51, 100),
        (81, 180, 101, 200),
        (181, 280, 201, 300),
        (281, 400, 301, 400),
        (401, 500, 401, 500)
    ],
    "O3": [
        # µg/m³, 8-hr avg
        (0, 50, 0, 50),
        (51, 100, 51, 100),
        (101, 168, 101, 200),
        (169, 208, 201, 300),
        (209, 748, 301, 400),
        (749, 1000, 401, 500)
    ],
    "CO": [
        # mg/m³, 8-hr avg
        (0.0, 1.0, 0, 50),
        (1.1, 2.0, 51, 100),
        (2.1, 10.0, 101, 200),
        (10.1, 17.0, 201, 300),
        (17.1, 34.0, 301, 400),
        (34.1, 50.0, 401, 500)
    ],
    "SO2": [
        # µg/m³, 24-hr avg
        (0, 40, 0, 50),
        (41, 80, 51, 100),
        (81, 380, 101, 200),
        (381, 800, 201, 300),
        (801, 1600, 301, 400),
        (1601, 2000, 401, 500)
    ]
}


def convert_gas_unit(
    value: float,
    pollutant: str,
    from_unit: str,
    to_unit: str,
    temp_c: float = 25.0,
    pressure_hpa: float = 1013.25
) -> float:
    """
    Converts gaseous concentrations between volumetric (ppm, ppb) and mass (ug/m3, mg/m3)
    using ideal gas law: V_mol = (22.414 * (T / 273.15) * (1013.25 / P)).
    At standard 25°C, 1013.25 hPa: V_mol = 24.45 L/mol.
    """
    pol = pollutant.upper().replace(".5", "2.5")
    if pol not in MOL_WEIGHTS:
        return value

    m_weight = MOL_WEIGHTS[pol]
    v_mol = 22.414 * ((temp_c + 273.15) / 273.15) * (1013.25 / pressure_hpa)

    u_from = from_unit.lower().replace("µ", "u").strip()
    u_to = to_unit.lower().replace("µ", "u").strip()

    if u_from == u_to:
        return value

    # First normalize input value to ppm
    ppm_val = 0.0
    if u_from == "ppm":
        ppm_val = value
    elif u_from == "ppb":
        ppm_val = value / 1000.0
    elif u_from == "ug/m3" or u_from == "ug/m^3":
        ppm_val = (value * v_mol) / (m_weight * 1000.0)
    elif u_from == "mg/m3" or u_from == "mg/m^3":
        ppm_val = (value * v_mol) / m_weight
    else:
        return value

    # Convert normalized ppm to requested to_unit
    if u_to == "ppm":
        return ppm_val
    elif u_to == "ppb":
        return ppm_val * 1000.0
    elif u_to == "ug/m3" or u_to == "ug/m^3":
        return (ppm_val * m_weight * 1000.0) / v_mol
    elif u_to == "mg/m3" or u_to == "mg/m^3":
        return (ppm_val * m_weight) / v_mol

    return value


def calculate_epa_aqi(
    conc: float,
    pollutant: str,
    unit: str = "ug/m3",
    temp_c: float = 25.0,
    pressure_hpa: float = 1013.25
) -> int:
    """
    Calculates EPA AQI for a given pollutant applying proper truncation rules:
    - PM2.5: truncate to 1 decimal place (0.1 µg/m³)
    - PM10: truncate to integer (µg/m³)
    - O3: truncate to 3 decimal places (ppm)
    - CO: truncate to 1 decimal place (ppm)
    - NO2: truncate to integer (ppb)
    - SO2: truncate to integer (ppb)
    """
    if conc < 0:
        return 0

    pol = pollutant.upper()

    if pol in ("PM2.5", "PM25"):
        # PM2.5 requires µg/m³ truncated to 1 decimal place
        c_val = math.floor(conc * 10) / 10.0
        return calculate_piecewise_aqi(c_val, EPA_BREAKPOINTS["PM2.5"])

    elif pol == "PM10":
        c_val = math.floor(conc)
        return calculate_piecewise_aqi(c_val, EPA_BREAKPOINTS["PM10"])

    elif pol in ("O3", "OZONE"):
        # Convert to ppm
        ppm_val = convert_gas_unit(conc, "O3", unit, "ppm", temp_c, pressure_hpa)
        # Truncate to 3 decimal places
        c_val = math.floor(ppm_val * 1000) / 1000.0
        return calculate_piecewise_aqi(c_val, EPA_BREAKPOINTS["O3_8HR"])

    elif pol == "CO":
        # Convert to ppm
        ppm_val = convert_gas_unit(conc, "CO", unit, "ppm", temp_c, pressure_hpa)
        # Truncate to 1 decimal place
        c_val = math.floor(ppm_val * 10) / 10.0
        return calculate_piecewise_aqi(c_val, EPA_BREAKPOINTS["CO_8HR"])

    elif pol == "NO2":
        # Convert to ppb
        ppb_val = convert_gas_unit(conc, "NO2", unit, "ppb", temp_c, pressure_hpa)
        c_val = math.floor(ppb_val)
        return calculate_piecewise_aqi(c_val, EPA_BREAKPOINTS["NO2_1HR"])

    elif pol == "SO2":
        ppb_val = convert_gas_unit(conc, "SO2", unit, "ppb", temp_c, pressure_hpa)
        c_val = math.floor(ppb_val)
        return calculate_piecewise_aqi(c_val, EPA_BREAKPOINTS["SO2_1HR"])

    return 0


def calculate_cpcb_aqi(
    conc: float,
    pollutant: str,
    unit: str = "ug/m3",
    temp_c: float = 25.0,
    pressure_hpa: float = 1013.25
) -> int:
    """
    Calculates India CPCB National Air Quality Index (NAQI) using official sub-index breakpoints:
    - PM2.5, PM10, NO2, O3, SO2: µg/m³
    - CO: mg/m³
    """
    if conc < 0:
        return 0

    pol = pollutant.upper()

    if pol in ("PM2.5", "PM25"):
        return calculate_piecewise_aqi(conc, CPCB_BREAKPOINTS["PM2.5"])

    elif pol == "PM10":
        return calculate_piecewise_aqi(conc, CPCB_BREAKPOINTS["PM10"])

    elif pol == "NO2":
        ugm3_val = convert_gas_unit(conc, "NO2", unit, "ug/m3", temp_c, pressure_hpa)
        return calculate_piecewise_aqi(ugm3_val, CPCB_BREAKPOINTS["NO2"])

    elif pol in ("O3", "OZONE"):
        ugm3_val = convert_gas_unit(conc, "O3", unit, "ug/m3", temp_c, pressure_hpa)
        return calculate_piecewise_aqi(ugm3_val, CPCB_BREAKPOINTS["O3"])

    elif pol == "CO":
        mgm3_val = convert_gas_unit(conc, "CO", unit, "mg/m3", temp_c, pressure_hpa)
        return calculate_piecewise_aqi(mgm3_val, CPCB_BREAKPOINTS["CO"])

    elif pol == "SO2":
        ugm3_val = convert_gas_unit(conc, "SO2", unit, "ug/m3", temp_c, pressure_hpa)
        return calculate_piecewise_aqi(ugm3_val, CPCB_BREAKPOINTS["SO2"])

    return 0


def transform_concentrations_proper(
    raw_pollutants: Dict[str, Any],
    standard: str = "EPA"
) -> Dict[str, float]:
    """
    Additive conversion function using proper official breakpoints and standards.
    Standard options: 'EPA' (default) or 'CPCB'.
    """
    transformed = {}
    is_cpcb = standard.upper() == "CPCB"
    aqi_fn = calculate_cpcb_aqi if is_cpcb else calculate_epa_aqi

    # PM2.5
    for k in ("pm2.5", "pm25", "pm2.5_concentration"):
        if k in raw_pollutants:
            item = raw_pollutants[k]
            val = item.get("value", 0.0) if isinstance(item, dict) else float(item)
            unit = item.get("unit", "ug/m3") if isinstance(item, dict) else "ug/m3"
            transformed["pm2.5_aqi_value"] = float(aqi_fn(val, "PM2.5", unit))
            break

    # O3
    for k in ("o3", "ozone"):
        if k in raw_pollutants:
            item = raw_pollutants[k]
            val = item.get("value", 0.0) if isinstance(item, dict) else float(item)
            unit = item.get("unit", "ppb") if isinstance(item, dict) else "ppb"
            transformed["ozone_aqi_value"] = float(aqi_fn(val, "O3", unit))
            break

    # NO2
    for k in ("no2", "nitrogen_dioxide"):
        if k in raw_pollutants:
            item = raw_pollutants[k]
            val = item.get("value", 0.0) if isinstance(item, dict) else float(item)
            unit = item.get("unit", "ppb") if isinstance(item, dict) else "ppb"
            transformed["no2_aqi_value"] = float(aqi_fn(val, "NO2", unit))
            break

    # CO
    for k in ("co", "carbon_monoxide"):
        if k in raw_pollutants:
            item = raw_pollutants[k]
            val = item.get("value", 0.0) if isinstance(item, dict) else float(item)
            unit = item.get("unit", "ppm") if isinstance(item, dict) else "ppm"
            transformed["co_aqi_value"] = float(aqi_fn(val, "CO", unit))
            break

    return transformed


if __name__ == "__main__":
    test_pm25 = 42.0  # µg/m³
    aqi_pm25 = pm25_concentration_to_aqi(test_pm25)
    print(f"PM2.5 concentration: {test_pm25} µg/m³ -> Calculated AQI: {aqi_pm25}")

