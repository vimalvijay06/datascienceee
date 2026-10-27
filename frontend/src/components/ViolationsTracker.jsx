import React, { useEffect, useState } from 'react';
import { ShieldAlert, Gavel, Eye, Search, Filter } from 'lucide-react';

export default function ViolationsTracker() {
  const [violations, setViolations] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    fetch('/api/violations')
      .then((res) => res.json())
      .then((data) => {
        if (data.records) setViolations(data.records);
      })
      .catch((err) => console.error('Error fetching violations:', err));
  }, []);

  const filteredRecords = violations.filter((rec) => {
    const matchesSearch =
      rec.country.toLowerCase().includes(search.toLowerCase()) ||
      rec.region.toLowerCase().includes(search.toLowerCase()) ||
      rec.id.toLowerCase().includes(search.toLowerCase());

    if (filter === 'VIOLATION') return matchesSearch && rec.regulatory_violation_filed;
    if (filter === 'EXCEEDANCE') return matchesSearch && !rec.regulatory_violation_filed;
    return matchesSearch;
  });

  return (
    <section id="violations" className="dashboard-section">
      <div className="section-header">
        <h2><ShieldAlert size={20} /> Regulatory Compliance & Enforcement Tracker</h2>
        <p>Comparing legal regulatory enforcement records with atmospheric exceedance metrics</p>
      </div>

      <div className="glass-card table-card">
        <div className="table-controls">
          <div className="search-box">
            <Search size={16} style={{ color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Search Country, Region, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-buttons" style={{ display: 'flex', gap: 8 }}>
            <button
              className={`chip ${filter === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilter('ALL')}
            >
              All ({violations.length})
            </button>
            <button
              className={`chip ${filter === 'VIOLATION' ? 'active' : ''}`}
              onClick={() => setFilter('VIOLATION')}
            >
              Legal Violations Filed
            </button>
            <button
              className={`chip ${filter === 'EXCEEDANCE' ? 'active' : ''}`}
              onClick={() => setFilter('EXCEEDANCE')}
            >
              Exceedance Only
            </button>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Record ID</th>
              <th>Country</th>
              <th>Region</th>
              <th>Pollutant</th>
              <th>Measured AQI</th>
              <th>Exceedance Status</th>
              <th>Legal Action Filed?</th>
              <th>Enforcement Agency</th>
              <th>Compliance Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length > 0 ? (
              filteredRecords.map((rec) => (
                <tr key={rec.id}>
                  <td><strong style={{ fontFamily: 'var(--font-mono)' }}>{rec.id}</strong></td>
                  <td>{rec.country}</td>
                  <td>{rec.region}</td>
                  <td><span className="badge-tag warning">{rec.exceedance_pollutant}</span></td>
                  <td><strong style={{ fontFamily: 'var(--font-mono)' }}>{rec.measured_aqi}</strong> (Limit: {rec.legal_threshold_aqi})</td>
                  <td>{rec.exceedance_status}</td>
                  <td>
                    {rec.regulatory_violation_filed ? (
                      <span className="badge-tag danger"><Gavel size={12} /> Violation Filed</span>
                    ) : (
                      <span className="badge-tag info"><Eye size={12} /> Exceedance Only</span>
                    )}
                  </td>
                  <td>{rec.enforcement_agency}</td>
                  <td>{rec.status}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', color: '#64748B', padding: 24 }}>
                  No matching compliance records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
