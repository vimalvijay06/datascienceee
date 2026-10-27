"""
src/feature_mapper.py

Feature Adapter for ML Model Input Schema.
Maps processed AQI features to the model's required columns.
Ensures default zero/imputable values are passed so predictions succeed for all monitoring stations.
"""

import pandas as pd
import logging
from typing import Dict, Any, Tuple, Optional

logger = logging.getLogger("FeatureMapper")

REQUIRED_POLLUTANT_FEATURES = ['co_aqi_value', 'ozone_aqi_value', 'no2_aqi_value', 'pm2.5_aqi_value']


class FeatureMapper:
    """
    Adapter converting transformed OpenAQ payload into scikit-learn pipeline input DataFrames.
    """

    def __init__(self):
        self.required_cols = REQUIRED_POLLUTANT_FEATURES + ['country_name']

    def map_to_model_schema(self, observation: Dict[str, Any]) -> Tuple[pd.DataFrame, bool, Optional[str]]:
        """
        Maps an observation dictionary into a single-row DataFrame compatible with the ML pipeline.
        Populates 0.0 for any missing pollutant value so the pipeline's SimpleImputer handles it seamlessly.
        """
        country_name = observation.get("country_name") or "United States of America"

        mapped_data = {
            "country_name": country_name,
            "co_aqi_value": float(observation.get("co_aqi_value") or 0.0),
            "ozone_aqi_value": float(observation.get("ozone_aqi_value") or 0.0),
            "no2_aqi_value": float(observation.get("no2_aqi_value") or 0.0),
            "pm2.5_aqi_value": float(observation.get("pm2.5_aqi_value") or 0.0)
        }

        df_out = pd.DataFrame([mapped_data])
        return df_out, True, None
