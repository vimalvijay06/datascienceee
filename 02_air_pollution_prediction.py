"""
02_air_pollution_prediction.py

Reusable prediction module for predicting global Air Quality Index (AQI) categories
based on pollutant measurements and location data.

This script loads the pre-trained scikit-learn Pipeline from:
    models/air_quality_aqi_category_model.joblib
and metadata from:
    models/model_metadata.json

Usage:
    - Import `predict_aqi_category` or `AQICategoryPredictor` in web APIs (Flask/FastAPI),
      dashboards (Streamlit/Dash), or live scrapers.
    - Run standalone to perform a sample test prediction:
      `python 02_air_pollution_prediction.py`
"""

import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Union, Dict, Any, List

# Define relative default model paths
BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH_DEFAULT = BASE_DIR / "models" / "air_quality_aqi_category_model.joblib"
METADATA_PATH_DEFAULT = BASE_DIR / "models" / "model_metadata.json"


class AQICategoryPredictor:
    """
    Production inference wrapper for AQI Category prediction model.
    """

    def __init__(
        self,
        model_path: Union[str, Path] = MODEL_PATH_DEFAULT,
        metadata_path: Union[str, Path] = METADATA_PATH_DEFAULT
    ):
        self.model_path = Path(model_path)
        self.metadata_path = Path(metadata_path)
        self.pipeline = None
        self.metadata = None

        self._load_artifacts()

    def _load_artifacts(self):
        """Loads the serialized scikit-learn pipeline and metadata JSON."""
        if not self.model_path.exists():
            raise FileNotFoundError(
                f"Model file not found at '{self.model_path}'. "
                "Please run '01_air_pollution_ml_training.ipynb' first to train and save the model."
            )
        
        self.pipeline = joblib.load(self.model_path)

        if self.metadata_path.exists():
            with open(self.metadata_path, 'r', encoding='utf-8') as f:
                self.metadata = json.load(f)
        else:
            self.metadata = {}

    def _engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Engineers required numerical interaction features if they are not already present.
        """
        df_feat = df.copy()

        raw_num_cols = ['co_aqi_value', 'ozone_aqi_value', 'no2_aqi_value', 'pm2.5_aqi_value']
        
        # Verify raw numerical columns exist
        missing_raw = [col for col in raw_num_cols if col not in df_feat.columns]
        if missing_raw:
            raise KeyError(f"Input data missing required raw pollutant features: {missing_raw}")

        # Compute engineered features if missing
        if 'pollutant_max' not in df_feat.columns:
            df_feat['pollutant_max'] = df_feat[raw_num_cols].max(axis=1)

        if 'pollutant_mean' not in df_feat.columns:
            df_feat['pollutant_mean'] = df_feat[raw_num_cols].mean(axis=1)

        if 'pollutant_sum' not in df_feat.columns:
            df_feat['pollutant_sum'] = df_feat[raw_num_cols].sum(axis=1)

        if 'pm25_to_ozone_ratio' not in df_feat.columns:
            df_feat['pm25_to_ozone_ratio'] = df_feat['pm2.5_aqi_value'] / (df_feat['ozone_aqi_value'] + 1.0)

        # Default missing country_name to 'Unknown'
        if 'country_name' not in df_feat.columns:
            df_feat['country_name'] = 'Unknown'

        return df_feat

    def predict(
        self,
        input_data: Union[Dict[str, Any], List[Dict[str, Any]], pd.DataFrame],
        return_probabilities: bool = True
    ) -> pd.DataFrame:
        """
        Predicts AQI category for input sample(s).

        Args:
            input_data: A single dict, list of dicts, or pandas DataFrame.
            return_probabilities: Whether to include class probability predictions.

        Returns:
            pd.DataFrame with input features, predicted AQI category, and confidence scores.
        """
        # Convert input into DataFrame
        if isinstance(input_data, dict):
            df_input = pd.DataFrame([input_data])
        elif isinstance(input_data, list):
            df_input = pd.DataFrame(input_data)
        elif isinstance(input_data, pd.DataFrame):
            df_input = input_data.copy()
        else:
            raise TypeError("input_data must be a dict, list of dicts, or pandas DataFrame.")

        # Clean column names (strip trailing tabs/spaces)
        df_input.columns = df_input.columns.str.strip()

        # Preprocess & engineer features
        df_processed = self._engineer_features(df_input)

        # Execute prediction using serialized pipeline
        predictions = self.pipeline.predict(df_processed)

        result_df = df_input.copy()
        result_df['Predicted_AQI_Category'] = predictions

        if return_probabilities and hasattr(self.pipeline, "predict_proba"):
            probabilities = self.pipeline.predict_proba(df_processed)
            max_probabilities = np.max(probabilities, axis=1)
            result_df['Confidence_Score'] = max_probabilities.round(4)
            
            # Optionally add class breakdown
            classes = self.pipeline.classes_
            for i, cls_name in enumerate(classes):
                result_df[f"Prob_{cls_name}"] = probabilities[:, i].round(4)

        return result_df


# Global singleton instance for easy procedural importing
_predictor = None

def predict_aqi_category(
    input_data: Union[Dict[str, Any], List[Dict[str, Any]], pd.DataFrame],
    model_path: Union[str, Path] = MODEL_PATH_DEFAULT
) -> pd.DataFrame:
    """
    Procedural wrapper function to perform AQI Category prediction.
    """
    global _predictor
    if _predictor is None or _predictor.model_path != Path(model_path):
        _predictor = AQICategoryPredictor(model_path=model_path)
    return _predictor.predict(input_data)


if __name__ == "__main__":
    print("=" * 70)
    print(" AIR QUALITY INDEX (AQI) CATEGORY PREDICTION INFERENCE DEMO")
    print("=" * 70)

    sample_inputs = [
        {
            "co_aqi_value": 1,
            "ozone_aqi_value": 36,
            "no2_aqi_value": 0,
            "pm2.5_aqi_value": 51,
            "country_name": "Russian Federation"
        },
        {
            "co_aqi_value": 3,
            "ozone_aqi_value": 139,
            "no2_aqi_value": 1,
            "pm2.5_aqi_value": 158,
            "country_name": "India"
        },
        {
            "co_aqi_value": 0,
            "ozone_aqi_value": 22,
            "no2_aqi_value": 0,
            "pm2.5_aqi_value": 6,
            "country_name": "France"
        }
    ]

    try:
        predictor = AQICategoryPredictor()
        predictions_df = predictor.predict(sample_inputs)
        
        display_cols = ['country_name', 'pm2.5_aqi_value', 'ozone_aqi_value', 'co_aqi_value', 'no2_aqi_value', 'Predicted_AQI_Category', 'Confidence_Score']
        print("\nPrediction Results:")
        print(predictions_df[display_cols].to_string(index=False))
        
        print("\n" + "=" * 70)
        print("Model Metadata Summary:")
        print(json.dumps(predictor.metadata.get("metrics", {}), indent=4))
        print("=" * 70)

    except FileNotFoundError as e:
        print(f"Error: {e}")
