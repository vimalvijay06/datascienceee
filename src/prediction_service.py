"""
src/prediction_service.py

ML Prediction Service.
Uses AQICategoryPredictor from 02_air_pollution_prediction.py to automatically engineer interaction features
(pollutant_max, pollutant_mean, pollutant_sum, pm25_to_ozone_ratio) and execute model predictions.
"""

import os
import sys
import importlib.util
import pandas as pd
import logging
from pathlib import Path
from typing import Dict, Any, Tuple

BASE_DIR = Path(__file__).resolve().parent.parent
PRED_SCRIPT = BASE_DIR / "02_air_pollution_prediction.py"

spec = importlib.util.spec_from_file_location("air_pollution_prediction", PRED_SCRIPT)
pred_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pred_module)

AQICategoryPredictor = pred_module.AQICategoryPredictor

logger = logging.getLogger("PredictionService")


class PredictionService:
    """
    Service for executing predictions using AQICategoryPredictor.
    """

    def __init__(self):
        self.predictor = AQICategoryPredictor()

    def predict_observation(self, df_input: pd.DataFrame) -> Tuple[str, float, Dict[str, float]]:
        """
        Executes prediction on a single-row or multi-row DataFrame with feature engineering.
        Returns (predicted_category, confidence_score, probability_dict).
        """
        res_df = self.predictor.predict(df_input, return_probabilities=True)
        row = res_df.iloc[0]

        cat = str(row["Predicted_AQI_Category"])
        confidence = float(row.get("Confidence_Score", 1.0))

        prob_cols = [c for c in res_df.columns if c.startswith("Prob_")]
        probs = {}
        for c in prob_cols:
            cls_name = c.replace("Prob_", "")
            probs[cls_name] = float(row[c])

        return cat, confidence, probs


if __name__ == "__main__":
    service = PredictionService()
    df_test = pd.DataFrame([{
        "co_aqi_value": 1.0,
        "ozone_aqi_value": 36.0,
        "no2_aqi_value": 0.0,
        "pm2.5_aqi_value": 51.0,
        "country_name": "United States of America"
    }])
    cat, conf, probs = service.predict_observation(df_test)
    print(f"Prediction: {cat} (Confidence: {conf:.4f})")
