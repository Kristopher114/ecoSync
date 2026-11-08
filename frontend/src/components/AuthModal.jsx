import React, { useState } from 'react';
import { X, Lock, User, ShieldCheck, LogIn, UserPlus, Loader2, AlertCircle, MapPin } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { SPECIFIC_MUNICIPALITIES, getMunicipalityById } from '../municipalities';

const BUILTIN_ADMIN_MUNICIPALITIES = {
  admin_iligan: { id: 'ILIGAN', name: 'Iligan City' },
  admin_kapatagan: { id: 'KAPATAGAN', name: 'Kapatagan' }
};

function getStoredMunicipalityMap() {
  try {
    const raw = localStorage.getItem('ecosync_admin_municipalities');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredMunicipality(username, muniId, muniName) {
  try {
    const map = getStoredMunicipalityMap();
    map[username.trim().toLowerCase()] = {
      municipality: muniId,
      municipality_name: muniName
    };
    localStorage.setItem('ecosync_admin_municipalities', JSON.stringify(map));
  } catch {
    // ignore storage errors
  }
}

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user'); // 'user' | 'admin'
  const [municipality, setMunicipality] = useState('KAPATAGAN');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const selectedMuniObj = getMunicipalityById(municipality);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser || !password) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    if (!isLoginMode && role === 'admin' && (!municipality || municipality === 'ALL')) {
      setErrorMessage('Admin coordinators must select a specific Municipality / City jurisdiction.');
      return;
    }

    setIsLoading(true);

    const endpoint = isLoginMode
      ? `${API_BASE_URL}/api/auth/login`
      : `${API_BASE_URL}/api/auth/register`;

    try {
      const payload = isLoginMode
        ? { username: cleanUser, password }
        : {
            username: cleanUser,
            password,
            role,
            municipality: role === 'admin' ? selectedMuniObj.id : null,
            municipality_name: role === 'admin' ? selectedMuniObj.shortName : null
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await res.json() : {};

      if (!res.ok) {
        // If user is re-registering an old admin username that previously had no municipality on the cloud server
        const storedMap = getStoredMunicipalityMap();
        if (
          !isLoginMode &&
          role === 'admin' &&
          data.error &&
          data.error.toLowerCase().includes('already taken') &&
          !storedMap[cleanUser] &&
          !BUILTIN_ADMIN_MUNICIPALITIES[cleanUser]
        ) {
          saveStoredMunicipality(cleanUser, selectedMuniObj.id, selectedMuniObj.shortName);
          setSuccessMessage(
            `Admin account "${cleanUser}" assigned to ${selectedMuniObj.shortName} jurisdiction! You can now sign in.`
          );
          setTimeout(() => {
            setIsLoginMode(true);
            setSuccessMessage('');
          }, 1400);
          return;
        }
        throw new Error(data.error || 'Authentication failed. Please check your credentials.');
      }

      if (isLoginMode) {
        const userRole = data.user?.role || 'user';
        const storedMap = getStoredMunicipalityMap();
        const builtinMuni = BUILTIN_ADMIN_MUNICIPALITIES[cleanUser];

        const resolvedMuniId =
          data.user?.municipality ||
          storedMap[cleanUser]?.municipality ||
          (builtinMuni ? builtinMuni.id : null);

        const resolvedMuniName =
          data.user?.municipality_name ||
          storedMap[cleanUser]?.municipality_name ||
          (builtinMuni ? builtinMuni.name : null) ||
          (resolvedMuniId ? getMunicipalityById(resolvedMuniId)?.shortName : null);

        // Enforce that any Admin account without a specific municipality is purged and cannot log in
        if (userRole === 'admin' && (!resolvedMuniId || resolvedMuniId === 'ALL')) {
          try {
            await fetch(`${API_BASE_URL}/api/auth/purge-unassigned-admins`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: cleanUser })
            });
          } catch {
            // ignore network error
          }
          setIsLoginMode(false);
          setRole('admin');
          throw new Error(
            `Account "${cleanUser}" had no assigned municipality and was removed. Please select your Municipality below and click Create Account.`
          );
        }

        const userObj = {
          username: data.user?.username || cleanUser,
          role: userRole,
          id: data.user?.id,
          municipality: userRole === 'admin' ? resolvedMuniId : null,
          municipality_name: userRole === 'admin' ? resolvedMuniName : null
        };
        localStorage.setItem('ecosync_user', JSON.stringify(userObj));
        onAuthSuccess(userObj);
        onClose();
      } else {
        // User registered
        if (role === 'admin') {
          saveStoredMunicipality(cleanUser, selectedMuniObj.id, selectedMuniObj.shortName);
        }
        setSuccessMessage(
          role === 'admin'
            ? `Admin account registered for ${selectedMuniObj.shortName} jurisdiction! Signing you in...`
            : 'Account registered successfully! You can now sign in.'
        );
        setTimeout(() => {
          setIsLoginMode(true);
          setSuccessMessage('');
        }, 1200);
      }
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card-auth glass-panel">
        {/* Header */}
        <div className="modal-header-compact">
          <div className="modal-title-wrapper">
            <Lock className="text-cyan" size={18} />
            <h3>{isLoginMode ? 'Sign In to EcoLanao' : 'Create an Account'}</h3>
          </div>
          <button id="auth-modal-close-btn" className="icon-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher: Login vs Register */}
        <div className="auth-tab-switch">
          <button
            type="button"
            className={`auth-tab-btn ${isLoginMode ? 'active' : ''}`}
            onClick={() => { setIsLoginMode(true); setErrorMessage(''); }}
          >
            <LogIn size={15} />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${!isLoginMode ? 'active' : ''}`}
            onClick={() => { setIsLoginMode(false); setErrorMessage(''); }}
          >
            <UserPlus size={15} />
            <span>Register (User / Admin)</span>
          </button>
        </div>

        {/* Error / Success Notifications */}
        {errorMessage && (
          <div className="auth-alert-error">
            <AlertCircle size={15} />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="auth-alert-success">
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Username */}
          <div className="form-group-compact">
            <label>Username</label>
            <div className="input-with-icon">
              <User size={15} className="input-icon" />
              <input
                id="auth-username-input"
                type="text"
                placeholder="e.g. admin_kapatagan or volunteer_1"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group-compact">
            <label>Password</label>
            <div className="input-with-icon">
              <Lock size={15} className="input-icon" />
              <input
                id="auth-password-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={4}
                autoComplete={isLoginMode ? "current-password" : "new-password"}
              />
            </div>
          </div>

          {/* Role Selection on Register */}
          {!isLoginMode && (
            <div className="form-group-compact">
              <label>Select Your System Role</label>
              <div className="role-radio-group">
                <label className={`role-radio-card ${role === 'user' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="role"
                    value="user"
                    checked={role === 'user'}
                    onChange={() => setRole('user')}
                  />
                  <User size={16} className="text-cyan" />
                  <div>
                    <strong>Citizen / Volunteer</strong>
                    <p>Report incidents and browse public relief map</p>
                  </div>
                </label>

                <label className={`role-radio-card ${role === 'admin' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="role"
                    value="admin"
                    checked={role === 'admin'}
                    onChange={() => setRole('admin')}
                  />
                  <ShieldCheck size={16} className="text-red" />
                  <div>
                    <strong>Admin Coordinator</strong>
                    <p>Manage assigned Municipality Command Hub & locked map</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Specific Municipality Jurisdiction Selector (Mandatory when registering an Admin) */}
          {!isLoginMode && role === 'admin' && (
            <div
              className="form-group-compact"
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: '10px',
                padding: '10px 12px'
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fca5a5', fontWeight: 700, marginBottom: '6px' }}>
                <MapPin size={14} className="text-red" />
                <span>Assigned Municipality / City Jurisdiction (Required)</span>
              </label>
              <select
                id="auth-admin-municipality-select"
                className="municipality-dropdown-select"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid rgba(239, 68, 68, 0.45)',
                  color: '#f8fafc',
                  fontSize: '0.84rem',
                  fontWeight: 600
                }}
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
                required
              >
                {SPECIFIC_MUNICIPALITIES.map(m => (
                  <option key={m.id} value={m.id}>
                    📍 {m.name}
                  </option>
                ))}
              </select>
              <span style={{ display: 'block', marginTop: '6px', fontSize: '0.72rem', color: '#cbd5e1', lineHeight: 1.35 }}>
                🔒 Your Admin Command Hub and Live Map will stick exclusively to <strong>{selectedMuniObj.shortName}</strong>.
              </span>
            </div>
          )}

          {/* Quick Demo Helper Hint */}
          <div className="demo-login-hint">
            💡 <span>Demo Accounts: <strong>admin_iligan</strong> (Iligan • pass: <code>admin123</code>), <strong>admin_kapatagan</strong> (Kapatagan • pass: <code>admin123</code>), or <strong>volunteer</strong> (pass: <code>volunteer123</code>).</span>
          </div>

          {/* Action Button */}
          <div className="auth-actions">
            <button
              id="auth-submit-btn"
              type="submit"
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  {isLoginMode ? <LogIn size={16} /> : <UserPlus size={16} />}
                  <span>{isLoginMode ? 'Sign In' : role === 'admin' ? `Register Admin (${selectedMuniObj.shortName})` : 'Create Account'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
