import React from 'react';
import { ShieldAlert, MapPin, BarChart3, PlusCircle, User, ShieldCheck, LogIn, LogOut } from 'lucide-react';

export default function Navbar({
  activeTab,
  setActiveTab,
  onOpenReport,
  currentUser,
  onOpenAuth,
  onSignOut
}) {
  const isAdmin = currentUser?.role === 'admin';

  const handleAdminTabClick = () => {
    if (!currentUser) {
      if (window.confirm('The Admin Command Hub requires logging in as an Admin Coordinator. Would you like to sign in now?')) {
        onOpenAuth();
      }
      return;
    }
    if (!isAdmin) {
      alert('Access Restricted: Your current account has the "Citizen / Volunteer" role. Please sign in with an Admin Coordinator account.');
      return;
    }
    setActiveTab('admin');
  };

  return (
    <header className="navbar-container glass-panel">
      <div className="navbar-left">
        <div className="logo-brand">
          <div className="logo-icon-wrapper">
            <ShieldAlert size={24} className="logo-icon" />
            <span className="radar-pulse"></span>
          </div>
          <div>
            <h1 className="logo-title">EcoSync</h1>
            <span className="logo-subtitle">Disaster & Relief Coordinator</span>
          </div>
        </div>

        <div className="live-status-pill">
          <span className="status-dot"></span>
          <span>API Network: Active (Supabase + Gemini)</span>
        </div>
      </div>

      <nav className="navbar-center">
        <button
          id="nav-map-btn"
          className={`nav-link ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => setActiveTab('map')}
        >
          <MapPin size={18} />
          <span>Live Incident Map</span>
        </button>

        <button
          id="nav-admin-btn"
          className={`nav-link ${activeTab === 'admin' ? 'active' : ''}`}
          onClick={handleAdminTabClick}
        >
          <BarChart3 size={18} />
          <span>Admin Command Hub</span>
        </button>
      </nav>

      <div className="navbar-right">
        {/* Real User Auth Status or Sign In Button */}
        {currentUser ? (
          <div className="auth-user-badge">
            <div className={`user-role-indicator ${isAdmin ? 'role-admin' : 'role-user'}`}>
              {isAdmin ? <ShieldCheck size={14} /> : <User size={14} />}
              <span>{isAdmin ? 'Admin' : 'Volunteer'}</span>
            </div>
            <span className="user-email-text" title={currentUser.username || currentUser.email}>
              @{currentUser.username || currentUser.email}
            </span>
            <button
              id="btn-sign-out"
              className="btn-sign-out"
              onClick={onSignOut}
              title="Sign Out"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button
            id="btn-open-auth"
            className="btn-auth-signin"
            onClick={onOpenAuth}
          >
            <LogIn size={15} />
            <span>Sign In / Register</span>
          </button>
        )}

        <button
          id="btn-report-incident"
          className="btn-danger report-cta-btn"
          onClick={onOpenReport}
        >
          <PlusCircle size={18} />
          <span>Report Emergency</span>
        </button>
      </div>
    </header>
  );
}
