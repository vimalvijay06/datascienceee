import pytest
import os
from src.data_processor import (
    calculate_epa_aqi,
    calculate_cpcb_aqi,
    convert_gas_unit,
    transform_concentrations_proper,
    transform_openaq_concentrations_to_aqi,
    pm25_concentration_to_aqi
)

def test_epa_pm25_breakpoints():
    # 0 to 12.0 ug/m3 -> 0 to 50
    assert calculate_epa_aqi(12.0, "PM2.5") == 50
    assert calculate_epa_aqi(0.0, "PM2.5") == 0
    # 35.4 ug/m3 -> 100
    assert calculate_epa_aqi(35.4, "PM2.5") == 100
    # 55.4 ug/m3 -> 150
    assert calculate_epa_aqi(55.4, "PM2.5") == 150
    # 150.4 ug/m3 -> 200
    assert calculate_epa_aqi(150.4, "PM2.5") == 200

def test_cpcb_pm25_breakpoints():
    # CPCB: 0-30 -> 0-50
    assert calculate_cpcb_aqi(30.0, "PM2.5") == 50
    # CPCB: 31-60 -> 51-100
    assert calculate_cpcb_aqi(60.0, "PM2.5") == 100
    # CPCB: 61-90 -> 101-200
    assert calculate_cpcb_aqi(90.0, "PM2.5") == 200

def test_unit_conversion_o3():
    # 1 ppb O3 at 25C, 1 atm ≈ 1.962 ug/m3
    ugm3 = convert_gas_unit(100.0, "O3", "ppb", "ug/m3")
    assert round(ugm3, 1) == 196.2
    # Reverse conversion
    ppb = convert_gas_unit(196.2, "O3", "ug/m3", "ppb")
    assert round(ppb, 0) == 100.0

def test_unit_conversion_no2():
    # 1 ppb NO2 at 25C, 1 atm ≈ 1.881 ug/m3
    ugm3 = convert_gas_unit(50.0, "NO2", "ppb", "ug/m3")
    assert round(ugm3, 1) == 94.0

def test_transform_concentrations_proper():
    raw = {
        "pm2.5": {"value": 25.0, "unit": "ug/m3"},
        "o3": {"value": 45.0, "unit": "ppb"},
        "no2": {"value": 30.0, "unit": "ppb"},
        "co": {"value": 2.0, "unit": "ppm"}
    }
    result_epa = transform_concentrations_proper(raw, standard="EPA")
    assert "pm2.5_aqi_value" in result_epa
    assert "ozone_aqi_value" in result_epa
    assert "no2_aqi_value" in result_epa
    assert "co_aqi_value" in result_epa

def test_backward_compatibility():
    # Verify existing function still behaves identically
    val = pm25_concentration_to_aqi(35.4)
    assert val == 100
    
    raw = {
        "pm2.5": {"value": 35.4},
        "o3": {"value": 40.0, "unit": "ppb"}
    }
    legacy = transform_openaq_concentrations_to_aqi(raw)
    assert legacy["pm2.5_aqi_value"] == 100.0
