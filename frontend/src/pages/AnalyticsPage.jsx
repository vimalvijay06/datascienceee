import React from 'react';
import AnalyticsCharts from '../components/AnalyticsCharts';
import TrendChart from '../components/TrendChart';
import CompareCitiesPanel from '../components/CompareCitiesPanel';

export default function AnalyticsPage({ stats }) {
  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 700 }}>
          Exploratory Data Analytics
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Interactive visualizations of target class distributions, country coverage, pollutant trends, and city comparisons
        </p>
      </div>

      {/* Static distribution charts */}
      <AnalyticsCharts stats={stats} />

      {/* Time-range AQI trend chart */}
      <div style={{ marginTop: 28 }}>
        <TrendChart />
      </div>

      {/* Side-by-side city comparison */}
      <div style={{ marginTop: 28 }}>
        <CompareCitiesPanel />
      </div>
    </div>
  );
}
