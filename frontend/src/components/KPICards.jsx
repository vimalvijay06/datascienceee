import React from 'react';
import { Database, CheckCircle, Globe, Layers } from 'lucide-react';

export default function KPICards({ stats }) {
  const totalSamples = stats?.total_samples?.toLocaleString() || "23,463";
  const totalCountries = stats?.total_countries?.toLocaleString() || "175";
  const accuracy = stats?.metadata?.metrics?.test_accuracy 
    ? `${(stats.metadata.metrics.test_accuracy * 100).toFixed(2)}%` 
    : "99.91%";

  return (
    <section id="overview" className="kpi-grid">
      <div className="kpi-card">
        <div className="kpi-header">
          <span>Total Historical Samples</span>
          <div className="kpi-icon blue"><Database size={18} /></div>
        </div>
        <div className="kpi-value">{totalSamples}</div>
        <div className="kpi-subtext">Global Monitoring Dataset</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-header">
          <span>ML Model Accuracy</span>
          <div className="kpi-icon green"><CheckCircle size={18} /></div>
        </div>
        <div className="kpi-value">{accuracy}</div>
        <div className="kpi-subtext">Tuned RandomForest Pipeline</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-header">
          <span>Countries Covered</span>
          <div className="kpi-icon purple"><Globe size={18} /></div>
        </div>
        <div className="kpi-value">{totalCountries}</div>
        <div className="kpi-subtext">Global Coverage</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-header">
          <span>AQI Target Classes</span>
          <div className="kpi-icon orange"><Layers size={18} /></div>
        </div>
        <div className="kpi-value">6</div>
        <div className="kpi-subtext">Good to Hazardous</div>
      </div>
    </section>
  );
}
