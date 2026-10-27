import React, { useState } from 'react';
import { Radio, Zap, ShieldAlert, Activity, Scale, MapPin } from 'lucide-react';

export default function LiveTelemetryPage({ openaqKey }) {
  const [selectedCity, setSelectedCity] = useState('Delhi');
  const [locationId, setLocationId] = useState('2178');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const fetchTelemetry = async (payload) => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/openaq/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error('Telemetry fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchCity = (city) => {
    setSelectedCity(city);
    fetchTelemetry({ city });
  };

  const handleFetchLocationId = () => {
    fetchTelemetry({ location_id: locationId, api_key: openaqKey });
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 700 }}>
          Live Atmospheric & OpenAQ Telemetry Streamer
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Stream real-time sensor measurements from global monitoring stations with <strong>India-First priority</strong> and <strong>South Asia focus</strong>
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24 }}>
        {/* Stream Control Panel */}
        <div className="glass-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Radio size={18} style={{ color: 'var(--accent-primary)' }} /> Live Stream Ingestion
          </h3>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
              🇮🇳 Priority 1: Indian Cities
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['Delhi', 'Mumbai', 'Bengaluru', 'Kolkata', 'Chennai', 'Hyderabad', 'Varanasi', 'Jaipur'].map((c) => (
                <button
                  key={c}
                  onClick={() => handleFetchCity(c)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    background: selectedCity === c ? '#3B82F6' : 'rgba(255,255,255,0.08)',
                    color: '#FFF',
                    fontSize: 12,
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
              🌏 Priority 2: South Asia & Neighbors
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['Lahore', 'Dhaka', 'Kathmandu', 'Beijing', 'Colombo', 'Kabul', 'Yangon'].map((c) => (
                <button
                  key={c}
                  onClick={() => handleFetchCity(c)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    background: selectedCity === c ? '#3B82F6' : 'rgba(255,255,255,0.08)',
                    color: '#FFF',
                    fontSize: 12,
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
            <label style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
              OpenAQ Location ID (Requires Key)
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                placeholder="2178"
                style={{ flex: 1, padding: '8px 12px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.15)', color: '#F8FAFC', borderRadius: 6, fontSize: 13 }}
              />
              <button
                onClick={handleFetchLocationId}
                style={{ padding: '8px 14px', background: 'var(--accent-primary)', color: '#000', borderRadius: 6, fontSize: 13, border: 'none', cursor: 'pointer', fontWeight: 700 }}
              >
                Stream
              </button>
            </div>
          </div>
        </div>

        {/* Telemetry Output Panel */}
        <div className="glass-card" style={{ padding: 24, minHeight: 400 }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
              <Zap size={40} className="animate-spin" />
              <p style={{ marginTop: 16 }}>Streaming live telemetry data...</p>
            </div>
          ) : result ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <span style={{ fontSize: 11, background: 'rgba(59,130,246,0.2)', color: '#60A5FA', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                    {result.api_provider}
                  </span>
                  <h2 style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>{result.locality}</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{result.country_name}</p>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>ML Predicted AQI</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-primary)' }}>{result.predicted_category}</div>
                  <div style={{ fontSize: 12, color: '#A7F3D0' }}>Confidence: {(result.confidence_score * 100).toFixed(1)}%</div>
                </div>
              </div>

              {/* Pollutants Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 24 }}>
                {Object.entries(result.pollutants || {}).map(([key, val]) => (
                  <div key={key} className="glass-card" style={{ padding: 12, textAlign: 'center', background: 'rgba(15,23,42,0.6)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{key.replace('_aqi_value', '').toUpperCase()} AQI</div>
                    <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* Concept 3 & 4 Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="glass-card" style={{ padding: 16, background: 'rgba(15,23,42,0.6)' }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: '#FDE047' }}>
                    <Activity size={16} /> Atmospheric Exceedances
                  </h4>
                  {result.exceedances && result.exceedances.length > 0 ? (
                    result.exceedances.map((ex, idx) => (
                      <div key={idx} style={{ fontSize: 12, marginBottom: 6 }}>
                        <strong>{ex.pollutant}:</strong> {ex.measured_value} {ex.unit} ({ex.status})
                      </div>
                    ))
                  ) : (
                    <p style={{ fontSize: 12, color: '#A7F3D0' }}>Within configured standard limits.</p>
                  )}
                </div>

                <div className="glass-card" style={{ padding: 16, background: 'rgba(15,23,42,0.6)' }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: '#F87171' }}>
                    <Scale size={16} /> Regulatory Violation Notice
                  </h4>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    An atmospheric exceedance is an air quality metric and is NOT automatically a legal regulatory violation unless confirmed by an enforcement audit.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
              <Radio size={48} />
              <p style={{ marginTop: 16 }}>Select an Indian city or enter OpenAQ ID to stream live data.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
