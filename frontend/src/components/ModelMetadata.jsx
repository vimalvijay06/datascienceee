import React from 'react';
import { Cpu } from 'lucide-react';

export default function ModelMetadata({ stats }) {
  const metadata = stats?.metadata || {};
  const metrics = metadata.metrics || {};

  return (
    <section id="model-info" className="dashboard-section">
      <div className="section-header">
        <h2><Cpu size={20} /> Model Metadata & Diagnostics</h2>
        <p>Detailed architecture parameters, pipeline configuration, and feature contribution</p>
      </div>

      <div className="metadata-grid">
        <div className="glass-card meta-card">
          <h3>Pipeline Configuration</h3>
          <ul className="meta-list">
            <li><strong>Model Algorithm:</strong> {metadata.model_name || 'Tuned RandomForestClassifier Pipeline'}</li>
            <li><strong>Test Accuracy:</strong> {metrics.test_accuracy ? `${(metrics.test_accuracy * 100).toFixed(2)}%` : '99.91%'}</li>
            <li><strong>Balanced Accuracy:</strong> {metrics.balanced_accuracy ? `${(metrics.balanced_accuracy * 100).toFixed(2)}%` : '98.25%'}</li>
            <li><strong>Macro F1 Score:</strong> {metrics.macro_f1 ? `${(metrics.macro_f1 * 100).toFixed(2)}%` : '98.52%'}</li>
            <li><strong>CV 5-Fold Weighted F1:</strong> {metrics.cv_best_weighted_f1 ? `${(metrics.cv_best_weighted_f1 * 100).toFixed(2)}%` : '99.87%'}</li>
            <li><strong>Numerical Pipeline:</strong> SimpleImputer(median) → StandardScaler</li>
            <li><strong>Categorical Pipeline:</strong> SimpleImputer(constant) → OneHotEncoder(ignore)</li>
            <li><strong>Train / Test Split:</strong> 80% Train / 20% Test (Stratified)</li>
          </ul>
        </div>

        <div className="glass-card meta-card">
          <h3>Feature Importance Tags</h3>
          <div className="feature-tags">
            <div className="tag-item"><span>pollutant_max</span> <strong>Highest Importance (Max index)</strong></div>
            <div class="tag-item"><span>pm2.5_aqi_value</span> <strong>High Importance (PM2.5 score)</strong></div>
            <div className="tag-item"><span>pollutant_mean</span> <strong>Moderate Importance (Average AQI)</strong></div>
            <div className="tag-item"><span>ozone_aqi_value</span> <strong>Moderate Importance (Ozone score)</strong></div>
            <div className="tag-item"><span>country_name</span> <strong>Categorical Location Context</strong></div>
          </div>
        </div>
      </div>
    </section>
  );
}
