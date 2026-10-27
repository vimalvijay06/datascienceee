import React, { useState, useEffect, useCallback } from 'react';
import { GitCompare, RefreshCw, AlertTriangle } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';

const CITY_OPTIONS = [
  "Delhi", "Mumbai", "Lahore", "Beijing", "Dhaka",
  "New York", "London", "Los Angeles", "Bengaluru", "Kolkata",
  "Islamabad", "Kathmandu", "Bangkok", "Paris", "Tokyo",
];

const POLLUTANT_OPTS = [
  { key: "pm25",  label: "PM2.5 AQI" },
  { key: "ozone", label: "Ozone AQI" },
  { key: "no2",   label: "NO2 AQI"   },
  { key: "co",    label: "CO AQI"    },
];

const DAY_RANGES = [
  { label: "24h", value: 1 },
  { label: "3d",  value: 3 },
  { label: "7d",  value: 7 },
];

// Stable, deterministic palette for City A / City B
const CITY_A_COLOR = "#3B82F6";  // blue
const CITY_B_COLOR = "#F43F5E";  // rose

function mergeSeries(s1, s2, key) {
  // Merge by hour bucket so the LineChart gets one data array
  const map = {};
  (s1 || []).forEach((r) => {
    const h = r.timestamp.slice(0, 13); // "2026-10-27T15"
    map[h] = { timestamp: r.timestamp, cityA: r[key] };
  });
  (s2 || []).forEach((r) => {
    const h = r.timestamp.slice(0, 13);
    if (map[h]) map[h].cityB = r[key];
    else map[h] = { timestamp: r.timestamp, cityB: r[key] };
  });
  return Object.values(map)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

// Stats helper
function calcStats(series, key) {
  const vals = series.map((r) => r[key]).filter((v) => v != null && !isNaN(v));
  if (!vals.length) return { mean: '-', max: '-', exceedPct: '-' };
  const mean = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  const max  = Math.max(...vals).toFixed(1);
  const exceedPct = ((vals.filter((v) => v > 100).length / vals.length) * 100).toFixed(1);
  return { mean, max, exceedPct };
}

export default function CompareCitiesPanel() {
  const [cityA, setCityA]   = useState('Delhi');
  const [cityB, setCityB]   = useState('London');
  const [days,  setDays]    = useState(3);
  const [pollutant, setPollutant] = useState('pm25');
  const [seriesA, setSeriesA] = useState([]);
  const [seriesB, setSeriesB] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const fetchBoth = useCallback(async () => {
    if (cityA === cityB) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/trend?city=${encodeURIComponent(cityA)}&city2=${encodeURIComponent(cityB)}&days=${days}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      // Downsample
      const raw1 = json.series  || [];
      const raw2 = json.series2 || [];
      const step = Math.max(1, Math.floor(Math.max(raw1.length, raw2.length) / 200));
      setSeriesA(raw1.filter((_, i) => i % step === 0));
      setSeriesB(raw2.filter((_, i) => i % step === 0));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [cityA, cityB, days]);

  useEffect(() => { fetchBoth(); }, [fetchBoth]);

  const merged = mergeSeries(seriesA, seriesB, pollutant);
  const statsA = calcStats(seriesA, pollutant);
  const statsB = calcStats(seriesB, pollutant);

  const formatTick = (ts) => {
    const d = new Date(ts);
    if (days === 1) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="glass-card" style={{ padding: '20px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <GitCompare size={18} style={{ color: 'var(--accent-cyan)' }} />
          Compare Two Cities
        </h3>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
          Side-by-side AQI pollutant comparison with AQI 100 threshold reference
        </p>
      </div>

      {/* Controls row */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        {/* City A */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: CITY_A_COLOR, flexShrink: 0 }} />
          <select
            id="compare-city-a"
            value={cityA}
            onChange={(e) => setCityA(e.target.value)}
            className="form-control"
            style={{ padding: '5px 10px', fontSize: 12, minWidth: 120 }}
          >
            {CITY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <span style={{ color: '#475569', fontSize: 13, fontWeight: 700 }}>vs</span>

        {/* City B */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: CITY_B_COLOR, flexShrink: 0 }} />
          <select
            id="compare-city-b"
            value={cityB}
            onChange={(e) => setCityB(e.target.value)}
            className="form-control"
            style={{ padding: '5px 10px', fontSize: 12, minWidth: 120 }}
          >
            {CITY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Pollutant */}
        <select
          id="compare-pollutant"
          value={pollutant}
          onChange={(e) => setPollutant(e.target.value)}
          className="form-control"
          style={{ padding: '5px 10px', fontSize: 12 }}
        >
          {POLLUTANT_OPTS.map(({ key, label }) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        {/* Day range */}
        <div style={{ display: 'flex', gap: 4 }}>
          {DAY_RANGES.map(({ label, value }) => (
            <button
              key={value}
              id={`compare-days-${value}`}
              onClick={() => setDays(value)}
              style={{
                padding: '5px 10px',
                borderRadius: 6,
                border: 'none',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                background: days === value ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.08)',
                color: '#FFF',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          id="compare-refresh"
          onClick={fetchBoth}
          disabled={loading}
          style={{
            padding: '5px 8px',
            borderRadius: 6,
            border: 'none',
            background: 'rgba(255,255,255,0.08)',
            color: '#94A3B8',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginLeft: 'auto',
          }}
        >
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* Stat pills */}
      {!error && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {[
            { label: cityA, stats: statsA, color: CITY_A_COLOR },
            { label: cityB, stats: statsB, color: CITY_B_COLOR },
          ].map(({ label, stats, color }) => (
            <div
              key={label}
              style={{
                background: `${color}12`,
                border: `1px solid ${color}40`,
                borderRadius: 10,
                padding: '10px 14px',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 6 }}>{label}</div>
              <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#94A3B8' }}>
                <span>Mean: <strong style={{ color: '#E2E8F0' }}>{stats.mean}</strong></span>
                <span>Peak: <strong style={{ color: '#EF4444' }}>{stats.max}</strong></span>
                <span>
                  {stats.exceedPct}% &gt;100
                  {parseFloat(stats.exceedPct) > 50 && (
                    <AlertTriangle size={10} style={{ color: '#F59E0B', marginLeft: 3 }} />
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      {error ? (
        <div style={{ color: '#EF4444', fontSize: 13, textAlign: 'center', padding: 40 }}>
          Failed to load comparison: {error}
        </div>
      ) : (
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <LineChart data={merged} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
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
              />
              <Tooltip
                contentStyle={{ background: 'rgba(15,23,42,0.96)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 11 }}
                labelFormatter={(l) => new Date(l).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
              />
              <Legend
                formatter={(value) => value === 'cityA' ? cityA : cityB}
                wrapperStyle={{ fontSize: 11, color: '#94A3B8' }}
              />
              <ReferenceLine
                y={100}
                stroke="#F59E0B"
                strokeDasharray="6 3"
                strokeWidth={1.5}
                label={{ value: 'AQI 100', position: 'insideTopRight', fill: '#F59E0B', fontSize: 10 }}
              />
              <Line
                type="monotone"
                dataKey="cityA"
                name="cityA"
                stroke={CITY_A_COLOR}
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="cityB"
                name="cityB"
                stroke={CITY_B_COLOR}
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', color: '#64748B', fontSize: 12, marginTop: 8 }}>
          Loading comparison data…
        </div>
      )}
    </div>
  );
}
