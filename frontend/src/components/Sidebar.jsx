import React from 'react';
import { NavLink } from 'react-router-dom';
import { Wind, PieChart, Radio, MapPin, Sliders, BarChart2, ShieldAlert, Cpu } from 'lucide-react';

export default function Sidebar() {
  const navItems = [
    { path: '/', label: 'Overview KPI', icon: PieChart },
    { path: '/live-telemetry', label: 'Live Telemetry', icon: Radio },
    { path: '/map', label: 'Global Live Map', icon: MapPin },
    { path: '/simulator', label: 'ML Predictor', icon: Sliders },
    { path: '/analytics', label: 'Data Analytics', icon: BarChart2 },
    { path: '/violations', label: 'Violations Tracker', icon: ShieldAlert },
    { path: '/metadata', label: 'Model Metadata', icon: Cpu }
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">
          <Wind size={24} />
        </div>
        <div className="brand-text">
          <h2>EcoPulse</h2>
          <span>AIR ANALYTICS ML</span>
        </div>
      </div>

      <nav className="nav-menu">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              end={item.path === '/'}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="status-indicator">
          <span className="status-dot online"></span>
          <span>Tuned Model Pipeline</span>
        </div>
        <p className="accuracy-badge">Accuracy: 99.91%</p>
      </div>
    </aside>
  );
}
