import React from 'react';
import ModelMetadata from '../components/ModelMetadata';

export default function MetadataPage({ stats }) {
  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 700 }}>
          Model Architecture & Diagnostics
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Detailed pipeline transformation steps, hyperparameter metrics, and Gini feature importances
        </p>
      </div>

      <ModelMetadata stats={stats} />
    </div>
  );
}
