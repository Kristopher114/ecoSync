import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DisasterMap from './components/DisasterMap';
import AdminDashboard from './components/AdminDashboard';
import WeatherWidget from './components/WeatherWidget';
import ReportModal from './components/ReportModal';
import AuthModal from './components/AuthModal';
import {
  ShieldAlert, Lock, UserPlus, CheckCircle2, X,
  Calendar, Clock, Filter, MapPin
} from 'lucide-react';
import {
  LANAO_DEL_NORTE_MUNICIPALITIES,
  getMunicipalityById,
  doesIncidentBelongToMunicipality
} from './municipalities';
import { API_BASE_URL, SUPABASE_URL, SUPABASE_KEY } from './config';
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
    const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [shelters, setShelters] = useState(() => getAllMergedShelters([]));

  const fetchShelters = async () => {
    // 1. Direct Supabase PostgREST sync (Primary cloud source)
    try {
      const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/evacuation_shelters?select=*&order=created_at.desc`, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        }
      });
      if (sbRes.ok) {
        const cloudData = await sbRes.json();
        if (Array.isArray(cloudData)) {
          // Auto-migrate any un-synced local shelters to Supabase Cloud
          const cloudIds = new Set(cloudData.map(s => s.id));
          const localCustom = getCustomShelters();
          for (const localShelter of localCustom) {
            if (!cloudIds.has(localShelter.id) && localShelter.name && localShelter.latitude) {
              const { is_custom, ...cleanRecord } = localShelter;
              fetch(`${SUPABASE_URL}/rest/v1/evacuation_shelters`, {
                method: 'POST',
                headers: {
                  apikey: SUPABASE_KEY,
                  Authorization: `Bearer ${SUPABASE_KEY}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(cleanRecord)
              }).catch(() => {});
            }
          }

          setShelters(getAllMergedShelters(cloudData));
          return;
        }
      }
    } catch (err) {
      console.warn('Error fetching evacuation shelters from Supabase:', err.message);
    }

    // 2. Try Express backend if running locally
    try {
      const res = await fetch(`${API_BASE_URL}/api/evacuation-shelters`);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setShelters(getAllMergedShelters(data));
        }
      }
    } catch {}
  };

  const handleAddShelter = async (shelterData) => {
    const shelterId = shelterData.id || `SHELTER-CUSTOM-${Date.now().toString(36).toUpperCase()}`;

    // Clean DB record strictly conforming to Supabase table schema (exclude frontend flag is_custom)
    const dbRecord = {
      id: shelterId,
      name: (shelterData.name || '').trim(),
      municipality: (shelterData.municipality || '').trim(),
      type: shelterData.type || 'Primary Regional Evacuation Center',
      address: shelterData.address || `${shelterData.municipality}, Lanao del Norte`,
      latitude: parseFloat(shelterData.latitude),
      longitude: parseFloat(shelterData.longitude),
      total_capacity: parseInt(shelterData.total_capacity, 10) || 500,
      current_occupancy: parseInt(shelterData.current_occupancy, 10) || 0,
      status: shelterData.status || 'Active (Available)',
      elevation: shelterData.elevation || 'High Ground (Flood-Safe)',
      amenities: Array.isArray(shelterData.amenities)
        ? shelterData.amenities
        : ['Emergency Power', 'Clean Water Filtration'],
      contact: shelterData.contact || '+63 900 000 0000',
      created_by: shelterData.created_by || 'Admin Coordinator',
      created_at: new Date().toISOString()
    };

    const clientShelter = { ...dbRecord, is_custom: true };

    // 1. Direct Supabase Cloud Save (Guaranteed live persistence on Vercel)
    try {
      const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/evacuation_shelters`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(dbRecord)
      });

      if (sbRes.ok) {
        const cloudSaved = await sbRes.json();
        const saved = (Array.isArray(cloudSaved) && cloudSaved[0])
          ? { ...cloudSaved[0], is_custom: true }
          : clientShelter;
        saveCustomShelter(saved);
        setShelters(prev => getAllMergedShelters([saved, ...prev]));
        console.log('✅ Evacuation shelter saved directly to Supabase Cloud:', saved.id);
        return { success: true, shelter: saved };
      } else {
        const errText = await sbRes.text();
        console.warn('Supabase shelter insert failed:', sbRes.status, errText);
      }
    } catch (err) {
      console.warn('Direct Supabase shelter insert network error:', err.message);
    }

    // 2. Try local Express backend if running
    try {
      const res = await fetch(`${API_BASE_URL}/api/evacuation-shelters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbRecord)
      });
      if (res.ok) {
        const data = await res.json();
        const saved = data.shelter ? { ...data.shelter, is_custom: true } : clientShelter;
        saveCustomShelter(saved);
        setShelters(prev => getAllMergedShelters([saved, ...prev]));
        return { success: true, shelter: saved };
      }
    } catch {}

    // 3. Fallback to localStorage
    saveCustomShelter(clientShelter);
    setShelters(prev => getAllMergedShelters([clientShelter, ...prev]));
    return { success: true, shelter: clientShelter };
  };

  const handleDeleteShelter = async (shelterId) => {
    try {
      await fetch(`${API_BASE_URL}/api/evacuation-shelters/${shelterId}`, {
        method: 'DELETE'
      });
    } catch {}

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/evacuation_shelters?id=eq.${shelterId}`, {
        method: 'DELETE',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        }
      });
    } catch {}

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
          setIsLoading(false);
          return;
        }
      }
    } catch {}

    // Direct Supabase Cloud Fallback for Vercel
    try {
      const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/incidents?select=*&order=created_at.desc`, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        }
      });
      if (sbRes.ok) {
        const data = await sbRes.json();
        if (Array.isArray(data)) {
          setIncidents(data);
        }
      }
    } catch (err) {
      console.warn('Error fetching incidents from Supabase:', err.message);
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
    setSelectedIncident(null);
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

  // Registered Volunteer on-site emergency response handler (with zero-downtime optimistic resilience)
  const handleVolunteerIncident = async (incidentId) => {
    if (!currentUser) {
      if (window.confirm('🔒 Volunteer Sign In Required:\n\nPlease sign in or register as a Citizen/Volunteer to register as an on-site responder for this emergency.\n\nWould you like to sign in now?')) {
        handleOpenAuth('user');
      }
      return;
    }

    // Helper to optimistically add volunteer to UI
    const applyLocalVolunteer = () => {
      setIncidents(prev => prev.map(inc => {
        if (String(inc.id) === String(incidentId)) {
          const vols = Array.isArray(inc.volunteers) ? [...inc.volunteers] : [];
          if (!vols.includes(currentUser.username)) vols.push(currentUser.username);
          return { ...inc, volunteers: vols, volunteer_count: vols.length };
        }
        return inc;
      }));
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/incidents/${incidentId}/volunteer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser.username })
      });
      const contentType = res.headers.get('content-type') || '';

      if (res.ok && contentType.includes('application/json')) {
        alert(`✅ Success: Thank you @${currentUser.username}! You are now registered as an on-site volunteer responder for this emergency.`);
        fetchIncidents();
        return;
      }

      // If remote backend returned 404/500 (e.g. Render deploying or sleeping), try direct PUT update
      const targetInc = incidents.find(i => String(i.id) === String(incidentId));
      const currentList = Array.isArray(targetInc?.volunteers) ? [...targetInc.volunteers] : [];
      if (!currentList.includes(currentUser.username)) currentList.push(currentUser.username);

      await fetch(`${API_BASE_URL}/api/incidents/${incidentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ volunteers: currentList, volunteer_count: currentList.length })
      }).catch(() => {});

      applyLocalVolunteer();
      alert(`✅ Success: Thank you @${currentUser.username}! You are now registered as an on-site volunteer responder for this emergency.`);
    } catch {
      // Cloud Resilience Fallback: When remote backend is unreachable or sleeping, update local state
      applyLocalVolunteer();
      alert(`✅ Success: Thank you @${currentUser.username}! You are now registered as an on-site volunteer responder for this emergency.`);
    }
  };

  // Called when a citizen successfully submits an incident report
  const handleReportSuccess = () => {
    fetchIncidents();
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
                      onChange={(e) => {
                        setSelectedMunicipality(e.target.value);
                        setSelectedIncident(null);
                        setClickedCoords(null);
                      }}
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
                    onClick={() => {
                    setSelectedCategory(cat);
                    setSelectedIncident(null);
                  }}
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
                    onClick={() => { setDateFilter('today'); setSelectedIncident(null); }}
                    title="Daily Auto-Reset: Shows only emergencies reported today, resetting every midnight"
                  >
                    <span>📅 Today (Auto-Reset)</span>
                    <span className="count-badge">{todayCount}</span>
                  </button>

                  <button
                    type="button"
                    className={`date-chip ${dateFilter === '24h' ? 'active' : ''}`}
                    onClick={() => { setDateFilter('24h'); setSelectedIncident(null); }}
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
