# AQI Category Model — Evaluation Report

**Generated:** 2026-10-27 19:35:50

**Model:** Tuned RandomForestClassifier Pipeline

**Trained:** 2026-08-28  |  **Dataset:** global_air_pollution_data.csv  (23,463 rows)

**Train/Test split:** 18,770 / 4,693  (seed=42, stratified)

---

## Summary Metrics

| Metric | Value |
|---|---|
| Test Accuracy | **99.915%** |
| Balanced Accuracy | 98.246% |
| Macro F1 | 0.9852 |
| Weighted F1 | 0.9991 |
| CV Best Weighted F1 | 0.9987 |
| Classes | 6 |

---

## Per-Class Classification Report

```
                                precision    recall  f1-score   support

                          Good     1.0000    1.0000    1.0000      1987
                     Hazardous     1.0000    0.8947    0.9444        38
                      Moderate     1.0000    1.0000    1.0000      1846
                     Unhealthy     1.0000    1.0000    1.0000       446
Unhealthy for Sensitive Groups     1.0000    1.0000    1.0000       318
                Very Unhealthy     0.9355    1.0000    0.9667        58

                      accuracy                         0.9991      4693
                     macro avg     0.9892    0.9825    0.9852      4693
                  weighted avg     0.9992    0.9991    0.9991      4693

```

---

## Confusion Matrix

```
                                Good  Hazardous  Moderate  Unhealthy  Unhealthy for Sensitive Groups  Very Unhealthy
Good                            1987          0         0          0                               0               0
Hazardous                          0         34         0          0                               0               4
Moderate                           0          0      1846          0                               0               0
Unhealthy                          0          0         0        446                               0               0
Unhealthy for Sensitive Groups     0          0         0          0                             318               0
Very Unhealthy                     0          0         0          0                               0              58
```

---

## Leakage Risk

**Excluded columns:** `aqi_category, aqi_value, co_aqi_category, ozone_aqi_category, no2_aqi_category, pm2.5_aqi_category, city_name`

- No known leaky columns are included as model features [OK]

- The very high accuracy is expected given the dataset's AQI breakpoint structure.

- See `MODEL_CARD.md` for the full discussion.