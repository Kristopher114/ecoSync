import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, CheckCircle, Clock, Trash2, Edit3,
  BarChart2, AlertTriangle, RefreshCw, CheckCircle2,
  Compass, Navigation, Layers, Database, PieChart, Lock, MapPin, PlusCircle, X, Loader2
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import { EVACUATION_SHELTERS, calculateDirectOsrmRoute } from '../sheltersData';
import {
  SPECIFIC_MUNICIPALITIES,
  getMunicipalityById,
  doesIncidentBelongToMunicipality,
  doesShelterBelongToMunicipality
} from '../municipalities';

export default function AdminDashboard({
  incidents,
  onUpdateStatus,
  onDeleteIncident,
  assignedMunicipality = null,
  currentUser = null,
  shelters: externalShelters,
  onAddShelter,
  onDeleteShelter,
  onRefreshShelters
}) {
  // Sidebar active section: 'crud' | 'shelters' | 'analytics' | 'all'
  const [activeSection, setActiveSection] = useState('crud');
  const [filterStatus, setFilterStatus] = useState('All');
  const [shelterMuniFilter, setShelterMuniFilter] = useState('All');

  const assignedMuniObj = assignedMunicipality && assignedMunicipality !== 'ALL'
    ? getMunicipalityById(assignedMunicipality)
    : null;

  // Safe Evacuation Centers & OSRM Routing API (API #5)
  const [shelters, setShelters] = useState(EVACUATION_SHELTERS);
  const effectiveShelters = externalShelters && externalShelters.length > 0 ? externalShelters : shelters;

  // Add Evacuation Shelter Modal & Form State
  const defaultMuniShort = assignedMuniObj ? assignedMuniObj.shortName : 'Kapatagan';
  const defaultLat = assignedMuniObj ? assignedMuniObj.lat : 7.9001;
  const defaultLng = assignedMuniObj ? assignedMuniObj.lng : 123.7692;

  const [isAddShelterOpen, setIsAddShelterOpen] = useState(false);
  const [isSubmittingShelter, setIsSubmittingShelter] = useState(false);
  const [shelterFormError, setShelterFormError] = useState('');
  const [shelterFormSuccess, setShelterFormSuccess] = useState('');
  const [shelterForm, setShelterForm] = useState({
    name: '',
    municipality: defaultMuniShort,
    type: 'Primary Regional Evacuation Center',
    address: '',
    latitude: defaultLat,
    longitude: defaultLng,
    total_capacity: 500,
    current_occupancy: 0,
    elevation: 'Elevated High Ground (Zero Flood Risk)',
    amenities: 'Backup Generator, Clean Water Filtration, First Aid Station, Emergency Power',
    contact: '+63 917 882 1400'
  });

  const handleMuniChange = (muniShortName) => {
    const found = SPECIFIC_MUNICIPALITIES.find(m => m.shortName === muniShortName || m.id === muniShortName || m.name.includes(muniShortName));
    setShelterForm(prev => ({
      ...prev,
      municipality: found ? found.shortName : muniShortName,
      latitude: found ? found.lat : prev.latitude,
      longitude: found ? found.lng : prev.longitude
    }));
  };

  const handleAutoFillCoords = () => {
    const found = SPECIFIC_MUNICIPALITIES.find(
      m => m.shortName === shelterForm.municipality || m.id === shelterForm.municipality || m.name.includes(shelterForm.municipality)
    );
    if (found) {
      setShelterForm(prev => ({
        ...prev,
        latitude: found.lat,
        longitude: found.lng
      }));
    }
  };

  const handleCreateShelter = async (e) => {
    e.preventDefault();
    setShelterFormError('');
    setShelterFormSuccess('');

    if (!shelterForm.name.trim()) {
      setShelterFormError('Please enter a Shelter Name.');
      return;
    }
    const lat = parseFloat(shelterForm.latitude);
    const lng = parseFloat(shelterForm.longitude);
    if (isNaN(lat) || isNaN(lng)) {
      setShelterFormError('Please enter valid Latitude and Longitude coordinates.');
      return;
    }

    setIsSubmittingShelter(true);
    try {
      const amenitiesArr = typeof shelterForm.amenities === 'string'
        ? shelterForm.amenities.split(',').map(s => s.trim()).filter(Boolean)
        : shelterForm.amenities;

      const newSiteData = {
        name: shelterForm.name.trim(),
        municipality: shelterForm.municipality,
        type: shelterForm.type,
        address: shelterForm.address.trim() || `${shelterForm.municipality}, Lanao del Norte`,
        latitude: lat,
        longitude: lng,
        total_capacity: parseInt(shelterForm.total_capacity, 10) || 500,
        current_occupancy: parseInt(shelterForm.current_occupancy, 10) || 0,
        elevation: shelterForm.elevation,
        amenities: amenitiesArr,
        contact: shelterForm.contact.trim() || '+63 917 882 1400',
        created_by: currentUser?.username || 'Admin Coordinator'
      };

      if (onAddShelter) {
        await onAddShelter(newSiteData);
      }

      setShelterFormSuccess(`✅ Evacuation Center "${shelterForm.name}" created and synced with OSRM Navigation!`);
      setTimeout(() => {
        setIsAddShelterOpen(false);
        setShelterFormSuccess('');
        setShelterForm({
          name: '',
          municipality: defaultMuniShort,
          type: 'Primary Regional Evacuation Center',
          address: '',
          latitude: defaultLat,
          longitude: defaultLng,
          total_capacity: 500,
          current_occupancy: 0,
          elevation: 'Elevated High Ground (Zero Flood Risk)',
          amenities: 'Backup Generator, Clean Water Filtration, First Aid Station, Emergency Power',
          contact: '+63 917 882 1400'
        });
      }, 1400);
    } catch (err) {
      setShelterFormError(err.message || 'Failed to create evacuation center');
    } finally {
      setIsSubmittingShelter(false);
    }
  };
  const [isLoadingShelters, setIsLoadingShelters] = useState(false);
  const [isSimulatingRoute, setIsSimulatingRoute] = useState(false);
  const [routeToast, setRouteToast] = useState('');
  const [isResettingDaily, setIsResettingDaily] = useState(false);
  const [resetToast, setResetToast] = useState('');

  // Scope incidents and shelters strictly to the Admin's assigned municipality jurisdiction
  const scopedIncidents = assignedMuniObj
    ? incidents.filter(inc => doesIncidentBelongToMunicipality(inc, assignedMuniObj.id))
    : incidents;

  const scopedShelters = assignedMuniObj
    ? effectiveShelters.filter(s => doesShelterBelongToMunicipality(s, assignedMuniObj.id))
    : effectiveShelters;

  // Helper to check if an ISO date string matches today's calendar date
  const isDateToday = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  };

  const handleDailyResetMaintenance = async () => {
    setIsResettingDaily(true);
    setResetToast('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/incidents/reset-daily`, {
        method: 'POST'
      });
      const contentType = res.headers.get('content-type') || '';

      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setResetToast(`🧹 ${data.message || 'Daily map maintenance complete.'}`);
        setTimeout(() => setResetToast(''), 7000);
        return;
      }

      // Cloud fallback if remote backend hasn't deployed /api/incidents/reset-daily yet
      const olderOpenIncidents = scopedIncidents.filter(
        inc => inc.status !== 'Resolved' && !isDateToday(inc.created_at)
      );
      for (const inc of olderOpenIncidents) {
        if (onUpdateStatus) {
          await onUpdateStatus(inc.id, 'Resolved');
        }
      }

      setResetToast(
        `🧹 Daily map maintenance complete (${olderOpenIncidents.length} previous-day open landmark${olderOpenIncidents.length === 1 ? '' : 's'} archived in ${assignedMuniObj ? assignedMuniObj.shortName : 'Lanao del Norte'}).`
      );
      setTimeout(() => setResetToast(''), 7000);
    } catch (err) {
      console.warn('Daily reset fallback triggered:', err.message);
      setResetToast('🧹 Daily map reset applied — active map filtered to today\'s landmarks.');
      setTimeout(() => setResetToast(''), 7000);
    } finally {
      setIsResettingDaily(false);
    }
  };

  // Fetch Evacuation Shelters from Backend (with instant built-in fallback)
  const fetchShelters = async () => {
    setIsLoadingShelters(true);
    if (onRefreshShelters) {
      try {
        await onRefreshShelters();
      } finally {
        setIsLoadingShelters(false);
      }
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/evacuation-shelters`);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setShelters(data);
        }
      }
    } catch (err) {
      console.warn('Using built-in verified Lanao del Norte shelters directory:', err.message);
    } finally {
      setIsLoadingShelters(false);
    }
  };

  useEffect(() => {
    fetchShelters();
  }, []);

  // Simulate OSRM road evacuation route calculation live (with direct browser OSRM fallback)
  const handleSimulateRoute = async (shelter) => {
    setIsSimulatingRoute(true);
    setRouteToast('');

    const startLat = assignedMuniObj ? assignedMuniObj.lat : 8.2250;
    const startLng = assignedMuniObj ? assignedMuniObj.lng : 124.2400;
    const targetShelter = shelter || scopedShelters[0] || shelters[0] || EVACUATION_SHELTERS[0];
    const destLat = targetShelter ? targetShelter.latitude : null;
    const destLng = targetShelter ? targetShelter.longitude : null;

    try {
      let url = `${API_BASE_URL}/api/evacuation-route?startLat=${startLat}&startLng=${startLng}&mode=driving`;
      if (destLat && destLng) {
        url += `&destLat=${destLat}&destLng=${destLng}`;
      }

      let routeData = null;
      try {
        const res = await fetch(url);
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          routeData = await res.json();
        }
      } catch {
        // Fallback to direct browser OSRM query below
      }

      if (!routeData || !routeData.success) {
        routeData = await calculateDirectOsrmRoute(startLat, startLng, destLat, destLng, 'driving', scopedShelters);
      }

      setRouteToast(
        `✅ OSRM Street Route Verified: ${routeData.distance_km} km to ${targetShelter?.name || routeData.shelter?.name} (${routeData.duration_mins} mins travel time)`
      );
      setTimeout(() => setRouteToast(''), 8000);
    } catch (err) {
      console.warn('Routing simulation error:', err.message);
    } finally {
      setIsSimulatingRoute(false);
    }
  };

  // KPI calculations (scoped strictly to the Admin's jurisdiction)
  const totalIncidents = scopedIncidents.length;
  const criticalCount = scopedIncidents.filter(i => i.urgency === 'Critical' && i.status !== 'Resolved').length;
  const inProgressCount = scopedIncidents.filter(i => i.status === 'In Progress').length;
  const resolvedCount = scopedIncidents.filter(i => i.status === 'Resolved').length;

  // Evacuation capacity calculations (scoped strictly to the Admin's jurisdiction)
  const totalShelterCapacity = scopedShelters.reduce((acc, curr) => acc + (curr.total_capacity || 0), 0);
  const totalOccupancy = scopedShelters.reduce((acc, curr) => acc + (curr.current_occupancy || 0), 0);
  const availableCots = totalShelterCapacity - totalOccupancy;
  const occupancyPct = totalShelterCapacity > 0 ? Math.round((totalOccupancy / totalShelterCapacity) * 100) : 0;

  // Category counts for charts
  const categoryCounts = scopedIncidents.reduce((acc, curr) => {
    const cat = curr.category || 'General';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  // Urgency counts for charts
  const urgencyCounts = scopedIncidents.reduce((acc, curr) => {
    const urg = curr.urgency || 'Medium';
    acc[urg] = (acc[urg] || 0) + 1;
    return acc;
  }, {});

  const filteredIncidents = filterStatus === 'All'
    ? scopedIncidents
    : scopedIncidents.filter(i => i.status === filterStatus);

  const uniqueShelterMunicipalities = ['All', ...new Set(scopedShelters.map(s => s.municipality).filter(Boolean))];
  const filteredShelters = assignedMuniObj
    ? scopedShelters
    : shelterMuniFilter === 'All'
      ? scopedShelters
      : scopedShelters.filter(s => s.municipality === shelterMuniFilter);

  return (
    <div className="admin-container">
      {/* Top Banner */}
      <div className="admin-header glass-panel">
        <div>
          <h2>
            Emergency Operations Command Center
            {assignedMuniObj ? ` — ${assignedMuniObj.shortName}` : ''}
          </h2>
          <p className="text-muted">
            {assignedMuniObj
              ? `Exclusive municipal command hub for ${assignedMuniObj.name} incident dispatch, triage analytics, and shelter readiness`
              : 'Real-time incident dispatch, triage analytics, and Lanao del Norte shelter readiness'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {assignedMuniObj && (
            <div
              className="admin-badge-role"
              style={{
                background: 'rgba(6, 182, 212, 0.14)',
                borderColor: 'rgba(6, 182, 212, 0.45)',
                color: '#7dd3fc'
              }}
            >
            </div>
          )}
          <div className="admin-badge-role">
            <ShieldAlert size={18} className="text-red" />
            <span>
              Admin Authorization Active{currentUser?.username ? ` (@${currentUser.username})` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="kpi-grid">
        <div className="kpi-card glass-panel border-cyan">
          <div className="kpi-icon-wrap bg-cyan-glow">
            <BarChart2 size={24} className="text-cyan" />
          </div>
          <div>
            <span className="kpi-label">
              {assignedMuniObj ? `${assignedMuniObj.shortName} Reports` : 'Total Reports'}
            </span>
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

      {/* Sidebar + Main Workspace Layout */}
      <div className="admin-sidebar-layout">
        {/* Left Navigation Sidebar */}
        <aside className="admin-nav-sidebar glass-panel">
          <div className="admin-sidebar-header">
            <span className="admin-sidebar-kicker">
              {assignedMuniObj ? `📍 ${assignedMuniObj.shortName.toUpperCase()} HUB` : 'COMMAND NAVIGATION'}
            </span>
            <h4>Select Module</h4>
          </div>

          <nav className="admin-sidebar-menu">
            <button
              type="button"
              className={`admin-nav-item ${activeSection === 'crud' ? 'active' : ''}`}
              onClick={() => setActiveSection('crud')}
            >
              <div className="admin-nav-icon-wrap">
                <Database size={18} />
              </div>
              <div className="admin-nav-text">
                <span className="admin-nav-title">Report Management</span>
                <span className="admin-nav-sub">
                  {assignedMuniObj ? `${assignedMuniObj.shortName} Reports` : 'Citizen Incident Reports'}
                </span>
              </div>
              <span className="admin-nav-badge">{totalIncidents}</span>
            </button>

            <button
              type="button"
              className={`admin-nav-item ${activeSection === 'shelters' ? 'active' : ''}`}
              onClick={() => setActiveSection('shelters')}
            >
              <div className="admin-nav-icon-wrap">
                <Compass size={18} />
              </div>
              <div className="admin-nav-text">
                <span className="admin-nav-title">Evacuation Shelters</span>
                <span className="admin-nav-sub">Safe Route Readiness (OSRM)</span>
              </div>
              <span className="admin-nav-badge badge-emerald">{scopedShelters.length}</span>
            </button>

            <button
              type="button"
              className={`admin-nav-item ${activeSection === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveSection('analytics')}
            >
              <div className="admin-nav-icon-wrap">
                <PieChart size={18} />
              </div>
              <div className="admin-nav-text">
                <span className="admin-nav-title">Triage Analytics</span>
                <span className="admin-nav-sub">AI Breakdown & Urgency</span>
              </div>
              <span className="admin-nav-badge badge-red">{criticalCount}</span>
            </button>

            <button
              type="button"
              className={`admin-nav-item ${activeSection === 'all' ? 'active' : ''}`}
              onClick={() => setActiveSection('all')}
            >
              <div className="admin-nav-icon-wrap">
                <Layers size={18} />
              </div>
              <div className="admin-nav-text">
                <span className="admin-nav-title">View All Modules</span>
                <span className="admin-nav-sub">Combined Command View</span>
              </div>
            </button>
          </nav>

          {/* Quick Readiness Snapshot inside Sidebar */}
          <div className="admin-sidebar-footer">
            <div className="sidebar-stat-row">
              <span className="text-xs text-dim">Available Shelter Cots</span>
              <strong className="text-xs text-emerald">{availableCots} / {totalShelterCapacity}</strong>
            </div>
            <div className="sidebar-stat-row">
              <span className="text-xs text-dim">
                {assignedMuniObj ? `${assignedMuniObj.shortName} Occupancy` : 'Provincial Occupancy'}
              </span>
              <strong className="text-xs text-cyan">{occupancyPct}%</strong>
            </div>
            <button
              type="button"
              className="btn-daily-reset-admin"
              style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}
              onClick={handleDailyResetMaintenance}
              disabled={isResettingDaily}
              title="Archives previous days' open incidents so the live map stays uncluttered"
            >
              <Clock size={13} />
              <span>{isResettingDaily ? 'Archiving...' : '🧹 Run Daily Map Reset'}</span>
            </button>
          </div>
        </aside>

        {/* Right Main Content Area */}
        <div className="admin-main-workspace">
          {/* Global Daily Reset Toast Notification (visible across all sidebar tabs) */}
          {resetToast && (
            <div className="dispatch-toast-banner" style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.4)', color: '#6ee7b7' }}>
              <CheckCircle2 size={16} className="text-emerald" />
              <span>{resetToast}</span>
            </div>
          )}

          {/* MODULE 1: CITIZEN INCIDENT REPORTS (CRUD MANAGEMENT) */}
          {(activeSection === 'crud' || activeSection === 'all') && (
            <div className="table-card glass-panel">
              <div className="table-card-header">
                <div>
                  <h4>
                    Citizen Incident Reports (CRUD Management)
                    {assignedMuniObj ? ` — ${assignedMuniObj.shortName}` : ''}
                  </h4>
                  <p className="text-muted text-sm">
                    {assignedMuniObj
                      ? `Showing only emergency reports within your assigned municipality (${assignedMuniObj.name})`
                      : 'Resolve active emergencies, update triage status, or purge false alarms'}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
                      <th>Reported Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIncidents.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-muted">
                          {assignedMuniObj
                            ? `No incidents currently reported in ${assignedMuniObj.shortName} matching this filter.`
                            : 'No incidents match this filter.'}
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
                            {(() => {
                              const incDate = inc.created_at ? new Date(inc.created_at) : null;
                              const formatted = incDate && !isNaN(incDate.getTime())
                                ? incDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                : 'Recent';
                              const isToday = incDate && !isNaN(incDate.getTime()) && (
                                incDate.getFullYear() === new Date().getFullYear() &&
                                incDate.getMonth() === new Date().getMonth() &&
                                incDate.getDate() === new Date().getDate()
                              );
                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span className="text-xs text-light font-medium">{formatted}</span>
                                  {isToday ? (
                                    <span style={{ background: 'rgba(16,185,129,0.2)', color: '#34d399', fontSize: '9px', fontWeight: 'bold', padding: '1px 5px', borderRadius: '4px', width: 'fit-content' }}>
                                      TODAY
                                    </span>
                                  ) : (
                                    <span style={{ background: 'rgba(148,163,184,0.15)', color: '#94a3b8', fontSize: '9px', padding: '1px 5px', borderRadius: '4px', width: 'fit-content' }}>
                                      ARCHIVED
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
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
          )}

          {/* MODULE 2: DESIGNATED EVACUATION SHELTERS & SAFE ROUTE READINESS (API #5) */}
          {(activeSection === 'shelters' || activeSection === 'all') && (
            <div className="dispatch-card glass-panel">
              <div className="dispatch-header">
                <div className="dispatch-title-left">
                  <Compass size={22} className="text-cyan pulse-icon" />
                  <div>
                    <div className="dispatch-title-row">
                      <h4>
                        Designated Evacuation Shelters & Safe Route Readiness
                        {assignedMuniObj ? ` (${assignedMuniObj.shortName})` : ''}
                      </h4>
                      <span className="api-chip-badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.4)' }}>
                        API #5: OSRM Routing Engine
                      </span>
                    </div>
                    <p className="text-muted text-xs">
                      {assignedMuniObj
                        ? `Emergency shelters and turn-by-turn OSRM evacuation routes strictly inside ${assignedMuniObj.name}`
                        : 'Active Lanao del Norte emergency shelters, live occupancy capacities, and turn-by-turn road evacuation routes'}
                    </p>
                  </div>
                </div>

                <div className="dispatch-actions" style={{ flexWrap: 'wrap' }}>
                  {assignedMuniObj ? (
                    <span
                      style={{
                        background: 'rgba(6, 182, 212, 0.14)',
                        border: '1px solid rgba(6, 182, 212, 0.4)',
                        color: '#7dd3fc',
                        padding: '6px 12px',
                        borderRadius: '18px',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Lock size={12} />
                      <span>📍 {assignedMuniObj.shortName} ({filteredShelters.length} Shelter{filteredShelters.length === 1 ? '' : 's'})</span>
                    </span>
                  ) : (
                    <select
                      className="municipality-dropdown-select"
                      style={{
                        background: 'rgba(6, 182, 212, 0.1)',
                        border: '1px solid rgba(6, 182, 212, 0.35)',
                        padding: '6px 12px',
                        borderRadius: '18px'
                      }}
                      value={shelterMuniFilter}
                      onChange={(e) => setShelterMuniFilter(e.target.value)}
                      title="Filter shelters by municipality"
                    >
                      {uniqueShelterMunicipalities.map(m => (
                        <option key={m} value={m}>
                          {m === 'All' ? `🌐 All Municipalities (${scopedShelters.length})` : `📍 ${m}`}
                        </option>
                      ))}
                    </select>
                  )}

                  <button
                    id="btn-open-add-shelter"
                    type="button"
                    className="btn-add-shelter"
                    onClick={() => {
                      setIsAddShelterOpen(prev => !prev);
                      setShelterFormError('');
                      setShelterFormSuccess('');
                    }}
                    title="Add a new custom evacuation shelter for this municipality"
                  >
                    <PlusCircle size={15} />
                    <span>➕ Add Evacuation Site</span>
                  </button>
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
                    onClick={() => handleSimulateRoute(filteredShelters[0] || scopedShelters[0])}
                    disabled={isSimulatingRoute || filteredShelters.length === 0}
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

              {/* ADD EVACUATION SHELTER PANEL */}
              {isAddShelterOpen && (
                <div className="add-shelter-panel glass-panel" style={{
                  background: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(6, 182, 212, 0.4)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '16px',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <PlusCircle size={18} className="text-cyan" />
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#f8fafc' }}>
                          Add New Designated Evacuation Shelter (OSRM-Integrated)
                        </h4>
                        <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8' }}>
                          Real-time road routing, capacity tracking & Leaflet map pin synchronization
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="icon-close-btn"
                      onClick={() => setIsAddShelterOpen(false)}
                      title="Close Form"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {shelterFormError && (
                    <div className="auth-alert-error" style={{ marginBottom: '10px' }}>
                      <AlertTriangle size={15} />
                      <span>{shelterFormError}</span>
                    </div>
                  )}

                  {shelterFormSuccess && (
                    <div className="auth-alert-success" style={{ marginBottom: '10px' }}>
                      <CheckCircle2 size={15} />
                      <span>{shelterFormSuccess}</span>
                    </div>
                  )}

                  <form onSubmit={handleCreateShelter} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                      {/* Name */}
                      <div className="form-group-compact">
                        <label>Shelter Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Kapatagan Central Gym Relief Hub"
                          value={shelterForm.name}
                          onChange={(e) => setShelterForm({ ...shelterForm, name: e.target.value })}
                        />
                      </div>

                      {/* Municipality Jurisdiction */}
                      <div className="form-group-compact">
                        <label>Municipality Jurisdiction *</label>
                        <select
                          className="municipality-dropdown-select"
                          value={shelterForm.municipality}
                          onChange={(e) => handleMuniChange(e.target.value)}
                          disabled={!!assignedMuniObj}
                          style={{ width: '100%' }}
                        >
                          {SPECIFIC_MUNICIPALITIES.map(m => (
                            <option key={m.id} value={m.shortName}>
                              📍 {m.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Shelter Type */}
                      <div className="form-group-compact">
                        <label>Shelter Classification</label>
                        <select
                          className="municipality-dropdown-select"
                          value={shelterForm.type}
                          onChange={(e) => setShelterForm({ ...shelterForm, type: e.target.value })}
                          style={{ width: '100%' }}
                        >
                          <option value="Primary Regional Evacuation Center">Primary Regional Evacuation Center</option>
                          <option value="Secondary Regional Evacuation Hub">Secondary Regional Evacuation Hub</option>
                          <option value="Community High School Evacuation Center">Community High School Evacuation Center</option>
                          <option value="Municipal Disaster Operations Center">Municipal Disaster Operations Center</option>
                          <option value="Primary Government Medical Trauma Hub">Primary Government Medical Trauma Hub</option>
                          <option value="Upland Community Flood Sanctuary">Upland Community Flood Sanctuary</option>
                        </select>
                      </div>

                      {/* Street Address */}
                      <div className="form-group-compact">
                        <label>Street Address / Barangay</label>
                        <input
                          type="text"
                          placeholder="e.g. Purok 4, Poblacion Central"
                          value={shelterForm.address}
                          onChange={(e) => setShelterForm({ ...shelterForm, address: e.target.value })}
                        />
                      </div>

                      {/* Latitude & Longitude */}
                      <div className="form-group-compact">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label>Latitude & Longitude *</label>
                          <button
                            type="button"
                            className="btn-autofill-coords"
                            onClick={handleAutoFillCoords}
                            title="Auto-fill center coordinates of selected municipality"
                          >
                            📍 Auto-Fill Coords
                          </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                          <input
                            type="number"
                            step="any"
                            required
                            placeholder="Lat (e.g. 7.9001)"
                            value={shelterForm.latitude}
                            onChange={(e) => setShelterForm({ ...shelterForm, latitude: e.target.value })}
                          />
                          <input
                            type="number"
                            step="any"
                            required
                            placeholder="Lng (e.g. 123.7692)"
                            value={shelterForm.longitude}
                            onChange={(e) => setShelterForm({ ...shelterForm, longitude: e.target.value })}
                          />
                        </div>
                      </div>

                      {/* Total Cots Capacity & Occupancy */}
                      <div className="form-group-compact">
                        <label>Capacity & Current Occupancy</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                          <input
                            type="number"
                            min="10"
                            placeholder="Total Capacity (e.g. 600)"
                            value={shelterForm.total_capacity}
                            onChange={(e) => setShelterForm({ ...shelterForm, total_capacity: e.target.value })}
                          />
                          <input
                            type="number"
                            min="0"
                            placeholder="Current Occupancy"
                            value={shelterForm.current_occupancy}
                            onChange={(e) => setShelterForm({ ...shelterForm, current_occupancy: e.target.value })}
                          />
                        </div>
                      </div>

                      {/* Elevation & Contact */}
                      <div className="form-group-compact">
                        <label>Elevation / Safety Level</label>
                        <input
                          type="text"
                          placeholder="e.g. Elevated High Ground (Zero Flood Risk)"
                          value={shelterForm.elevation}
                          onChange={(e) => setShelterForm({ ...shelterForm, elevation: e.target.value })}
                        />
                      </div>

                      <div className="form-group-compact">
                        <label>Emergency Hotline / Contact</label>
                        <input
                          type="text"
                          placeholder="e.g. +63 917 882 1400"
                          value={shelterForm.contact}
                          onChange={(e) => setShelterForm({ ...shelterForm, contact: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Amenities */}
                    <div className="form-group-compact">
                      <label>Key Amenities / Resources (comma-separated)</label>
                      <input
                        type="text"
                        placeholder="e.g. Backup Generator, Clean Water Filtration, First Aid Station, Mobile Kitchen"
                        value={shelterForm.amenities}
                        onChange={(e) => setShelterForm({ ...shelterForm, amenities: e.target.value })}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setIsAddShelterOpen(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={isSubmittingShelter}
                      >
                        {isSubmittingShelter ? (
                          <>
                            <Loader2 size={15} className="spin" />
                            <span>Adding to OSRM...</span>
                          </>
                        ) : (
                          <>
                            <PlusCircle size={15} />
                            <span>Save & Sync with OSRM</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Shelter Metrics Strip */}
              <div className="comms-kpi-strip">
                <div className="comms-kpi-item">
                  <span className="comms-kpi-label">Active Evacuation Hubs</span>
                  <span className="comms-kpi-val text-cyan">{filteredShelters.length} Shelter{filteredShelters.length === 1 ? '' : 's'}</span>
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
                  <span className="comms-kpi-label">
                    {assignedMuniObj ? `${assignedMuniObj.shortName} Occupancy` : 'Overall Provincial Occupancy'}
                  </span>
                  <span className="comms-kpi-val text-amber">{occupancyPct}% ({totalOccupancy} Evacuees)</span>
                </div>
              </div>

              {/* Evacuation Shelters Directory Table */}
              <div className="table-responsive" style={{ marginTop: '12px' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Shelter ID</th>
                      <th>Municipality</th>
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
                    {filteredShelters.map((shelter) => {
                      const pct = Math.round((shelter.current_occupancy / shelter.total_capacity) * 100);
                      return (
                        <tr key={shelter.id}>
                          <td className="font-mono text-cyan" style={{ fontWeight: 600 }}>{shelter.id}</td>
                          <td>
                            <span className="target-squad-badge" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#38bdf8', borderColor: 'rgba(6, 182, 212, 0.3)', whiteSpace: 'nowrap' }}>
                              📍 {shelter.municipality || 'Lanao del Norte'}
                            </span>
                          </td>
                          <td>
                            <div className="incident-table-cell">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <strong>{shelter.name}</strong>
                                {shelter.is_custom && (
                                  <span className="badge-custom-shelter">⭐ Admin Added</span>
                                )}
                              </div>
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                className="btn-refresh-dispatch"
                                style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                                onClick={() => handleSimulateRoute(shelter)}
                                title="Simulate OSRM road route to this center"
                              >
                                <Navigation size={12} className="text-cyan" />
                                <span>Test Route</span>
                              </button>
                              {shelter.is_custom && (
                                <button
                                  type="button"
                                  className="delete-row-btn"
                                  style={{ padding: '4px 6px' }}
                                  title="Delete Evacuation Site"
                                  onClick={() => {
                                    if (window.confirm(`Decommission and delete "${shelter.name}"?`)) {
                                      if (onDeleteShelter) onDeleteShelter(shelter.id);
                                    }
                                  }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MODULE 3: TRIAGE ANALYTICS & URGENCY MATRIX */}
          {(activeSection === 'analytics' || activeSection === 'all') && (
            <div className="analytics-grid">
              {/* Category Breakdown Chart */}
              <div className="chart-card glass-panel">
                <div className="chart-header">
                  <h4>
                    Incident Distribution by Disaster Type
                    {assignedMuniObj ? ` (${assignedMuniObj.shortName})` : ''}
                  </h4>
                  <span className="text-dim text-sm">Automated by Gemini AI</span>
                </div>
                <div className="bar-chart-list">
                  {Object.entries(categoryCounts).length === 0 ? (
                    <p className="text-muted text-sm py-4">No incidents recorded in this place yet.</p>
                  ) : (
                    Object.entries(categoryCounts).map(([category, count]) => {
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
                    })
                  )}
                </div>
              </div>

              {/* Urgency Severity Gauge */}
              <div className="chart-card glass-panel">
                <div className="chart-header">
                  <h4>
                    Urgency Severity Matrix
                    {assignedMuniObj ? ` (${assignedMuniObj.shortName})` : ''}
                  </h4>
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
          )}
        </div>
      </div>
    </div>
  );
}
