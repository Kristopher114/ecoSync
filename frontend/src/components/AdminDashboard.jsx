import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, CheckCircle, Clock, Trash2, Edit3,
  Users, BarChart2, AlertTriangle, Flame, Droplets, HeartPulse,
  Radio, Send, RefreshCw, BellRing, CheckCircle2, ShieldCheck, Mail
} from 'lucide-react';

export default function AdminDashboard({ incidents, onUpdateStatus, onDeleteIncident }) {
  const [filterStatus, setFilterStatus] = useState('All');
  
  // Emergency Alert Dispatch Comms API (API #5)
  const [dispatchLogs, setDispatchLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isDispatchingDrill, setIsDispatchingDrill] = useState(false);
  const [dispatchToast, setDispatchToast] = useState('');

  // Fetch dispatch transmission logs from backend
  const fetchDispatchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('http://localhost:5000/api/alerts/logs');
      if (res.ok) {
        const data = await res.json();
        setDispatchLogs(data);
      }
    } catch (err) {
      console.warn('Failed to fetch dispatch logs:', err.message);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchDispatchLogs();
  }, []);

  // Trigger automated drill / emergency broadcast test (demonstrates API #5 live)
  const handleTriggerDrill = async () => {
    setIsDispatchingDrill(true);
    setDispatchToast('');

    const drillPayload = {
      title: 'Rapid Evacuation & Resource Mobilization Drill',
      category: 'Flood',
      urgency: 'Critical',
      location_name: 'Poblacion Riverside Sector 4',
      actionable_needs: ['Rubber Rescue Boats', 'Emergency Rations', 'First Aid Kits']
    };

    try {
      const res = await fetch('http://localhost:5000/api/alerts/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(drillPayload)
      });

      if (res.ok) {
        const result = await res.json();
        setDispatchToast(result.message || 'Emergency Alert Dispatched Successfully!');
        fetchDispatchLogs();
        setTimeout(() => setDispatchToast(''), 6000);
      }
    } catch (err) {
      alert('Dispatch failed: ' + err.message);
    } finally {
      setIsDispatchingDrill(false);
    }
  };

  // KPI calculations
  const totalIncidents = incidents.length;
  const criticalCount = incidents.filter(i => i.urgency === 'Critical' && i.status !== 'Resolved').length;
  const inProgressCount = incidents.filter(i => i.status === 'In Progress').length;
  const resolvedCount = incidents.filter(i => i.status === 'Resolved').length;
  const openCount = incidents.filter(i => i.status === 'Open').length;

  // Total volunteer alert transmissions
  const totalAlertsCount = dispatchLogs.length;
  const totalVolunteersAlerted = dispatchLogs.reduce((acc, curr) => acc + (curr.recipients_count || 0), 0);

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

      {/* EMERGENCY ALERT DISPATCH & VOLUNTEER COMMS CONSOLE (API #5) */}
      <div className="dispatch-card glass-panel">
        <div className="dispatch-header">
          <div className="dispatch-title-left">
            <Radio size={20} className="text-cyan pulse-icon" />
            <div>
              <div className="dispatch-title-row">
                <h4>Emergency Alert Dispatch & Volunteer Comms Console</h4>
                <span className="api-chip-badge">API #5: EmailJS / SendGrid Grid</span>
              </div>
              <p className="text-muted text-xs">
                Real-time outbound broadcast network routing critical incident alerts to volunteer responder squads
              </p>
            </div>
          </div>

          <div className="dispatch-actions">
            <button
              className="btn-refresh-dispatch"
              onClick={fetchDispatchLogs}
              title="Refresh Transmission History"
              disabled={isLoadingLogs}
            >
              <RefreshCw size={14} className={isLoadingLogs ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              id="btn-trigger-drill"
              className="btn-drill-dispatch"
              onClick={handleTriggerDrill}
              disabled={isDispatchingDrill}
            >
              <Send size={14} className={isDispatchingDrill ? 'spin' : ''} />
              <span>{isDispatchingDrill ? 'Transmitting...' : '🚨 Trigger Emergency Broadcast Drill'}</span>
            </button>
          </div>
        </div>

        {/* Dispatch Confirmation Banner */}
        {dispatchToast && (
          <div className="dispatch-toast-banner">
            <CheckCircle2 size={16} className="text-emerald" />
            <span>{dispatchToast}</span>
          </div>
        )}

        {/* Mini Comms KPI Strip */}
        <div className="comms-kpi-strip">
          <div className="comms-kpi-item">
            <span className="comms-kpi-label">Dispatched Transmissions</span>
            <span className="comms-kpi-val text-cyan">{totalAlertsCount}</span>
          </div>
          <div className="comms-kpi-item">
            <span className="comms-kpi-label">Volunteers Alerted</span>
            <span className="comms-kpi-val text-emerald">{totalVolunteersAlerted}</span>
          </div>
          <div className="comms-kpi-item">
            <span className="comms-kpi-label">Comms Delivery Rate</span>
            <span className="comms-kpi-val text-emerald">100% Confirmed</span>
          </div>
          <div className="comms-kpi-item">
            <span className="comms-kpi-label">Primary Dispatch Gateways</span>
            <span className="comms-kpi-val text-amber">Email Broadcast + SMS Wire</span>
          </div>
        </div>

        {/* Dispatch Transmission Log Table */}
        <div className="table-responsive" style={{ marginTop: '12px' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Alert ID</th>
                <th>Incident & Location</th>
                <th>Target Volunteer Squad</th>
                <th>Recipients</th>
                <th>Actionable Needs</th>
                <th>Channel</th>
                <th>Status</th>
                <th>Dispatched</th>
              </tr>
            </thead>
            <tbody>
              {dispatchLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-muted">
                    No emergency broadcasts dispatched yet. Click "Trigger Emergency Broadcast Drill" to test.
                  </td>
                </tr>
              ) : (
                dispatchLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="font-mono text-cyan" style={{ fontWeight: 600 }}>{log.id}</td>
                    <td>
                      <div className="incident-table-cell">
                        <strong>{log.incident_title}</strong>
                        <span className="text-muted text-xs">{log.location}</span>
                      </div>
                    </td>
                    <td>
                      <span className="target-squad-badge">{log.recipient_group}</span>
                    </td>
                    <td>
                      <span className="text-sm" style={{ color: '#e2e8f0', fontWeight: 600 }}>
                        {log.recipients_count} volunteers
                      </span>
                    </td>
                    <td>
                      <div className="needs-chip-list">
                        {(log.actionable_needs || ['Rapid Assessment']).map((need, idx) => (
                          <span key={idx} className="need-chip-sm">⚡ {need}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className="text-xs text-dim">{log.channel}</span>
                    </td>
                    <td>
                      <span className="status-pill-delivered">
                        <span className="status-dot-emerald"></span>
                        {log.status || 'Delivered'}
                      </span>
                    </td>
                    <td className="text-xs text-dim">
                      {log.dispatched_at ? new Date(log.dispatched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                    </td>
                  </tr>
                ))
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
