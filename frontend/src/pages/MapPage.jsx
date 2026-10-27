import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, ShieldAlert, Zap, Globe, AlertTriangle, Filter, Search, ChevronRight, Scale, Activity, Info } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Helper component for programmatic map re-centering
function MapFlyController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom, { duration: 1.5 });
    }
  }, [center, zoom, map]);
  return null;
}

// Custom Marker Icons for 4 Status Types
const createCustomIcon = (color, priority) => {
  const size = priority === 1 ? 26 : priority === 2 ? 22 : 18;
  return L.divIcon({
    className: 'custom-map-marker',
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      background-color: ${color};
      border: ${priority === 1 ? '3px solid #FFFFFF' : '2px solid #FFFFFF'};
      border-radius: 50%;
      box-shadow: 0 0 ${priority === 1 ? '18px' : '10px'} ${color};
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 10px;
      font-weight: bold;
    ">${priority === 1 ? '🇮🇳' : ''}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
};

const MARKER_COLORS = {
  NORMAL: '#10B981',      // Green: Normal Pollution
  ELEVATED: '#FBBF24',    // Yellow: Elevated Pollution
  EXCEEDANCE: '#F97316',  // Orange: Atmospheric Exceedance
  VIOLATION: '#EF4444'    // Red: Confirmed Regulatory Violation
};

export default function MapPage() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState(null);

  // Map View State (Default open centered on INDIA)
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]);
  const [mapZoom, setMapZoom] = useState(5);

  // Filter States
  const [selectedCountry, setSelectedCountry] = useState('ALL');
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/map/locations')
      .then((res) => res.json())
      .then((data) => {
        if (data.locations) {
          setLocations(data.locations);
          // Set initial selected station to Delhi NCR
          const delhiStation = data.locations.find((l) => l.city_name === 'Delhi') || data.locations[0];
          setSelectedStation(delhiStation);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching map locations:', err);
        setLoading(false);
      });
  }, []);

  // Preset Region Controls
  const handleFocusIndia = () => {
    setMapCenter([20.5937, 78.9629]);
    setMapZoom(5);
    setSelectedCountry('India');
  };

  const handleFocusSouthAsia = () => {
    setMapCenter([22.0, 80.0]);
    setMapZoom(4);
    setSelectedCountry('ALL');
  };

  const handleFocusGlobal = () => {
    setMapCenter([20.0, 10.0]);
    setMapZoom(2);
    setSelectedCountry('ALL');
  };

  // Filter Options
  const countries = ['ALL', ...Array.from(new Set(locations.map((l) => l.country_name)))];
  const cities = ['ALL', ...Array.from(new Set(locations.filter(l => selectedCountry === 'ALL' || l.country_name === selectedCountry).map((l) => l.city_name)))];

  const filteredLocations = locations.filter((loc) => {
    const matchCountry = selectedCountry === 'ALL' || loc.country_name === selectedCountry;
    const matchCity = selectedCity === 'ALL' || loc.city_name === selectedCity;
    const matchStatus = selectedStatus === 'ALL' || loc.status_type === selectedStatus;
    const matchSearch = searchQuery === '' ||
      loc.locality.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.city_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.country_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCountry && matchCity && matchStatus && matchSearch;
  });

  return (
    <div className="page-container" style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Globe size={28} style={{ color: 'var(--accent-primary)' }} />
            Global Air Pollution Monitoring & Violation Map
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
            Global coverage with <strong>India-First priority</strong> and <strong>South Asia regional monitoring</strong>
          </p>
        </div>

        {/* Quick Region Focus Bar */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleFocusIndia}
            className="glow-button"
            style={{ padding: '8px 16px', background: '#3B82F6', color: '#FFF', borderRadius: 8, fontSize: 13, border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            🇮🇳 Focus India
          </button>
          <button
            onClick={handleFocusSouthAsia}
            style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.08)', color: '#F8FAFC', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 500 }}
          >
            🌏 Focus South Asia
          </button>
          <button
            onClick={handleFocusGlobal}
            style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.08)', color: '#F8FAFC', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 500 }}
          >
            🌐 Global View
          </button>
        </div>
      </div>

      {/* Control & Filter Bar */}
      <div className="glass-card" style={{ padding: 16, marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, alignItems: 'center' }}>
        <div>
          <label style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
            Country Filter
          </label>
          <select
            value={selectedCountry}
            onChange={(e) => { setSelectedCountry(e.target.value); setSelectedCity('ALL'); }}
            style={{ width: '100%', padding: '8px 12px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.15)', color: '#F8FAFC', borderRadius: 6, fontSize: 13 }}
          >
            {countries.map((c) => (
              <option key={c} value={c}>
                {c === 'India' ? '🇮🇳 India (Priority 1)' : c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
            City Filter
          </label>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.15)', color: '#F8FAFC', borderRadius: 6, fontSize: 13 }}
          >
            {cities.map((ct) => (
              <option key={ct} value={ct}>{ct}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
            Status Classification
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.15)', color: '#F8FAFC', borderRadius: 6, fontSize: 13 }}
          >
            <option value="ALL">All Classifications</option>
            <option value="NORMAL">Normal Pollution</option>
            <option value="ELEVATED">Elevated Pollution</option>
            <option value="EXCEEDANCE">Atmospheric Exceedance</option>
            <option value="VIOLATION">Confirmed Regulatory Violation</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
            Search Station
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search station or locality..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 32px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.15)', color: '#F8FAFC', borderRadius: 6, fontSize: 13 }}
            />
            <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-secondary)' }} />
          </div>
        </div>
      </div>

      {/* Visual Legend */}
      <div className="glass-card" style={{ padding: 12, marginBottom: 20, display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center', fontSize: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: MARKER_COLORS.NORMAL, display: 'inline-block' }}></span>
          <span>Normal Pollution</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: MARKER_COLORS.ELEVATED, display: 'inline-block' }}></span>
          <span>Elevated Pollution</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: MARKER_COLORS.EXCEEDANCE, display: 'inline-block' }}></span>
          <span>Atmospheric Pollutant Exceedance</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: MARKER_COLORS.VIOLATION, display: 'inline-block' }}></span>
          <span>Confirmed Regulatory Violation</span>
        </div>
      </div>

      {/* Main Map + Station Detail Panel Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedStation ? '1fr 360px' : '1fr', gap: 20 }}>
        {/* Leaflet Map */}
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden', height: '600px', position: 'relative' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
              <Zap size={36} className="animate-spin" />
              <p style={{ marginTop: 12 }}>Loading global monitoring stations...</p>
            </div>
          ) : (
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ width: '100%', height: '100%', background: '#0D111A' }}
            >
              <MapFlyController center={mapCenter} zoom={mapZoom} />
              <TileLayer
                attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
              />
              {filteredLocations.map((loc) => {
                const markerColor = MARKER_COLORS[loc.status_type] || MARKER_COLORS.NORMAL;
                return (
                  <Marker
                    key={loc.id}
                    position={[loc.lat, loc.lon]}
                    icon={createCustomIcon(markerColor, loc.priority)}
                    eventHandlers={{
                      click: () => setSelectedStation(loc)
                    }}
                  >
                    <Popup className="custom-leaflet-popup">
                      <div style={{ padding: 8, minWidth: 220, color: '#F8FAFC' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{loc.locality}</h4>
                          {loc.priority === 1 && <span style={{ background: '#3B82F6', fontSize: 10, padding: '2px 6px', borderRadius: 4 }}>India Priority</span>}
                        </div>
                        <p style={{ margin: '4px 0 12px 0', fontSize: 12, color: '#94A3B8' }}>{loc.country_name}</p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11, marginBottom: 10 }}>
                          <div><strong>PM2.5:</strong> {loc.pm25_val} µg/m³</div>
                          <div><strong>PM10:</strong> {loc.pm10_val} µg/m³</div>
                          <div><strong>NO2:</strong> {loc.no2_val} µg/m³</div>
                          <div><strong>SO2:</strong> {loc.so2_val} µg/m³</div>
                        </div>

                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 6, fontSize: 11 }}>
                          <div>ML Category: <strong style={{ color: markerColor }}>{loc.predicted_category}</strong></div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          )}
        </div>

        {/* Selected Station Detailed Concept Cards */}
        {selectedStation && (
          <div className="glass-card" style={{ padding: 20, height: '600px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: 11, background: selectedStation.priority === 1 ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.1)', color: selectedStation.priority === 1 ? '#60A5FA' : '#94A3B8', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                  {selectedStation.priority === 1 ? '🇮🇳 PRIORITY 1: INDIA' : selectedStation.priority === 2 ? '🌏 PRIORITY 2: SOUTH ASIA' : '🌐 PRIORITY 3: GLOBAL'}
                </span>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginTop: 8 }}>{selectedStation.locality}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{selectedStation.city_name}, {selectedStation.country_name}</p>
              </div>
            </div>

            {/* CONCEPT 1: Live Pollutant Measurement */}
            <div className="glass-card" style={{ padding: 14, marginBottom: 14, background: 'rgba(15,23,42,0.6)' }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, color: '#60A5FA' }}>
                <Activity size={16} /> 1. Live Pollutant Telemetry
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                <div>PM2.5: <strong>{selectedStation.pm25_val} µg/m³</strong></div>
                <div>PM10: <strong>{selectedStation.pm10_val} µg/m³</strong></div>
                <div>NO2: <strong>{selectedStation.no2_val} µg/m³</strong></div>
                <div>SO2: <strong>{selectedStation.so2_val} µg/m³</strong></div>
                <div>CO: <strong>{selectedStation.co_val} mg/m³</strong></div>
                <div>O3: <strong>{selectedStation.o3_val} µg/m³</strong></div>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8 }}>Timestamp: {selectedStation.last_updated}</p>
            </div>

            {/* CONCEPT 2: ML Prediction */}
            <div className="glass-card" style={{ padding: 14, marginBottom: 14, background: 'rgba(15,23,42,0.6)' }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: '#A7F3D0' }}>
                <Zap size={16} /> 2. ML AQI Prediction
              </h4>
              <div style={{ fontSize: 14, fontWeight: 700, color: MARKER_COLORS[selectedStation.status_type] }}>
                {selectedStation.predicted_category}
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                Inferred using RandomForest Pipeline (99.91% Accuracy)
              </p>
            </div>

            {/* CONCEPT 3: Pollutant Threshold Exceedance */}
            <div className="glass-card" style={{ padding: 14, marginBottom: 14, background: 'rgba(15,23,42,0.6)' }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: '#FDE047' }}>
                <AlertTriangle size={16} /> 3. Threshold Exceedance
              </h4>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{selectedStation.exceedance_status}</div>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                Evaluated against {selectedStation.country_name === 'India' ? 'CPCB India NAAQS Standard' : 'WHO Guidelines'}
              </p>
            </div>

            {/* CONCEPT 4: Confirmed Regulatory Violation */}
            <div className="glass-card" style={{ padding: 14, background: selectedStation.is_regulatory_violation ? 'rgba(239,68,68,0.15)' : 'rgba(15,23,42,0.6)', border: selectedStation.is_regulatory_violation ? '1px solid #EF4444' : '1px solid rgba(255,255,255,0.1)' }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: selectedStation.is_regulatory_violation ? '#F87171' : '#94A3B8' }}>
                <Scale size={16} /> 4. Regulatory Violation Status
              </h4>
              <div style={{ fontSize: 12, fontWeight: 700, color: selectedStation.is_regulatory_violation ? '#EF4444' : '#10B981' }}>
                {selectedStation.is_regulatory_violation ? 'CONFIRMED LEGAL VIOLATION' : 'NO LEGAL VIOLATION FILED'}
              </div>
              <p style={{ fontSize: 11, color: selectedStation.is_regulatory_violation ? '#FCA5A5' : 'var(--text-secondary)', marginTop: 4 }}>
                {selectedStation.legal_notice}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
