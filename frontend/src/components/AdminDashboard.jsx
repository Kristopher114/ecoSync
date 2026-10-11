import React, { useState } from 'react';
import {
  ShieldAlert, CheckCircle, Clock, Trash2, Edit3,
  Users, BarChart2, AlertTriangle, Flame, Droplets, HeartPulse
} from 'lucide-react';

export default function AdminDashboard({ incidents, onUpdateStatus, onDeleteIncident }) {
  const [filterStatus, setFilterStatus] = useState('All');

  // KPI calculations
  const totalIncidents = incidents.length;
  const criticalCount = incidents.filter(i => i.urgency === 'Critical' && i.status !== 'Resolved').length;
  const inProgressCount = incidents.filter(i => i.status === 'In Progress').length;
  const resolvedCount = incidents.filter(i => i.status === 'Resolved').length;
  const openCount = incidents.filter(i => i.status === 'Open').length;

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
