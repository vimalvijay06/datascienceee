import React from 'react';
import AnalyticsCharts from '../components/AnalyticsCharts';

export default function AnalyticsPage({ stats }) {
  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 700 }}>
          Exploratory Data Analytics
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Interactive visualizations of target class distributions, global country coverage, and pollutant distributions
        </p>
      </div>

      <AnalyticsCharts stats={stats} />
    </div>
  );
}
