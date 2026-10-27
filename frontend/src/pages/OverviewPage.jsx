import React from 'react';
import KPICards from '../components/KPICards';
import AlertBanner from '../components/AlertBanner';
import { Database, ShieldCheck, Globe, Activity } from 'lucide-react';

export default function OverviewPage({ stats }) {
  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 700 }}>
          Executive System Overview
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          High-level operational metrics, global dataset coverage, and machine learning pipeline telemetry
        </p>
      </div>

      <AlertBanner />
      <KPICards stats={stats} />

      <div className="overview-summary-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, marginTop: 28 }}>
        <div className="glass-card">
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Database size={20} style={{ color: 'var(--accent-blue)' }} /> Global Air Quality Dataset Metrics
          </h3>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
            The underlying machine learning dataset incorporates <strong>23,463 validated monitoring records</strong> collected across <strong>175 countries</strong>. It evaluates primary criteria air pollutants: Fine Particulate Matter (PM2.5), Ozone (O3), Nitrogen Dioxide (NO2), and Carbon Monoxide (CO).
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <span className="chip">23,463 Records</span>
            <span className="chip">175 Countries</span>
            <span className="chip">6 AQI Classes</span>
          </div>
        </div>

        <div className="glass-card">
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Activity size={20} style={{ color: 'var(--accent-cyan)' }} /> Trained Model Pipeline Parity
          </h3>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
            The production model is a tuned <strong>RandomForestClassifier Pipeline</strong> featuring automated missing value imputation (`SimpleImputer`), standard feature scaling (`StandardScaler`), and categorical encoding (`OneHotEncoder`).
          </p>
          <ul style={{ listStyle: 'none', fontSize: 13, color: 'var(--text-secondary)' }}>
            <li style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <strong>Test Set Accuracy:</strong> <span style={{ color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>99.91%</span>
            </li>
            <li style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <strong>5-Fold Stratified CV Weighted F1:</strong> <span style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>99.87%</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
