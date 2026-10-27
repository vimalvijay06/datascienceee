import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, AlertTriangle, RefreshCw, Eye } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';

// AQI threshold breakpoints
const THRESHOLDS = {
  "Good":                           { max: 50,  color: "#10B981" },
  "Moderate":                       { max: 100, color: "#F59E0B" },
  "Unhealthy for Sensitive Groups": { max: 150, color: "#F97316" },
  "Unhealthy":                      { max: 200, color: "#EF4444" },
  "Very Unhealthy":                 { max: 300, color: "#A855F7" },
  "Hazardous":                      { max: 500, color: "#DC2626" },
};

// Okabe-Ito color-blind safe palette
const COLORBLIND_LINES = {
  pm25:  "#0072B2",
  ozone: "#E69F00",
  no2:   "#009E73",
  co:    "#CC79A7",
};
const STANDARD_LINES = {
  pm25:  "#F43F5E",
  ozone: "#F59E0B",
  no2:   "#3B82F6",
  co:    "#10B981",
};

const POLLUTANT_LABELS = {
  pm25:  "PM2.5 AQI",
  ozone: "Ozone AQI",
  no2:   "NO2 AQI",
  co:    "CO AQI",
};

const CITY_OPTIONS = [
  "Delhi", "Mumbai", "Lahore", "Beijing", "Dhaka",
  "New York", "London", "Los Angeles", "Bengaluru", "Kolkata",
];

const DAY_RANGES = [
  { label: "24h", value: 1 },
  { label: "3d",  value: 3 },
  { label: "7d",  value: 7 },
  { label: "30d", value: 30 },
];

// Custom tooltip
function CustomTooltip({ active, payload, label, colorBlind }) {
  if (!active || !payload?.length) return null;
  const lines = colorBlind ? COLORBLIND_LINES : STANDARD_LINES;
  return (
    <div style={{
      background: 'rgba(15,23,42,0.96)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 10,
      padding: '10px 14px',
      fontSize: 12,
    }}>
      <div style={{ color: '#94A3B8', marginBottom: 6 }}>
        {new Date(label).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
      </div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: lines[p.dataKey] || p.color, marginBottom: 2 }}>
          {POLLUTANT_LABELS[p.dataKey]}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
}

export default function TrendChart({ city: propCity, colorBlind: propColorBlind }) {
  const [city, setCity] = useState(propCity || 'Delhi');
  const [days, setDays] = useState(7);
  const [activePollutants, setActivePollutants] = useState({ pm25: true, ozone: true, no2: false, co: false });
  const [colorBlind, setColorBlind] = useState(propColorBlind || false);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const lineColors = colorBlind ? COLORBLIND_LINES : STANDARD_LINES;

  const fetchTrend = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/trend?city=${encodeURIComponent(city)}&days=${days}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      // Downsample to at most 200 points for rendering performance
      const raw = json.series || [];
      const step = Math.max(1, Math.floor(raw.length / 200));
      setData(raw.filter((_, i) => i % step === 0));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [city, days]);

  useEffect(() => { fetchTrend(); }, [fetchTrend]);

  const togglePollutant = (key) =>
    setActivePollutants((prev) => ({ ...prev, [key]: !prev[key] }));

  // Format X tick labels based on date range
  const formatTick = (ts) => {
    const d = new Date(ts);
    if (days === 1) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="glass-card" style={{ padding: '20px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={18} style={{ color: 'var(--accent-primary)' }} />
            AQI Trend Analysis
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
            Hourly pollutant trend with AQI 100 "Unhealthy" threshold marker
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* City selector */}
          <select
            id="trend-city-select"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="form-control"
            style={{ padding: '5px 10px', fontSize: 12, minWidth: 120 }}
          >
            {CITY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Day range toggle */}
          <div style={{ display: 'flex', gap: 4 }}>
            {DAY_RANGES.map(({ label, value }) => (
              <button
                key={value}
                id={`trend-days-${value}`}
                onClick={() => setDays(value)}
                style={{
                  padding: '5px 10px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: days === value ? 'var(--accent-primary)' : 'rgba(255,255,255,0.08)',
                  color: '#FFF',
                  transition: 'background 0.2s',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Color-blind toggle */}
          <button
            id="trend-colorblind-toggle"
            onClick={() => setColorBlind((p) => !p)}
            style={{
              padding: '5px 10px',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.15)',
              background: colorBlind ? 'rgba(0,114,178,0.25)' : 'rgba(255,255,255,0.06)',
              color: '#FFF',
              fontSize: 11,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Eye size={12} /> {colorBlind ? 'CB Safe' : 'Standard'}
          </button>

          {/* Refresh */}
          <button
            id="trend-refresh"
            onClick={fetchTrend}
            disabled={loading}
            style={{
              padding: '5px 8px',
              borderRadius: 6,
              border: 'none',
              background: 'rgba(255,255,255,0.08)',
              color: '#94A3B8',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* Pollutant toggle chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {Object.keys(POLLUTANT_LABELS).map((key) => (
          <button
            key={key}
            id={`trend-pollutant-${key}`}
            onClick={() => togglePollutant(key)}
            style={{
              padding: '4px 12px',
              borderRadius: 20,
              border: `1.5px solid ${activePollutants[key] ? lineColors[key] : 'rgba(255,255,255,0.12)'}`,
              background: activePollutants[key] ? `${lineColors[key]}22` : 'transparent',
              color: activePollutants[key] ? lineColors[key] : '#94A3B8',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {POLLUTANT_LABELS[key]}
          </button>
        ))}

        {/* AQI 100 threshold note */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#F59E0B' }}>
          <AlertTriangle size={12} />
          Dashed line = AQI 100 threshold
        </div>
      </div>

      {/* Chart */}
      {error ? (
        <div style={{ color: '#EF4444', fontSize: 13, textAlign: 'center', padding: 40 }}>
          Failed to load trend data: {error}
        </div>
      ) : (
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatTick}
                stroke="#475569"
                tick={{ fontSize: 10, fill: '#64748B' }}
                tickLine={false}
                minTickGap={40}
              />
              <YAxis
                stroke="#475569"
                tick={{ fontSize: 10, fill: '#64748B' }}
                tickLine={false}
                domain={[0, 'auto']}
              />
              <Tooltip content={<CustomTooltip colorBlind={colorBlind} />} />

              {/* AQI 100 "Unhealthy" reference line */}
              <ReferenceLine
                y={100}
                stroke="#F59E0B"
                strokeDasharray="6 3"
                strokeWidth={1.5}
                label={{
                  value: 'Unhealthy ≥100',
                  position: 'insideTopRight',
                  fill: '#F59E0B',
                  fontSize: 10,
                }}
              />

              {/* Pollutant lines */}
              {Object.keys(POLLUTANT_LABELS).map((key) =>
                activePollutants[key] ? (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={POLLUTANT_LABELS[key]}
                    stroke={lineColors[key]}
                    dot={false}
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                ) : null
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', color: '#64748B', fontSize: 12, marginTop: 8 }}>
          Loading trend data…
        </div>
      )}

      <div style={{ fontSize: 10, color: '#475569', marginTop: 10 }}>
        * Synthetic representative data shown when live DB readings are unavailable for this city.
      </div>
    </div>
  );
}
