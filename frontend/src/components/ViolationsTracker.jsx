import React, { useEffect, useState } from 'react';
import { ShieldAlert, Gavel, Eye, Search, Info, Building2, CheckCircle2 } from 'lucide-react';

export default function ViolationsTracker() {
  const [violations, setViolations] = useState([]);
  const [officialViolations, setOfficialViolations] = useState([]);
  const [officialNotice, setOfficialNotice] = useState('');
  const [activeTab, setActiveTab] = useState('EXCEEDANCES'); // 'EXCEEDANCES' | 'OFFICIAL'
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    fetch('/api/exceedances')
      .then((res) => res.json())
      .then((data) => {
        if (data.records) setViolations(data.records);
      })
      .catch((err) => {
        // Fallback to legacy route if needed
        fetch('/api/violations')
          .then((r) => r.json())
          .then((d) => d.records && setViolations(d.records))
          .catch((e) => console.error('Error fetching exceedances:', e));
      });

    fetch('/api/official-violations')
      .then((res) => res.json())
      .then((data) => {
        if (data.official_records) setOfficialViolations(data.official_records);
        if (data.notice) setOfficialNotice(data.notice);
      })
      .catch((err) => console.error('Error fetching official violations:', err));
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

  const filteredOfficial = officialViolations.filter((rec) => {
    return (
      rec.facility_name.toLowerCase().includes(search.toLowerCase()) ||
      rec.country.toLowerCase().includes(search.toLowerCase()) ||
      rec.state_region.toLowerCase().includes(search.toLowerCase()) ||
      rec.record_id.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <section id="violations" className="dashboard-section">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldAlert size={20} /> Threshold Exceedances
            <span
              title="A reading above a limit is not a confirmed legal violation."
              style={{
                cursor: 'help',
                display: 'inline-flex',
                alignItems: 'center',
                color: 'var(--text-muted, #94A3B8)'
              }}
            >
              <Info size={16} />
            </span>
          </h2>
          <p>
            Ambient pollutant levels exceeding environmental limits compared with authoritative statutory agency actions.
          </p>
        </div>

        {/* Tab switch between Atmospheric Exceedances and Official Legal Actions */}
        <div style={{ display: 'flex', gap: 8, background: 'rgba(255,255,255,0.04)', padding: 4, borderRadius: 8 }}>
          <button
            className={`chip ${activeTab === 'EXCEEDANCES' ? 'active' : ''}`}
            onClick={() => setActiveTab('EXCEEDANCES')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Eye size={14} /> Threshold Exceedances ({violations.length})
          </button>
          <button
            className={`chip ${activeTab === 'OFFICIAL' ? 'active' : ''}`}
            onClick={() => setActiveTab('OFFICIAL')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Gavel size={14} /> Official Violations (EPA ECHO)
          </button>
        </div>
      </div>

      <div className="glass-card table-card">
        <div className="table-controls">
          <div className="search-box">
            <Search size={16} style={{ color: '#94A3B8' }} />
            <input
              type="text"
              placeholder={activeTab === 'EXCEEDANCES' ? "Search Country, Region, ID..." : "Search Facility, Country, ID..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {activeTab === 'EXCEEDANCES' && (
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
                Enforcement Initiated
              </button>
              <button
                className={`chip ${filter === 'EXCEEDANCE' ? 'active' : ''}`}
                onClick={() => setFilter('EXCEEDANCE')}
              >
                Exceedance Only
              </button>
            </div>
          )}
        </div>

        {activeTab === 'EXCEEDANCES' ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Record ID</th>
                <th>Country</th>
                <th>Region</th>
                <th>Standard</th>
                <th>Pollutant</th>
                <th>Measured AQI</th>
                <th>Classification</th>
                <th>Action Status</th>
                <th>Enforcement Agency</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length > 0 ? (
                filteredRecords.map((rec) => (
                  <tr key={rec.id}>
                    <td><strong style={{ fontFamily: 'var(--font-mono)' }}>{rec.id}</strong></td>
                    <td>{rec.country}</td>
                    <td>{rec.region}</td>
                    <td>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {rec.standard_used || 'WHO Standard'}
                      </span>
                    </td>
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
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Action ID</th>
                <th>Facility Name</th>
                <th>Region / State</th>
                <th>Statute</th>
                <th>Violation Classification</th>
                <th>Penalty Assessed</th>
                <th>Action Date</th>
                <th>Source Register</th>
              </tr>
            </thead>
            <tbody>
              {filteredOfficial.length > 0 ? (
                filteredOfficial.map((rec) => (
                  <tr key={rec.record_id}>
                    <td><strong style={{ fontFamily: 'var(--font-mono)' }}>{rec.record_id}</strong></td>
                    <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Building2 size={13} /> {rec.facility_name}</span></td>
                    <td>{rec.state_region}, {rec.country}</td>
                    <td><span className="badge-tag info">{rec.statute}</span></td>
                    <td><span className="badge-tag danger"><Gavel size={12} /> {rec.violation_type}</span></td>
                    <td><strong>${rec.penalty_assessed_usd?.toLocaleString()}</strong></td>
                    <td>{rec.action_date}</td>
                    <td><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{rec.source}</span></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: '#94A3B8', padding: 32 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <CheckCircle2 size={24} style={{ color: '#10B981' }} />
                      <strong>{officialNotice || "No verified official records for this region"}</strong>
                      <span style={{ fontSize: 12, color: '#64748B' }}>
                        Only formal enforcement actions from official statutory databases (e.g. US EPA ECHO) are registered here.
                      </span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
