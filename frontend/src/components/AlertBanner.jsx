import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function AlertBanner() {
  return (
    <div className="alert-banner">
      <div className="alert-icon">
        <ShieldCheck size={24} />
      </div>
      <div className="alert-content">
        <strong>Scientific Limitation Notice:</strong>
        <span>
          {' '}This machine learning model predicts atmospheric AQI categories based on pollutant measurements. An air-quality exceedance is an environmental metric and is NOT directly equivalent to a legal regulatory violation. Legal regulatory enforcement violations are tracked separately below.
        </span>
      </div>
    </div>
  );
}
