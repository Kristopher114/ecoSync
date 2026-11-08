import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, CheckCircle, Clock, Trash2, Edit3,
  Users, BarChart2, AlertTriangle, Flame, Droplets, HeartPulse,
  Send, RefreshCw, BellRing, CheckCircle2, ShieldCheck,
  Compass, Shield, MapPin, Navigation, Car, Bed
} from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function AdminDashboard({ incidents, onUpdateStatus, onDeleteIncident }) {
  const [filterStatus, setFilterStatus] = useState('All');

  // Safe Evacuation Centers & OSRM Routing API (API #5)
  const [shelters, setShelters] = useState([]);
  const [isLoadingShelters, setIsLoadingShelters] = useState(false);
  const [isSimulatingRoute, setIsSimulatingRoute] = useState(false);
  const [routeToast, setRouteToast] = useState('');

  // Fetch Evacuation Shelters from Backend
  const fetchShelters = async () => {
    setIsLoadingShelters(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/evacuation-shelters`);
      if (res.ok) {
        const data = await res.json();
        setShelters(data);
      }
    } catch (err) {
      console.warn('Failed to fetch evacuation shelters:', err.message);
    } finally {
      setIsLoadingShelters(false);
    }
  };

  useEffect(() => {
    fetchShelters();
  }, []);

  // Simulate OSRM road evacuation route calculation live
  const handleSimulateRoute = async (shelter) => {
    setIsSimulatingRoute(true);
    setRouteToast('');

    try {
      const startLat = 8.2250;
      const startLng = 124.2400;
      const destLat = shelter ? shelter.latitude : null;
      const destLng = shelter ? shelter.longitude : null;

      let url = `${API_BASE_URL}/api/evacuation-route?startLat=${startLat}&startLng=${startLng}&mode=driving`;
      if (destLat && destLng) {
        url += `&destLat=${destLat}&destLng=${destLng}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setRouteToast(`✅ OSRM Street Route Verified: ${data.distance_km} km to ${data.shelter?.name} (${data.duration_mins} mins travel time)`);
        setTimeout(() => setRouteToast(''), 8000);
      }
    } catch (err) {
      alert('Routing simulation failed: ' + err.message);
    } finally {
      setIsSimulatingRoute(false);
    }
  };

  // KPI calculations
  const totalIncidents = incidents.length;
  const criticalCount = incidents.filter(i => i.urgency === 'Critical' && i.status !== 'Resolved').length;
  const inProgressCount = incidents.filter(i => i.status === 'In Progress').length;
  const resolvedCount = incidents.filter(i => i.status === 'Resolved').length;

  // Evacuation capacity calculations
  const totalShelterCapacity = shelters.reduce((acc, curr) => acc + (curr.total_capacity || 0), 0);
  const totalOccupancy = shelters.reduce((acc, curr) => acc + (curr.current_occupancy || 0), 0);
  const availableCots = totalShelterCapacity - totalOccupancy;
  const occupancyPct = totalShelterCapacity > 0 ? Math.round((totalOccupancy / totalShelterCapacity) * 100) : 0;

  // Category counts for charts
  const categoryCounts = incidents.reduce((acc, curr) => {
    const cat = curr.category || 'General';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  // Urgency counts for charts
  const urgencyCounts = incidents.reduce((acc, curr) => {
    const urg = curr.urgency || 'Medium';
    acc[urg] = (acc[urg] || 0) + 1;
    return acc;
  }, {});

  const filteredIncidents = filterStatus === 'All'
    ? incidents
    : incidents.filter(i => i.status === filterStatus);

  return (
    <div className="admin-container">
      {/* Top Banner */}
      <div className="admin-header glass-panel">
        <div>
          <h2>Emergency Operations Command Center</h2>
          <p className="text-muted">Real-time incident dispatch, triage analytics, and report management</p>
        </div>
        <div className="admin-badge-role">
          <ShieldAlert size={18} className="text-red" />
          <span>Admin Authorization Active</span>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="kpi-grid">
        <div className="kpi-card glass-panel border-cyan">
          <div className="kpi-icon-wrap bg-cyan-glow">
            <BarChart2 size={24} className="text-cyan" />
          </div>
          <div>
            <span className="kpi-label">Total Reports</span>
            <h3 className="kpi-value">{totalIncidents}</h3>
          </div>
        </div>

        <div className="kpi-card glass-panel border-red">
          <div className="kpi-icon-wrap bg-red-glow">
            <AlertTriangle size={24} className="text-red" />
          </div>
          <div>
            <span className="kpi-label">Critical Alarms</span>
            <h3 className="kpi-value text-red">{criticalCount}</h3>
          </div>
        </div>

        <div className="kpi-card glass-panel border-amber">
          <div className="kpi-icon-wrap bg-amber-glow">
            <Clock size={24} className="text-amber" />
          </div>
          <div>
            <span className="kpi-label">In Progress Triage</span>
            <h3 className="kpi-value text-amber">{inProgressCount}</h3>
          </div>
        </div>

        <div className="kpi-card glass-panel border-emerald">
          <div className="kpi-icon-wrap bg-emerald-glow">
            <CheckCircle size={24} className="text-emerald" />
          </div>
          <div>
            <span className="kpi-label">Resolved / Safe</span>
            <h3 className="kpi-value text-emerald">{resolvedCount}</h3>
          </div>
        </div>
      </div>

      {/* Analytics Visual Charts Section */}
      <div className="analytics-grid">
        {/* Category Breakdown Chart */}
        <div className="chart-card glass-panel">
          <div className="chart-header">
            <h4>Incident Distribution by Disaster Type</h4>
            <span className="text-dim text-sm">Automated by Gemini AI</span>
          </div>
          <div className="bar-chart-list">
            {Object.entries(categoryCounts).map(([category, count]) => {
              const pct = totalIncidents > 0 ? Math.round((count / totalIncidents) * 100) : 0;
              return (
                <div key={category} className="chart-bar-item">
                  <div className="chart-bar-labels">
                    <span className="category-title">{category}</span>
                    <span className="category-count">{count} reports ({pct}%)</span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: category === 'Flood' ? '#38bdf8' :
                                         category === 'Medical' ? '#f43f5e' :
                                         category === 'Fire' ? '#fb923c' :
                                         category === 'Rescue' ? '#a855f7' : '#06b6d4'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Urgency Severity Gauge */}
        <div className="chart-card glass-panel">
          <div className="chart-header">
            <h4>Urgency Severity Matrix</h4>
            <span className="text-dim text-sm">Prioritization Queue</span>
          </div>
          <div className="urgency-matrix-grid">
            <div className="urgency-matrix-box border-red">
              <span className="matrix-title">Critical</span>
              <span className="matrix-num text-red">{urgencyCounts['Critical'] || 0}</span>
              <span className="matrix-desc">Immediate Threat to Life</span>
            </div>
            <div className="urgency-matrix-box border-orange">
              <span className="matrix-title">High</span>
              <span className="matrix-num text-orange">{urgencyCounts['High'] || 0}</span>
              <span className="matrix-desc">Escalating Condition</span>
            </div>
            <div className="urgency-matrix-box border-amber">
              <span className="matrix-title">Medium</span>
              <span className="matrix-num text-amber">{urgencyCounts['Medium'] || 0}</span>
              <span className="matrix-desc">Relief Needed Soon</span>
            </div>
            <div className="urgency-matrix-box border-emerald">
              <span className="matrix-title">Low</span>
              <span className="matrix-num text-emerald">{urgencyCounts['Low'] || 0}</span>
              <span className="matrix-desc">Non-life threatening</span>
            </div>
          </div>
        </div>
      </div>

      {/* SAFE EVACUATION SHELTERS & OSRM ROUTE NAVIGATION CONSOLE (API #5) */}
      <div className="dispatch-card glass-panel">
        <div className="dispatch-header">
          <div className="dispatch-title-left">
            <Compass size={22} className="text-cyan pulse-icon" />
            <div>
              <div className="dispatch-title-row">
                <h4>Designated Evacuation Shelters & Safe Route Readiness</h4>
                <span className="api-chip-badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.4)' }}>
                  API #5: OSRM Routing Engine
                </span>
              </div>
              <p className="text-muted text-xs">
                Active municipal emergency shelters, live occupancy capacities, and turn-by-turn road evacuation routes
              </p>
            </div>
          </div>

          <div className="dispatch-actions">
            <button
              className="btn-refresh-dispatch"
              onClick={fetchShelters}
              title="Refresh Shelter Capacities"
              disabled={isLoadingShelters}
            >
              <RefreshCw size={14} className={isLoadingShelters ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              id="btn-trigger-drill"
              className="btn-drill-dispatch"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #0284c7)', borderColor: 'rgba(6, 182, 212, 0.5)' }}
              onClick={() => handleSimulateRoute(shelters[0])}
              disabled={isSimulatingRoute || shelters.length === 0}
            >
              <Navigation size={14} className={isSimulatingRoute ? 'spin' : ''} />
              <span>{isSimulatingRoute ? 'Routing...' : '🧭 Test Safe Road Route (OSRM)'}</span>
            </button>
          </div>
        </div>

        {/* Route Toast Confirmation Banner */}
        {routeToast && (
          <div className="dispatch-toast-banner" style={{ background: 'rgba(6, 182, 212, 0.15)', borderColor: 'rgba(6, 182, 212, 0.4)', color: '#7dd3fc' }}>
            <CheckCircle2 size={16} className="text-cyan" />
            <span>{routeToast}</span>
          </div>
        )}

        {/* Shelter Metrics Strip */}
        <div className="comms-kpi-strip">
          <div className="comms-kpi-item">
            <span className="comms-kpi-label">Active Evacuation Hubs</span>
            <span className="comms-kpi-val text-cyan">{shelters.length} Shelters</span>
          </div>
          <div className="comms-kpi-item">
            <span className="comms-kpi-label">Total Cots Capacity</span>
            <span className="comms-kpi-val text-light">{totalShelterCapacity} Cots</span>
          </div>
          <div className="comms-kpi-item">
            <span className="comms-kpi-label">Available Cots / Beds</span>
            <span className="comms-kpi-val text-emerald">{availableCots} Available</span>
          </div>
          <div className="comms-kpi-item">
            <span className="comms-kpi-label">Overall City Occupancy</span>
            <span className="comms-kpi-val text-amber">{occupancyPct}% ({totalOccupancy} Evacuees)</span>
          </div>
        </div>

        {/* Evacuation Shelters Directory Table */}
        <div className="table-responsive" style={{ marginTop: '12px' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Shelter ID</th>
                <th>Shelter & Address</th>
                <th>Type</th>
                <th>Elevation / Hazard Risk</th>
                <th>Live Occupancy</th>
                <th>Key Resources</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {shelters.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-muted">
                    Loading designated evacuation shelters...
                  </td>
                </tr>
              ) : (
                shelters.map((shelter) => {
                  const pct = Math.round((shelter.current_occupancy / shelter.total_capacity) * 100);
                  return (
                    <tr key={shelter.id}>
                      <td className="font-mono text-cyan" style={{ fontWeight: 600 }}>{shelter.id}</td>
                      <td>
                        <div className="incident-table-cell">
                          <strong>{shelter.name}</strong>
                          <span className="text-muted text-xs">{shelter.address}</span>
                        </div>
                      </td>
                      <td>
                        <span className="target-squad-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                          {shelter.type}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs text-dim" style={{ color: '#a7f3d0' }}>
                          ⛰️ {shelter.elevation}
                        </span>
                      </td>
                      <td style={{ minWidth: '140px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span className="text-xs" style={{ color: '#e2e8f0', fontWeight: 600 }}>
                            {shelter.current_occupancy} / {shelter.total_capacity} ({pct}%)
                          </span>
                          <div style={{ height: '5px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: pct > 80 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#10b981' }}></div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="needs-chip-list">
                          {(shelter.amenities || []).slice(0, 2).map((am, idx) => (
                            <span key={idx} className="need-chip-sm">⚡ {am}</span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className="status-pill-delivered">
                          <span className="status-dot-emerald"></span>
                          {shelter.status.split(' ')[0]}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn-refresh-dispatch"
                          style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                          onClick={() => handleSimulateRoute(shelter)}
                          title="Simulate OSRM road route to this center"
                        >
                          <Navigation size={12} className="text-cyan" />
                          <span>Test Route</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Incident CRUD Management Table */}
      <div className="table-card glass-panel">
        <div className="table-card-header">
          <div>
            <h4>Citizen Incident Reports (CRUD Management)</h4>
            <p className="text-muted text-sm">Resolve active emergencies or purge false alarms</p>
          </div>

          <div className="filter-button-group">
            {['All', 'Open', 'In Progress', 'Resolved'].map(st => (
              <button
                key={st}
                className={`filter-btn ${filterStatus === st ? 'active' : ''}`}
                onClick={() => setFilterStatus(st)}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title & Description</th>
                <th>Category</th>
                <th>Urgency</th>
                <th>Location</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted">
                    No incidents match this filter.
                  </td>
                </tr>
              ) : (
                filteredIncidents.map(inc => (
                  <tr key={inc.id}>
                    <td className="font-mono text-dim">#{inc.id}</td>
                    <td>
                      <div className="incident-table-cell">
                        <strong>{inc.title}</strong>
                        <span className="text-muted text-xs truncate-2">{inc.description}</span>
                      </div>
                    </td>
                    <td>
                      <span className="table-cat-badge">{inc.category}</span>
                    </td>
                    <td>
                      <span className={`badge badge-${inc.urgency?.toLowerCase()}`}>
                        {inc.urgency}
                      </span>
                    </td>
                    <td className="text-sm text-muted">
                      {inc.location_name || `${inc.latitude?.toFixed(2)}, ${inc.longitude?.toFixed(2)}`}
                    </td>
                    <td>
                      <select
                        className={`status-select status-${inc.status?.toLowerCase().replace(' ', '-')}`}
                        value={inc.status}
                        onChange={(e) => onUpdateStatus(inc.id, e.target.value)}
                      >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </td>
                    <td>
                      <button
                        className="delete-row-btn"
                        title="Delete Fake / Invalid Report"
                        onClick={() => {
                          if (window.confirm(`Delete incident #${inc.id} (${inc.title})?`)) {
                            onDeleteIncident(inc.id);
                          }
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
