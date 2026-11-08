import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DisasterMap from './components/DisasterMap';
import AdminDashboard from './components/AdminDashboard';
import WeatherWidget from './components/WeatherWidget';
import ReportModal from './components/ReportModal';
import AuthModal from './components/AuthModal';
import {
  ShieldAlert, Lock, UserPlus, Radio, CheckCircle2, X,
  Calendar, Clock, Filter, MapPin
} from 'lucide-react';
import {
  LANAO_DEL_NORTE_MUNICIPALITIES,
  getMunicipalityById,
  doesIncidentBelongToMunicipality
} from './municipalities';
import { API_BASE_URL } from './config';
import { getAllMergedShelters, saveCustomShelter, removeCustomShelter } from './sheltersData';
import './App.css';

const CATEGORIES = ['All', 'Flood', 'Medical', 'Fire', 'Rescue', 'Food & Water', 'General'];

class DashboardErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('AdminDashboard Render Error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px 20px', maxWidth: '600px', margin: '40px auto', textAlign: 'center', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '16px', color: '#f8fafc', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          <ShieldAlert size={48} color="#ef4444" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px' }}>Admin Command Hub Recovery</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: '20px', lineHeight: 1.5 }}>
            A temporary render error was intercepted in the Admin view: <br/>
            <code style={{ background: 'rgba(0,0,0,0.4)', padding: '4px 8px', borderRadius: '4px', color: '#fca5a5' }}>
              {this.state.error?.message || 'Unknown error'}
            </code>
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
            >
              🔄 Retry Hub
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState('map'); // 'map' | 'admin'
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('ecosync_user');
      if (!saved) return null;
      const parsed = JSON.parse(saved);

      // Ensure admin_kapatagan and admin_iligan are strictly Admin Coordinators, never volunteers
      if (parsed) {
        const uname = (parsed.username || '').toLowerCase();
        if (uname === 'admin_kapatagan') {
          parsed.role = 'admin';
          parsed.municipality = 'KAPATAGAN';
          parsed.municipality_name = 'Kapatagan';
          localStorage.setItem('ecosync_user', JSON.stringify(parsed));
          return parsed;
        }
        if (uname === 'admin_iligan') {
          parsed.role = 'admin';
          parsed.municipality = 'ILIGAN';
          parsed.municipality_name = 'Iligan City';
          localStorage.setItem('ecosync_user', JSON.stringify(parsed));
          return parsed;
        }
        if (parsed.role === 'admin' && (!parsed.municipality || parsed.municipality === 'ALL')) {
          parsed.municipality = 'KAPATAGAN';
          parsed.municipality_name = 'Kapatagan';
          localStorage.setItem('ecosync_user', JSON.stringify(parsed));
          return parsed;
        }
      }
      return parsed;
    } catch {
      return null;
    }
  });

  const isAdmin = currentUser?.role === 'admin';
  const adminMunicipality = isAdmin && currentUser?.municipality && currentUser.municipality !== 'ALL'
    ? currentUser.municipality
    : null;

  const [incidents, setIncidents] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedMunicipality, setSelectedMunicipality] = useState(() => adminMunicipality || 'ALL');
  const [dateFilter, setDateFilter] = useState('today'); // 'today' | '24h' | 'custom' | 'all'
  const [selectedCustomDate, setSelectedCustomDate] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authPortal, setAuthPortal] = useState('user'); // 'user' | 'admin'
  const [clickedCoords, setClickedCoords] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeBroadcastAlert, setActiveBroadcastAlert] = useState(null);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [shelters, setShelters] = useState(() => getAllMergedShelters([]));

  const fetchShelters = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/evacuation-shelters`);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setShelters(getAllMergedShelters(data));
        }
      }
    } catch (err) {
      console.warn('Error fetching evacuation shelters:', err.message);
    }
  };

  const handleAddShelter = async (shelterData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/evacuation-shelters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shelterData)
      });
      const data = await res.json();
      const saved = data.shelter || {
        ...shelterData,
        id: `SHELTER-CUSTOM-${Date.now()}`,
        is_custom: true
      };
      saveCustomShelter(saved);
      setShelters(prev => getAllMergedShelters([saved, ...prev]));
      return { success: true, shelter: saved };
    } catch (err) {
      const fallbackShelter = {
        ...shelterData,
        id: `SHELTER-CUSTOM-${Date.now()}`,
        is_custom: true
      };
      saveCustomShelter(fallbackShelter);
      setShelters(prev => getAllMergedShelters([fallbackShelter, ...prev]));
      return { success: true, shelter: fallbackShelter };
    }
  };

  const handleDeleteShelter = async (shelterId) => {
    try {
      await fetch(`${API_BASE_URL}/api/evacuation-shelters/${shelterId}`, {
        method: 'DELETE'
      });
    } catch (err) {
      // ignore
    }
    removeCustomShelter(shelterId);
    setShelters(prev => prev.filter(s => s.id !== shelterId));
  };

  const handleOpenAuth = (portal = 'user') => {
    setAuthPortal(portal);
    setIsAuthOpen(true);
  };

  // Sync selectedMunicipality whenever an Admin logs in or logs out
  useEffect(() => {
    if (adminMunicipality) {
      setSelectedMunicipality(adminMunicipality);
    }
  }, [adminMunicipality]);

  // Purge any unassigned admin accounts from backend on startup
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/auth/purge-unassigned-admins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    }).catch(() => {});
  }, []);

  // Fetch all incidents from Node.js Express backend
  const fetchIncidents = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/incidents`);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setIncidents(data);
        }
      }
    } catch (err) {
      console.warn('Backend connection issue or starting up:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
    fetchShelters();
  }, []);

  // Update Status (PUT)
  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/incidents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchIncidents();
      }
    } catch (err) {
      alert('Failed to update incident: ' + err.message);
    }
  };

  // Delete Incident (DELETE)
  const handleDeleteIncident = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/incidents/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchIncidents();
      }
    } catch (err) {
      alert('Failed to delete incident: ' + err.message);
    }
  };

  // Map clicked: store dropped pin and landmark address
  const handleMapClick = (lat, lng, address) => {
    setClickedCoords({ lat, lng, address });
  };

  const handleOpenReport = () => {
    if (!currentUser) {
      if (window.confirm('🔒 Sign In Required:\n\nSubmitting emergency incident reports requires signing in as a Registered Citizen/Volunteer to maintain verified reporting and prevent spam dispatches.\n\nWould you like to sign in or register as a Volunteer now?')) {
        handleOpenAuth('user');
      }
      return;
    }
    setIsReportOpen(true);
  };

  const handleOpenReportWithLocation = (lat, lng, address) => {
    setClickedCoords({ lat, lng, address });
    if (!currentUser) {
      if (window.confirm('🔒 Sign In Required:\n\nSubmitting emergency incident reports requires signing in as a Registered Citizen/Volunteer to maintain verified reporting and prevent spam dispatches.\n\nWould you like to sign in or register as a Volunteer now?')) {
        handleOpenAuth('user');
      }
      return;
    }
    setIsReportOpen(true);
  };

  // Registered Volunteer on-site emergency response handler
  const handleVolunteerIncident = async (incidentId) => {
    if (!currentUser) {
      if (window.confirm('🔒 Volunteer Sign In Required:\n\nPlease sign in or register as a Citizen/Volunteer to register as an on-site responder for this emergency.\n\nWould you like to sign in now?')) {
        handleOpenAuth('user');
      }
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/incidents/${incidentId}/volunteer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser.username })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ Success: Thank you @${currentUser.username}! You are now registered as an on-site volunteer responder for this emergency.`);
        fetchIncidents();
      } else {
        alert(data.error || 'Failed to register as volunteer responder.');
      }
    } catch (err) {
      alert('Error connecting to server: ' + err.message);
    }
  };

  // Called when a citizen successfully submits an incident report
  const handleReportSuccess = (incident, dispatch) => {
    fetchIncidents();
    if (dispatch) {
      setActiveBroadcastAlert(dispatch);
      setTimeout(() => setActiveBroadcastAlert(null), 9000);
    }
  };

  // Auth Handlers
  const handleAuthSuccess = (userObj) => {
    setCurrentUser(userObj);
    if (userObj.role === 'admin') {
      if (userObj.municipality) {
        setSelectedMunicipality(userObj.municipality);
      }
      setActiveTab('admin');
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('ecosync_user');
    setCurrentUser(null);
    setSelectedMunicipality('ALL');
    setActiveTab('map');
  };

  // Helper to check if an ISO date string matches today's calendar date
  const isDateToday = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() &&
           d.getMonth() === now.getMonth() &&
           d.getDate() === now.getDate();
  };

  // Helper to check if within 24 hours
  const isWithinPast24h = (dateStr) => {
    if (!dateStr) return false;
    const diff = Date.now() - new Date(dateStr).getTime();
    return diff >= 0 && diff <= 24 * 60 * 60 * 1000;
  };

  // Helper to check custom YYYY-MM-DD
  const matchesCustomDate = (dateStr, targetYMD) => {
    if (!dateStr || !targetYMD) return false;
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}` === targetYMD;
  };

  const effectiveMunicipality = adminMunicipality || selectedMunicipality;
  const activeMunicipalityObj = getMunicipalityById(effectiveMunicipality);

  // First scope incidents to the Admin's assigned municipality if an Admin is logged in
  const jurisdictionScopedIncidents = adminMunicipality
    ? incidents.filter(inc => doesIncidentBelongToMunicipality(inc, adminMunicipality))
    : incidents;

  // Compute landmark counts for daily reset analytics (scoped to Admin jurisdiction if Admin)
  const todayCount = jurisdictionScopedIncidents.filter(i => isDateToday(i.created_at)).length;

  // Filter incidents by date window
  const dateFilteredIncidents = jurisdictionScopedIncidents.filter(inc => {
    if (dateFilter === 'all') return true;
    if (!inc.created_at) return true;

    if (dateFilter === 'today') return isDateToday(inc.created_at);
    if (dateFilter === '24h') return isWithinPast24h(inc.created_at);
    if (dateFilter === 'custom') return matchesCustomDate(inc.created_at, selectedCustomDate);
    return true;
  });

  // Filter by category or My Reports
  const categoryFilteredIncidents = selectedCategory === 'All'
    ? dateFilteredIncidents
    : selectedCategory === 'MyReports'
      ? dateFilteredIncidents.filter(inc =>
          inc.reporter_name === currentUser?.username ||
          (Array.isArray(inc.volunteers) && inc.volunteers.includes(currentUser?.username)) ||
          inc.reporter_email?.includes(currentUser?.username)
        )
      : dateFilteredIncidents.filter(inc => inc.category === selectedCategory);

  // Filter by Municipality / Jurisdiction
  const displayedIncidents = effectiveMunicipality === 'ALL'
    ? categoryFilteredIncidents
    : categoryFilteredIncidents.filter(inc => doesIncidentBelongToMunicipality(inc, effectiveMunicipality));

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="app-layout">
      {/* Top Navigation with Auth */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenReport={handleOpenReport}
        currentUser={currentUser}
        onOpenAuth={handleOpenAuth}
        onSignOut={handleSignOut}
      />

      {/* Real-time Emergency Broadcast Alert Banner (API #5) */}
      {activeBroadcastAlert && (
        <div className="global-broadcast-banner">
          <div className="global-broadcast-content">
            <Radio size={18} className="pulse-icon text-cyan" />
            <div>
              <strong>🚨 EMERGENCY BROADCAST DISPATCHED ({activeBroadcastAlert.id}):</strong>{' '}
              <span>
                Alert sent to <strong>{activeBroadcastAlert.recipients_count} volunteers</strong> ({activeBroadcastAlert.recipient_group}) via {activeBroadcastAlert.channel}!
              </span>
            </div>
          </div>
          <button
            className="global-broadcast-close"
            onClick={() => setActiveBroadcastAlert(null)}
            title="Dismiss Alert"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Main View Router */}
      {activeTab === 'map' ? (
        <main className={`main-hub-content ${isMapExpanded ? 'map-expanded' : ''}`}>
          {/* Left Side (50% default / 70% when expanded): Interactive Disaster & Evacuation Map */}
          <section className="map-section-container">
            <div className="map-top-info-bar glass-panel">
              <div className="map-top-info-left">
                <span className="map-info-status">
                  {adminMunicipality ? (
                    <>
                      🔒 <strong>Admin Map Locked: {activeMunicipalityObj.name}</strong>
                    </>
                  ) : (
                    <>
                      📍 <strong>{activeMunicipalityObj.shortName || activeMunicipalityObj.name}</strong>
                    </>
                  )}{' '}
                  • 📅 {dateFilter === 'today' ? "Today's Landmarks (Daily Reset Active)" : dateFilter === '24h' ? "Past 24 Hours" : dateFilter === 'custom' ? `Date: ${selectedCustomDate}` : "All Historical"} ({displayedIncidents.length} active)
                </span>
              </div>
              <div className="map-top-info-right">
                <span className="map-info-hint">
                  {adminMunicipality
                    ? `🛡️ Locked to ${activeMunicipalityObj.shortName} Jurisdiction`
                    : '💡 Click map or incident for OSRM safe route'}
                </span>
              </div>
            </div>

            <DisasterMap
              shelters={shelters}
              incidents={displayedIncidents}
              selectedCategory={selectedCategory}
              dateFilter={dateFilter}
              selectedMunicipality={effectiveMunicipality}
              lockedMunicipality={adminMunicipality}
              targetLocation={activeMunicipalityObj}
              onMapClick={handleMapClick}
              selectedIncident={selectedIncident}
              onSelectIncident={(inc) => setSelectedIncident(inc)}
              onOpenReportWithLocation={handleOpenReportWithLocation}
              isMapExpanded={isMapExpanded}
              onToggleExpandMap={() => setIsMapExpanded(prev => !prev)}
              currentUser={currentUser}
              onVolunteerIncident={handleVolunteerIncident}
              onAddShelter={handleAddShelter}
            />
          </section>

          {/* Right Half (50%): Filter Pills, Jurisdiction, Date Reset Pills, Weather & News */}
          <aside className="right-hub-panel">
            <div className="filter-controls-wrapper">
              {/* Jurisdiction & Category Filter Pills */}
              <div className="filter-bar glass-panel">
                <div className="municipality-select-wrap">
                  {adminMunicipality ? (
                    <Lock size={14} className="text-cyan" />
                  ) : (
                    <MapPin size={14} className="text-cyan" />
                  )}
                  <span className="filter-group-label">
                    {adminMunicipality ? 'Assigned Jurisdiction:' : 'Jurisdiction:'}
                  </span>
                  {adminMunicipality ? (
                    <select
                      id="municipality-dropdown-filter"
                      className="municipality-dropdown-select"
                      value={adminMunicipality}
                      disabled
                      title={`Your Admin account is locked exclusively to ${activeMunicipalityObj.name}`}
                      style={{ opacity: 0.95, cursor: 'not-allowed', borderColor: 'rgba(6, 182, 212, 0.5)' }}
                    >
                      <option value={activeMunicipalityObj.id}>
                        🔒 {activeMunicipalityObj.name} (Admin Locked)
                      </option>
                    </select>
                  ) : (
                    <select
                      id="municipality-dropdown-filter"
                      className="municipality-dropdown-select"
                      value={selectedMunicipality}
                      onChange={(e) => setSelectedMunicipality(e.target.value)}
                      title="Filter emergencies and navigate map across Lanao del Norte municipalities"
                    >
                      {LANAO_DEL_NORTE_MUNICIPALITIES.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="filter-divider" />

                <span className="filter-group-label">Category:</span>
                {currentUser && (
                  <button
                    className={`filter-chip ${selectedCategory === 'MyReports' ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(selectedCategory === 'MyReports' ? 'All' : 'MyReports')}
                    style={{
                      borderColor: selectedCategory === 'MyReports' ? '#10b981' : 'rgba(16, 185, 129, 0.4)',
                      background: selectedCategory === 'MyReports' ? '#10b981' : 'rgba(16, 185, 129, 0.12)',
                      color: selectedCategory === 'MyReports' ? '#07090e' : '#6ee7b7'
                    }}
                  >
                    👤 My Reports & Volunteered ({incidents.filter(inc => inc.reporter_name === currentUser.username || (Array.isArray(inc.volunteers) && inc.volunteers.includes(currentUser.username))).length})
                  </button>
                )}
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    className={`filter-chip ${selectedCategory === cat ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat === 'All' ? '🌐 All Incidents' :
                     cat === 'Flood' ? '🌊 Floods' :
                     cat === 'Medical' ? '🚑 Medical' :
                     cat === 'Fire' ? '🔥 Fires' :
                     cat === 'Rescue' ? '🛟 Rescue' :
                     cat === 'Food & Water' ? '🍞 Food/Water' : '⚠️ General'}
                  </button>
                ))}
              </div>

              {/* Date & Daily Reset Filter Pills */}
              <div className="date-filter-bar glass-panel">
                <div className="date-filter-left">
                  <span className="filter-group-label">
                    <Calendar size={14} className="text-cyan" />
                    <span>Landmark Date:</span>
                  </span>

                  <button
                    type="button"
                    className={`date-chip ${dateFilter === 'today' ? 'active' : ''}`}
                    onClick={() => setDateFilter('today')}
                    title="Daily Auto-Reset: Shows only emergencies reported today, resetting every midnight"
                  >
                    <span>📅 Today (Auto-Reset)</span>
                    <span className="count-badge">{todayCount}</span>
                  </button>

                  <button
                    type="button"
                    className={`date-chip ${dateFilter === '24h' ? 'active' : ''}`}
                    onClick={() => setDateFilter('24h')}
                    title="Show landmarks reported in the past 24 hours"
                  >
                    <span>⏱️ Past 24h</span>
                  </button>

                  <button
                    type="button"
                    className={`date-chip ${dateFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setDateFilter('all')}
                    title="Show all landmarks across all dates"
                  >
                    <span>🌐 All Time</span>
                    <span className="count-badge">{jurisdictionScopedIncidents.length}</span>
                  </button>

                  <div className="date-picker-wrap">
                    <input
                      type="date"
                      className="date-input-field"
                      value={selectedCustomDate}
                      onChange={(e) => {
                        setSelectedCustomDate(e.target.value);
                        setDateFilter('custom');
                      }}
                      title="Pick a specific date to view its landmarks"
                    />
                    {dateFilter === 'custom' && (
                      <span className="custom-date-badge">Viewing {selectedCustomDate}</span>
                    )}
                  </div>
                </div>

                <div className="date-filter-right">
                  <span className="daily-reset-clock-pill" title="Every day at 00:00 midnight, previous days' landmarks are archived to prevent clutter">
                    <Clock size={13} className="text-emerald" />
                    <span>Daily Reset: {todayFormatted}</span>
                  </span>
                </div>
              </div>
            </div>
            <WeatherWidget
              selectedMunicipality={effectiveMunicipality}
              lockedMunicipality={adminMunicipality}
              onSelectMunicipality={(muniId) => {
                if (!adminMunicipality) {
                  setSelectedMunicipality(muniId);
                }
              }}
              pinnedLocation={
                selectedIncident
                  ? {
                      lat: selectedIncident.latitude,
                      lng: selectedIncident.longitude,
                      name: selectedIncident.location_name || selectedIncident.title
                    }
                  : clickedCoords
                    ? {
                        lat: clickedCoords.lat,
                        lng: clickedCoords.lng,
                        name: clickedCoords.address
                      }
                    : null
              }
            />
          </aside>
        </main>
      ) : (
        /* Admin Command Hub (Role Protected) */
        <main>
          {isAdmin ? (
            <DashboardErrorBoundary>
              <AdminDashboard
                incidents={jurisdictionScopedIncidents}
                onUpdateStatus={handleUpdateStatus}
                onDeleteIncident={handleDeleteIncident}
                assignedMunicipality={adminMunicipality}
                currentUser={currentUser}
                shelters={shelters}
                onAddShelter={handleAddShelter}
                onDeleteShelter={handleDeleteShelter}
                onRefreshShelters={fetchShelters}
              />
            </DashboardErrorBoundary>
          ) : (
            <div className="admin-access-locked glass-panel">
              <div className="locked-card">
                <div className="locked-icon-wrap">
                  <Lock size={36} className="text-red" />
                </div>
                <h2>Admin Coordinator Access Required</h2>
                <p className="text-muted">
                  The Command Hub is restricted to emergency relief organizers and platform admins.
                  Please sign in or register with an <strong>Admin Coordinator</strong> role.
                </p>
                <button
                  className="btn-primary"
                  onClick={() => handleOpenAuth('admin')}
                  style={{ marginTop: '16px' }}
                >
                  <UserPlus size={16} />
                  <span>Sign In as Admin Coordinator</span>
                </button>
              </div>
            </div>
          )}
        </main>
      )}

      {/* Citizen Report Emergency Modal with Gemini AI */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        onSubmitSuccess={handleReportSuccess}
        clickedCoords={clickedCoords}
        currentUser={currentUser}
      />

      {/* Authentication Modal (Sign In / Register with Supabase) */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        initialPortal={authPortal}
      />
    </div>
  );
}
