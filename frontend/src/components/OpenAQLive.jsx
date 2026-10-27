import React, { useState, useEffect } from 'react';
import { Radio, Zap, CloudDownload, AlertTriangle, Globe } from 'lucide-react';

const AQI_COLORS = {
  "Good": "#10B981",
  "Moderate": "#F59E0B",
  "Unhealthy for Sensitive Groups": "#F97316",
  "Unhealthy": "#EF4444",
  "Very Unhealthy": "#A855F7",
  "Hazardous": "#DC2626"
};

const CITIES = ["Delhi", "New York", "London", "Paris", "Tokyo", "Berlin", "Sao Paulo", "Moscow", "Sydney", "Beijing", "Mumbai"];

export default function OpenAQLive({ openaqKey }) {
  const [selectedCity, setSelectedCity] = useState("Delhi");
  const [locationId, setLocationId] = useState(2178);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchLive = async (targetCity = selectedCity, targetId = locationId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/openaq/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: targetCity,
          location_id: parseInt(targetId),
          api_key: openaqKey || null
        })
      });
      const json = await res.json();
      if (json.status === 'success') {
        setData(json);
      } else {
        setError(json.message || 'Error ingesting live sensor data');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLive("Delhi");
  }, []);

  const handleCityChange = (cityName) => {
    setSelectedCity(cityName);
    fetchLive(cityName);
  };

  const getBadgeStyle = (category) => {
    const color = AQI_COLORS[category?.trim()] || '#3B82F6';
    return {
      backgroundColor: `${color}25`,
      color: color,
      border: `1px solid ${color}60`
    };
  };

  return (
    <section id="openaq-live" className="dashboard-section">
      <div className="section-header">
        <h2><Radio size={20} /> Real-Time Global Air Quality Ingestion</h2>
        <p>Fetch live atmospheric monitoring station data worldwide and run real-time ML predictions</p>
      </div>

      <div className="openaq-grid">
        <div className="glass-card openaq-controls">
          <h3>Fetch Real-Time Station Data</h3>

          <div className="form-group">
            <label htmlFor="city-select"><Globe size={14} /> Select Global City (No API Key Needed):</label>
            <select
              id="city-select"
              className="form-control"
              value={selectedCity}
              onChange={(e) => handleCityChange(e.target.value)}
            >
              {CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="location-id-input">Or OpenAQ Location ID (Requires Key above):</label>
            <div className="input-with-btn">
              <input
                id="location-id-input"
                type="number"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                placeholder="e.g. 2178"
              />
              <button className="btn btn-accent" onClick={() => fetchLive(selectedCity, locationId)} disabled={loading}>
                <Zap size={16} /> {loading ? 'Ingesting...' : 'Fetch Live Stream'}
              </button>
            </div>
          </div>

          <div className="demo-chips">
            <span>Quick Live Streams:</span>
            {CITIES.slice(0, 5).map((c) => (
              <button key={c} className="chip" onClick={() => handleCityChange(c)}>{c}</button>
            ))}
          </div>
        </div>

        <div className="glass-card openaq-result">
          {loading ? (
            <div className="result-placeholder">
              <Zap size={48} className="animate-spin" />
              <p>Streaming real-time atmospheric sensor data & running ML inference...</p>
            </div>
          ) : error ? (
            <div className="result-placeholder">
              <AlertTriangle size={48} style={{ color: '#EF4444' }} />
              <p>{error}</p>
            </div>
          ) : data ? (
            <div className="result-content">
              <div className="result-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h4 style={{ fontSize: 18, fontWeight: 700 }}>{data.locality}</h4>
                  <span className="country-badge" style={{ color: 'var(--accent-cyan)', fontSize: 12, fontWeight: 600 }}>
                    {data.country_name} • API: {data.api_provider || 'Live Stream'}
                  </span>
                </div>
                <div className="aqi-badge" style={getBadgeStyle(data.predicted_category)}>
                  {data.predicted_category}
                </div>
              </div>

              <div className="live-metrics">
                <div className="metric-chip">
                  <span className="lbl">PM2.5 AQI</span>
                  <span className="val">{data.pollutants['pm2.5_aqi_value']}</span>
                </div>
                <div className="metric-chip">
                  <span className="lbl">Ozone AQI</span>
                  <span className="val">{data.pollutants['ozone_aqi_value']}</span>
                </div>
                <div className="metric-chip">
                  <span className="lbl">NO2 AQI</span>
                  <span className="val">{data.pollutants['no2_aqi_value']}</span>
                </div>
                <div className="metric-chip">
                  <span className="lbl">CO AQI</span>
                  <span className="val">{data.pollutants['co_aqi_value']}</span>
                </div>
              </div>

              <div className="confidence-bar-container">
                <div className="conf-lbl" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span>Model Confidence:</span>
                  <strong style={{ fontFamily: 'var(--font-mono)' }}>{(data.confidence_score * 100).toFixed(1)}%</strong>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${(data.confidence_score * 100).toFixed(1)}%`,
                      background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-blue))'
                    }}
                  ></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="result-placeholder">
              <CloudDownload size={48} />
              <p>Click "Fetch Live Stream" to ingest real-time sensor measurements.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
