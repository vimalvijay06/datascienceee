import React, { useState, useEffect } from 'react';
import { Sliders, Cpu, Sun, CloudFog, Car, Factory } from 'lucide-react';

const AQI_COLORS = {
  "Good": "#10B981",
  "Moderate": "#F59E0B",
  "Unhealthy for Sensitive Groups": "#F97316",
  "Unhealthy": "#EF4444",
  "Very Unhealthy": "#A855F7",
  "Hazardous": "#DC2626"
};

export default function AQISimulator({ countries }) {
  const [country, setCountry] = useState('United States of America');
  const [pm25, setPm25] = useState(51);
  const [ozone, setOzone] = useState(36);
  const [no2, setNo2] = useState(5);
  const [co, setCo] = useState(1);

  const [result, setResult] = useState(null);

  const runPrediction = async () => {
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
      if (data.status === 'success') {
        setResult(data);
      }
    } catch (err) {
      console.error('Prediction error:', err);
    }
  };

  useEffect(() => {
    runPrediction();
  }, [pm25, ozone, no2, co, country]);

  const getBadgeStyle = (category) => {
    const color = AQI_COLORS[category?.trim()] || '#3B82F6';
    return {
      backgroundColor: `${color}25`,
      color: color,
      border: `1px solid ${color}60`,
      boxShadow: `0 0 15px ${color}40`
    };
  };

  return (
    <section id="simulator" className="dashboard-section">
      <div className="section-header">
        <h2><Sliders size={20} /> Interactive AQI Model Simulator</h2>
        <p>Adjust individual pollutant AQI levels to observe machine learning model decision behavior</p>
      </div>

      <div className="simulator-grid">
        <div className="glass-card simulator-form">
          <h3>Input Features</h3>

          <div className="form-group">
            <label htmlFor="country-select">Country:</label>
            <select
              id="country-select"
              className="form-control"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              {(countries || [
                'United States of America', 'India', 'Germany', 'France',
                'Russian Federation', 'Brazil', 'China'
              ]).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="slider-group">
            <div className="slider-header">
              <label><CloudFog size={14} /> PM2.5 AQI Value:</label>
              <output>{pm25}</output>
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
              <label><Sun size={14} /> Ozone AQI Value:</label>
              <output>{ozone}</output>
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
              <label><Car size={14} /> NO2 AQI Value:</label>
              <output>{no2}</output>
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
              <label><Factory size={14} /> CO AQI Value:</label>
              <output>{co}</output>
            </div>
            <input
              type="range"
              min="0"
              max="150"
              value={co}
              onChange={(e) => setCo(e.target.value)}
            />
          </div>

          <button className="btn btn-primary btn-full" onClick={runPrediction}>
            <Cpu size={16} /> Predict AQI Category
          </button>
        </div>

        <div className="glass-card simulator-output">
          <h3>Prediction Results</h3>
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
                  <span>Confidence Score</span>
                  <h4>{(result.confidence_score * 100).toFixed(2)}%</h4>
                </div>
              </div>

              <div className="probability-breakdown">
                <h4>Class Probability Breakdown</h4>
                {Object.entries(result.probabilities || {}).map(([cls, prob]) => {
                  const percent = (prob * 100).toFixed(1);
                  const color = AQI_COLORS[cls] || '#3B82F6';
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
