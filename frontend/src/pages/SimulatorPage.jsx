import React from 'react';
import AQISimulator from '../components/AQISimulator';

export default function SimulatorPage({ countries }) {
  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 700 }}>
          Interactive AQI Model Simulator
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Simulate pollutant concentrations (PM2.5, Ozone, NO2, CO) and evaluate real-time class probability distributions
        </p>
      </div>

      <AQISimulator countries={countries} />
    </div>
  );
}
