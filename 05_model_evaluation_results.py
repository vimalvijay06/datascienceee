"""
05_model_evaluation_results.py

Standalone evaluation script for the AQI Category prediction model.
Loads the trained pipeline, runs inference on the test split of the dataset,
and produces a full evaluation report including:
  - Classification report (per-class precision, recall, F1)
  - Confusion matrix
  - Cross-validation summary
  - Feature importance ranking
  - Leakage risk assessment

Output:
  Prints to console + saves to reports/evaluation_report.md

Usage:
    python 05_model_evaluation_results.py
"""

import json
import warnings
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime

warnings.filterwarnings("ignore")

BASE_DIR = Path(__file__).resolve().parent

# ── Load artifacts ────────────────────────────────────────────────────────────
MODEL_PATH = BASE_DIR / "models" / "air_quality_aqi_category_model.joblib"
META_PATH  = BASE_DIR / "models" / "model_metadata.json"
DATA_PATH  = BASE_DIR / "global_air_pollution_data.csv"
REPORT_DIR = BASE_DIR / "reports"
REPORT_DIR.mkdir(exist_ok=True)

print("=" * 70)
print("  AQI CATEGORY MODEL — EVALUATION REPORT")
print(f"  Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 70)

# Load model
pipeline = joblib.load(MODEL_PATH)
print(f"\n[OK] Loaded model: {MODEL_PATH.name}")

# Load metadata
with open(META_PATH) as f:
    meta = json.load(f)

print(f"[OK] Loaded metadata: {META_PATH.name}")
print(f"   Model       : {meta['model_name']}")
print(f"   Trained on  : {meta['training_date'][:10]}")
print(f"   Dataset     : {meta['dataset_filename']}  ({meta['dataset_shape'][0]:,} rows × {meta['dataset_shape'][1]} cols)")
print(f"   Train/Test  : {meta['train_size']:,} / {meta['test_size']:,}")
print(f"   Classes     : {meta['number_of_classes']}  → {meta['class_names']}")

# ── Load & prepare dataset ────────────────────────────────────────────────────
df = pd.read_csv(DATA_PATH)
# Strip trailing whitespace/tabs from column names (CSV encoding artefact)
df.columns = [c.strip() for c in df.columns]
print(f"\n[OK] Loaded dataset: {len(df):,} rows")

TARGET = meta["target_column"]   # "aqi_category"
NUM_FEATURES = meta["all_numerical_features"]
CAT_FEATURES = meta["all_categorical_features"]

# Drop rows with missing target
df = df.dropna(subset=[TARGET])

# Engineer interaction features (same as training)
df["pollutant_max"]        = df[["co_aqi_value","ozone_aqi_value","no2_aqi_value","pm2.5_aqi_value"]].max(axis=1)
df["pollutant_mean"]       = df[["co_aqi_value","ozone_aqi_value","no2_aqi_value","pm2.5_aqi_value"]].mean(axis=1)
df["pollutant_sum"]        = df[["co_aqi_value","ozone_aqi_value","no2_aqi_value","pm2.5_aqi_value"]].sum(axis=1)
df["pm25_to_ozone_ratio"]  = df["pm2.5_aqi_value"] / (df["ozone_aqi_value"] + 1e-6)

ALL_FEATURES = NUM_FEATURES + CAT_FEATURES
X = df[ALL_FEATURES].fillna(0)
y = df[TARGET]

# Reproducible test split (same seed as training)
from sklearn.model_selection import train_test_split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=meta["random_state"], stratify=y
)

print(f"   Test split  : {len(X_test):,} rows  (seed={meta['random_state']})")

# ── Predictions ───────────────────────────────────────────────────────────────
from sklearn.metrics import (
    classification_report, confusion_matrix,
    accuracy_score, balanced_accuracy_score, f1_score
)

y_pred = pipeline.predict(X_test)
y_prob = pipeline.predict_proba(X_test)

# ── Metrics ───────────────────────────────────────────────────────────────────
acc      = accuracy_score(y_test, y_pred)
bal_acc  = balanced_accuracy_score(y_test, y_pred)
macro_f1 = f1_score(y_test, y_pred, average="macro", zero_division=0)
wt_f1    = f1_score(y_test, y_pred, average="weighted", zero_division=0)

print("\n" + "─" * 70)
print("  CLASSIFICATION METRICS (Test Set)")
print("─" * 70)
print(f"  Accuracy           : {acc:.6f}  ({acc*100:.3f}%)")
print(f"  Balanced Accuracy  : {bal_acc:.6f}  ({bal_acc*100:.3f}%)")
print(f"  Macro F1           : {macro_f1:.6f}")
print(f"  Weighted F1        : {wt_f1:.6f}")
print(f"  CV Best Weighted F1: {meta['metrics']['cv_best_weighted_f1']:.6f}  (from training)")

# Cross-validate metadata values vs live run
meta_acc = meta["metrics"]["test_accuracy"]
delta_acc = abs(acc - meta_acc)
print(f"\n  [INFO] Metadata accuracy vs live: Δ = {delta_acc:.8f} {'[OK] MATCH' if delta_acc < 1e-4 else '[WARN]  DRIFT'}")

