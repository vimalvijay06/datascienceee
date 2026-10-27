import React, { useState, useEffect } from 'react';
import { Sliders, Cpu, Sun, CloudFog, Car, Factory, AlertCircle, Eye, Check } from 'lucide-react';

const STANDARD_COLORS = {
  "Good": "#10B981",
  "Moderate": "#F59E0B",
  "Unhealthy for Sensitive Groups": "#F97316",
  "Unhealthy": "#EF4444",
  "Very Unhealthy": "#A855F7",
  "Hazardous": "#DC2626"
};

// Accessible Color-Blind Safe Palette (Tol / Okabe-Ito inspired)
const COLORBLIND_COLORS = {
  "Good": "#0072B2",       // Blue
  "Moderate": "#56B4E9",   // Sky Blue
  "Unhealthy for Sensitive Groups": "#E69F00", // Orange
  "Unhealthy": "#D55E00",   // Vermilion
  "Very Unhealthy": "#CC79A7", // Reddish Purple
  "Hazardous": "#000000"   // High Contrast Dark
};

export default function AQISimulator({ countries }) {
  const [country, setCountry] = useState('India');
  const [pm25, setPm25] = useState(55);
  const [ozone, setOzone] = useState(36);
  const [no2, setNo2] = useState(15);
  const [co, setCo] = useState(2);
  const [colorBlindMode, setColorBlindMode] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const activeColors = colorBlindMode ? COLORBLIND_COLORS : STANDARD_COLORS;

  const runPrediction = async () => {
    setErrorMsg(null);
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          'pm2.5_aqi_value': parseFloat(pm25),
          ozone_aqi_value: parseFloat(ozone),
          no2_aqi_value: parseFloat(no2),
          co_aqi_value: parseFloat(co),
          country_name: country
        })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setResult(data);
      } else {
        setErrorMsg(data.message || 'Validation error');
      }
    } catch (err) {
      console.error('Prediction error:', err);
      setErrorMsg('Failed to connect to prediction service.');
    }
  };

  useEffect(() => {
    runPrediction();
  }, [pm25, ozone, no2, co, country]);

  const getBadgeStyle = (category) => {
    const color = activeColors[category?.trim()] || '#3B82F6';
    return {
      backgroundColor: `${color}25`,
      color: color,
      border: `1px solid ${color}60`,
      boxShadow: `0 0 15px ${color}40`
    };
  };

  return (
    <section id="simulator" className="dashboard-section">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2><Sliders size={20} /> Predictor Studio</h2>
          <p>Explore hypothetical pollutant level scenarios and evaluate model decision boundaries.</p>
        </div>
        <button
          className={`chip ${colorBlindMode ? 'active' : ''}`}
          onClick={() => setColorBlindMode(!colorBlindMode)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <Eye size={14} /> {colorBlindMode ? 'Accessible Palette (Active)' : 'Enable Color-Blind Palette'}
        </button>
      </div>

      <div className="simulator-grid">
        <div className="glass-card simulator-form">
          <h3>Input Features & Pollutant Telemetry</h3>

          <div className="form-group">
            <label htmlFor="country-select">Country Context:</label>
            <select
              id="country-select"
              className="form-control"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              {(countries || [
                'India', 'United States of America', 'Pakistan', 'China',
                'Bangladesh', 'Germany', 'France', 'Brazil'
              ]).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="slider-group">
            <div className="slider-header">
              <label><CloudFog size={14} /> PM2.5 AQI Sub-index <span style={{ color: '#94A3B8', fontSize: 11 }}>(0–500 scale)</span>:</label>
              <output>{pm25} AQI</output>
            </div>
            <input
              type="range"
              min="0"
              max="500"
              value={pm25}
              onChange={(e) => setPm25(e.target.value)}
            />
          </div>

          <div className="slider-group">
            <div className="slider-header">
              <label><Sun size={14} /> Ozone (O3) AQI Sub-index <span style={{ color: '#94A3B8', fontSize: 11 }}>(0–300 scale)</span>:</label>
              <output>{ozone} AQI</output>
            </div>
            <input
              type="range"
              min="0"
              max="300"
              value={ozone}
              onChange={(e) => setOzone(e.target.value)}
            />
          </div>

          <div className="slider-group">
            <div className="slider-header">
              <label><Car size={14} /> NO2 AQI Sub-index <span style={{ color: '#94A3B8', fontSize: 11 }}>(0–200 scale)</span>:</label>
              <output>{no2} AQI</output>
            </div>
            <input
              type="range"
              min="0"
              max="200"
              value={no2}
              onChange={(e) => setNo2(e.target.value)}
            />
          </div>

          <div className="slider-group">
            <div className="slider-header">
              <label><Factory size={14} /> CO AQI Sub-index <span style={{ color: '#94A3B8', fontSize: 11 }}>(0–150 scale)</span>:</label>
              <output>{co} AQI</output>
            </div>
            <input
              type="range"
              min="0"
              max="150"
              value={co}
              onChange={(e) => setCo(e.target.value)}
            />
          </div>

          {errorMsg && (
            <div style={{ color: '#EF4444', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
              <AlertCircle size={14} /> {errorMsg}
            </div>
          )}

          <button className="btn btn-primary btn-full" onClick={runPrediction} style={{ marginTop: 16 }}>
            <Cpu size={16} /> Execute Model Inference
          </button>
        </div>

        <div className="glass-card simulator-output">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Model Output Analysis</h3>
            <span className="badge-tag info" style={{ fontSize: 11 }}>
              Tuned Random Forest Pipeline
            </span>
          </div>

          {result && (
            <>
              <div className="prediction-hero">
                <div
                  className="hero-category"
                  style={getBadgeStyle(result.predicted_category)}
                >
                  {result.predicted_category}
                </div>
                <div className="hero-confidence">
                  <span>Model Confidence</span>
                  <h4>{(result.confidence_score * 100).toFixed(2)}%</h4>
                </div>
              </div>

              {/* Explicit Mandatory Advisory Disclaimer */}
              <div style={{
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 12,
                color: 'var(--text-secondary, #CBD5E1)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 16
              }}>
                <AlertCircle size={16} style={{ color: '#3B82F6', flexShrink: 0 }} />
                <span>
                  <strong>Model prediction — not an official determination:</strong> This estimated classification is generated for exploratory modeling purposes only.
                </span>
              </div>

              <div className="probability-breakdown">
                <h4>Calibrated Probability Distribution</h4>
                {Object.entries(result.probabilities || {}).map(([cls, prob]) => {
                  const percent = (prob * 100).toFixed(1);
                  const color = activeColors[cls] || '#3B82F6';
                  return (
                    <div key={cls} className="prob-row">
                      <div className="prob-meta">
                        <span>{cls}</span>
                        <strong>{percent}%</strong>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${percent}%`, background: color }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
