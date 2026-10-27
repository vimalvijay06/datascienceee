import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import OverviewPage from './pages/OverviewPage';
import LiveTelemetryPage from './pages/LiveTelemetryPage';
import MapPage from './pages/MapPage';
import SimulatorPage from './pages/SimulatorPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ViolationsPage from './pages/ViolationsPage';
import MetadataPage from './pages/MetadataPage';

export default function App() {
  const [openaqKey, setOpenaqKey] = useState('');
  const [stats, setStats] = useState(null);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <Router>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Header openaqKey={openaqKey} setOpenaqKey={setOpenaqKey} onRefresh={fetchStats} />
          <Routes>
            <Route path="/" element={<OverviewPage stats={stats} />} />
            <Route path="/live-telemetry" element={<LiveTelemetryPage openaqKey={openaqKey} />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/simulator" element={<SimulatorPage countries={stats?.all_countries} />} />
            <Route path="/analytics" element={<AnalyticsPage stats={stats} />} />
            <Route path="/violations" element={<ViolationsPage />} />
            <Route path="/metadata" element={<MetadataPage stats={stats} />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
