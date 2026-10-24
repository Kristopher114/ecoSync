import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DisasterMap from './components/DisasterMap';
import AdminDashboard from './components/AdminDashboard';
import WeatherWidget from './components/WeatherWidget';
import ReportModal from './components/ReportModal';
import AuthModal from './components/AuthModal';
import { ShieldAlert, Lock, UserPlus, Radio, CheckCircle2, X } from 'lucide-react';
import { API_BASE_URL } from './config';
import './App.css';

const CATEGORIES = ['All', 'Flood', 'Medical', 'Fire', 'Rescue', 'Food & Water', 'General'];

export default function App() {
  const [activeTab, setActiveTab] = useState('map'); // 'map' | 'admin'
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('ecosync_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [incidents, setIncidents] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [clickedCoords, setClickedCoords] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeBroadcastAlert, setActiveBroadcastAlert] = useState(null);

  // Fetch all incidents from Node.js Express backend
  const fetchIncidents = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/incidents`);
      if (res.ok) {
        const data = await res.json();
        setIncidents(data);
      }
    } catch (err) {
      console.warn('Backend connection issue or starting up:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
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

  const handleOpenReportWithLocation = (lat, lng, address) => {
    setClickedCoords({ lat, lng, address });
    setIsReportOpen(true);
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
      setActiveTab('admin');
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('ecosync_user');
    setCurrentUser(null);
    setActiveTab('map');
  };

  // Seed sample data if empty
  const handleSeedSamples = async () => {
    const samples = [
      {
        title: 'Flash Flood Rescue Needed',
        description: 'Rising water trapped 6 elderly residents on 2nd floor balcony. Need rubber boat and life vests.',
        category: 'Flood',
        urgency: 'Critical',
        latitude: 8.1050,
        longitude: 124.0690,
        location_name: 'Poblacion Riverside Sector',
        reporter_email: 'volunteer.mark@ecosync.org'
      },
      {
        title: 'Emergency Medical Evacuation',
        description: 'Diabetic patient collapsed due to insulin shortage in evacuation shelter.',
        category: 'Medical',
        urgency: 'High',
        latitude: 8.0980,
        longitude: 124.0620,
        location_name: 'District Community Gymnasium',
        reporter_email: 'nurse.sarah@relief.org'
      },
      {
        title: 'Electrical Spark / Fire Hazard',
        description: 'Downed power pole sparking near saturated floodwater and residential houses.',
        category: 'Fire',
        urgency: 'Critical',
        latitude: 8.1120,
        longitude: 124.0750,
        location_name: 'Corner Provincial Highway',
        reporter_email: 'citizen99@gmail.com'
      },
      {
        title: 'Clean Drinking Water Shortage',
        description: 'Community deep-well contaminated by flood runoff. 120 families requiring bottled water rations.',
        category: 'Food & Water',
        urgency: 'Medium',
        latitude: 8.0890,
        longitude: 124.0580,
        location_name: 'Barangay Hall Evacuation Center',
        reporter_email: 'coordinator@ecosync.org'
      }
    ];

    for (const item of samples) {
      await fetch(`${API_BASE_URL}/api/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
    }
    fetchIncidents();
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="app-layout">
      {/* Top Navigation with Auth */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenReport={() => setIsReportOpen(true)}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
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
        <main className="main-hub-content">
          <section className="map-section-container">
            {/* Filter Category Chips */}
            <div className="filter-bar glass-panel">
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

              {incidents.length === 0 && (
                <button
                  className="filter-chip"
                  style={{ background: 'rgba(6, 182, 212, 0.2)', color: '#38bdf8', marginLeft: 'auto' }}
                  onClick={handleSeedSamples}
                >
                  ⚡ Populate Demo Incidents
                </button>
              )}
            </div>

            {/* Interactive Leaflet Map */}
            <DisasterMap
              incidents={incidents}
              selectedCategory={selectedCategory}
              onMapClick={handleMapClick}
              selectedIncident={selectedIncident}
              onSelectIncident={(inc) => setSelectedIncident(inc)}
              onOpenReportWithLocation={handleOpenReportWithLocation}
            />
          </section>

          {/* Right Sidebar: Weather Alerts (API 1) & News (API 4) */}
          <aside>
            <WeatherWidget
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
            <AdminDashboard
              incidents={incidents}
              onUpdateStatus={handleUpdateStatus}
              onDeleteIncident={handleDeleteIncident}
            />
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
                  onClick={() => setIsAuthOpen(true)}
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
      />

      {/* Authentication Modal (Sign In / Register with Supabase) */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}
