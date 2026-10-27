import React, { useState, useEffect } from 'react';
import { Key, RotateCw, Activity } from 'lucide-react';

export default function Header({ openaqKey, setOpenaqKey, onRefresh }) {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toUTCString().replace(' GMT', ' UTC'));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="top-header">
      <div className="header-title">
        <h1>Global Air Pollution Exceedances & Violations</h1>
        <p>Enterprise Machine Learning Prediction, OpenAQ Live Telemetry & Compliance Console</p>
      </div>
      <div className="header-actions">
        <div className="clock-ticker">
          <Activity size={14} style={{ color: '#10B981', marginRight: 6, display: 'inline' }} />
          <span>{timeStr}</span>
        </div>
        <div className="api-key-box">
          <Key size={16} />
          <input
            type="password"
            placeholder="OpenAQ v3 API Key (Optional)"
            value={openaqKey}
            onChange={(e) => setOpenaqKey(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={onRefresh}>
          <RotateCw size={16} /> Refresh Data
        </button>
      </div>
    </header>
  );
}
