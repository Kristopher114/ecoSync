import React from 'react';
import { ShieldAlert, MapPin, BarChart3, PlusCircle, User, ShieldCheck, LogOut } from 'lucide-react';

export default function Navbar({
  activeTab,
  setActiveTab,
  onOpenReport,
  currentUser,
  onOpenAuth,
  onSignOut
}) {
  const isAdmin = currentUser?.role === 'admin';
  const adminMuniLabel = isAdmin && (currentUser?.municipality_name || currentUser?.municipality)
    ? (currentUser.municipality_name || currentUser.municipality)
    : null;

  const handleAdminTabClick = () => {
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
            <h1 className="logo-title">EcoLanao</h1>
            <span className="logo-subtitle">
              {adminMuniLabel ? `🔒 ${adminMuniLabel}` : 'Disaster & Relief Coordinator'}
            </span>
          </div>
        </div>
      </div>

      <nav className="navbar-center">
        <button
          id="nav-map-btn"
          className={`nav-link ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => setActiveTab('map')}
        >
          <MapPin size={18} />
          <span>{adminMuniLabel ? `${adminMuniLabel} Map` : 'Live Incident Map'}</span>
        </button>

        <button
          id="nav-admin-btn"
          className={`nav-link ${activeTab === 'admin' ? 'active' : ''}`}
          onClick={handleAdminTabClick}
        >
          <BarChart3 size={18} />
          <span>{adminMuniLabel ? `${adminMuniLabel} Command Hub` : 'Admin Command Hub'}</span>
        </button>
      </nav>

      <div className="navbar-right">
        {/* Real User Auth Status or Sign In Button */}
        {currentUser ? (
          <div className="auth-user-badge">
            <div className={`user-role-indicator ${isAdmin ? 'role-admin' : 'role-user'}`}>
              {isAdmin ? <ShieldCheck size={14} /> : <User size={14} />}
              <span>{isAdmin ? (adminMuniLabel ? `Admin • ${adminMuniLabel}` : 'Admin') : 'Volunteer'}</span>
            </div>
            <span className="user-email-text" title={currentUser.username}>
              @{currentUser.username}
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
          <div className="auth-nav-capsule">
            <button
              id="btn-open-volunteer-auth"
              type="button"
              className="auth-capsule-item volunteer"
              onClick={() => onOpenAuth('user')}
              title="Citizen & Volunteer Sign In / Registration"
            >
              <User size={14} />
              <span>Volunteer Log In</span>
            </button>
            <button
              id="btn-open-admin-auth"
              type="button"
              className="auth-capsule-item admin"
              onClick={() => onOpenAuth('admin')}
              title="Municipal Admin Coordinator Portal"
            >
              <ShieldCheck size={14} />
              <span>Admin Portal</span>
            </button>
          </div>
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