# ── Per-class report ──────────────────────────────────────────────────────────
print("\n" + "─" * 70)
print("  PER-CLASS CLASSIFICATION REPORT")
print("─" * 70)
cls_report = classification_report(y_test, y_pred, digits=4, zero_division=0)
print(cls_report)

# ── Confusion matrix ──────────────────────────────────────────────────────────
print("─" * 70)
print("  CONFUSION MATRIX (rows=actual, cols=predicted)")
print("─" * 70)
class_names = sorted(y_test.unique())
cm = confusion_matrix(y_test, y_pred, labels=class_names)
cm_df = pd.DataFrame(cm, index=class_names, columns=class_names)
print(cm_df.to_string())

# ── Feature importances ────────────────────────────────────────────────────────
print("\n" + "─" * 70)
print("  FEATURE IMPORTANCE (Random Forest mean decrease in impurity)")
print("─" * 70)
try:
    # Get the RF classifier from the pipeline
    rf_step = None
    for name, step in pipeline.steps:
        if hasattr(step, "feature_importances_"):
            rf_step = step
            break
    
    if rf_step is not None:
        importances = rf_step.feature_importances_
        # Get feature names after preprocessing (OHE expands categoricals)
        try:
            pre_step = pipeline.named_steps.get("preprocessor") or pipeline.named_steps.get("preprocessing")
            if pre_step is not None and hasattr(pre_step, "get_feature_names_out"):
                feat_names = list(pre_step.get_feature_names_out())
            else:
                feat_names = ALL_FEATURES
        except Exception:
            feat_names = [f"feature_{i}" for i in range(len(importances))]

        # Truncate to match length
        min_len = min(len(feat_names), len(importances))
        feat_names = feat_names[:min_len]
        importances = importances[:min_len]

        imp_df = pd.DataFrame({"Feature": feat_names, "Importance": importances})
        imp_df = imp_df.sort_values("Importance", ascending=False).head(15)
        for _, row in imp_df.iterrows():
            bar = "█" * int(row["Importance"] * 60)
            print(f"  {row['Feature']:<35} {row['Importance']:.6f}  {bar}")
    else:
        print("  [WARN]  Could not extract feature importances from pipeline.")
except Exception as e:
    print(f"  [WARN]  Feature importance extraction failed: {e}")

# ── Leakage risk assessment ────────────────────────────────────────────────────
print("\n" + "─" * 70)
print("  LEAKAGE RISK ASSESSMENT")
print("─" * 70)
excluded = meta.get("excluded_columns", [])
KNOWN_LEAKY = ["aqi_value", "co_aqi_category", "ozone_aqi_category",
               "no2_aqi_category", "pm2.5_aqi_category"]
leaky_in_features = [c for c in ALL_FEATURES if c in KNOWN_LEAKY]
print(f"  Known leaky columns excluded: {excluded}")
if leaky_in_features:
    print(f"  [WARN]  WARNING: Potential leaky features found in model input: {leaky_in_features}")
else:
    print(f"  [OK] No known leaky columns present in model feature set.")
print(f"  Note: Very high accuracy ({acc*100:.2f}%) may reflect dataset structure.")
print(f"        See MODEL_CARD.md for full leakage discussion.")

# ── Save markdown report ───────────────────────────────────────────────────────
report_lines = [
    "# AQI Category Model — Evaluation Report",
    f"\n**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
    f"\n**Model:** {meta['model_name']}",
    f"\n**Trained:** {meta['training_date'][:10]}  |  **Dataset:** {meta['dataset_filename']}  ({meta['dataset_shape'][0]:,} rows)",
    f"\n**Train/Test split:** {meta['train_size']:,} / {meta['test_size']:,}  (seed=42, stratified)",
    "\n---",
    "\n## Summary Metrics",
    "\n| Metric | Value |",
    "|---|---|",
    f"| Test Accuracy | **{acc*100:.3f}%** |",
    f"| Balanced Accuracy | {bal_acc*100:.3f}% |",
    f"| Macro F1 | {macro_f1:.4f} |",
    f"| Weighted F1 | {wt_f1:.4f} |",
    f"| CV Best Weighted F1 | {meta['metrics']['cv_best_weighted_f1']:.4f} |",
    f"| Classes | {meta['number_of_classes']} |",
    "\n---",
    "\n## Per-Class Classification Report",
    "\n```",
    cls_report,
    "```",
    "\n---",
    "\n## Confusion Matrix",
    "\n```",
    cm_df.to_string(),
    "```",
    "\n---",
    "\n## Leakage Risk",
    f"\n**Excluded columns:** `{', '.join(excluded)}`",
    "\n- No known leaky columns are included as model features [OK]" if not leaky_in_features
    else f"\n- [WARN] Potential leaky features detected: `{', '.join(leaky_in_features)}`",
    "\n- The very high accuracy is expected given the dataset's AQI breakpoint structure.",
    "\n- See `MODEL_CARD.md` for the full discussion.",
]

report_path = REPORT_DIR / "evaluation_report.md"
with open(report_path, "w", encoding="utf-8") as f:
    f.write("\n".join(report_lines))

print("\n" + "=" * 70)
print(f"  [OK] Markdown report saved → {report_path}")
print("=" * 70)
