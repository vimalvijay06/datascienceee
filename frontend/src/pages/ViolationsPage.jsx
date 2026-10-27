import React from 'react';
import ViolationsTracker from '../components/ViolationsTracker';

export default function ViolationsPage() {
  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 700 }}>
          Regulatory Compliance & Violations Tracker
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Searchable legal enforcement database comparing regulatory action records with atmospheric exceedance metrics
        </p>
      </div>

      <ViolationsTracker />
    </div>
  );
}
