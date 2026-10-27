import React from 'react';
import { BarChart2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const AQI_COLORS = {
  "Good": "#10B981",
  "Moderate": "#F59E0B",
  "Unhealthy for Sensitive Groups": "#F97316",
  "Unhealthy": "#EF4444",
  "Very Unhealthy": "#A855F7",
  "Hazardous": "#DC2626"
};

export default function AnalyticsCharts({ stats }) {
  // Target class distribution data
  const targetData = Object.entries(stats?.target_distribution || {}).map(([name, count]) => ({
    name,
    count,
    color: AQI_COLORS[name] || '#3B82F6'
  }));

  // Top countries data
  const countryData = Object.entries(stats?.top_countries || {}).map(([country, count]) => ({
    country,
    count
  }));

  // Pollutant stats data
  const pollutantStats = stats?.pollutant_stats || {};
  const pollutantData = [
    { name: 'CO AQI', mean: pollutantStats['co_aqi_value']?.mean || 1.37, max: pollutantStats['co_aqi_value']?.max || 133 },
    { name: 'Ozone AQI', mean: pollutantStats['ozone_aqi_value']?.mean || 38.2, max: pollutantStats['ozone_aqi_value']?.max || 235 },
    { name: 'NO2 AQI', mean: pollutantStats['no2_aqi_value']?.mean || 3.06, max: pollutantStats['no2_aqi_value']?.max || 91 },
    { name: 'PM2.5 AQI', mean: pollutantStats['pm2.5_aqi_value']?.mean || 68.52, max: pollutantStats['pm2.5_aqi_value']?.max || 500 }
  ];

  return (
    <section id="analytics" className="dashboard-section">
      <div className="section-header">
        <h2><BarChart2 size={20} /> Exploratory Data Analytics</h2>
        <p>Visualizing target class distributions, country coverage, and pollutant ranges</p>
      </div>

      <div className="charts-grid">
        <div className="glass-card chart-card">
          <h3>Target Class Distribution</h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={targetData}>
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)' }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {targetData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card chart-card">
          <h3>Top 15 Countries by Record Count</h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={countryData} layout="vertical">
                <XAxis type="number" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis dataKey="country" type="category" stroke="#94A3B8" fontSize={10} width={100} tickLine={false} />
                <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)' }} />
                <Bar dataKey="count" fill="#3B82F6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card chart-card full-width">
          <h3>Pollutant Mean vs Maximum AQI Values</h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={pollutantData}>
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} />
                <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)' }} />
                <Bar dataKey="mean" name="Mean AQI" fill="#06B6D4" radius={[6, 6, 0, 0]} />
                <Bar dataKey="max" name="Maximum AQI" fill="#EF4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
