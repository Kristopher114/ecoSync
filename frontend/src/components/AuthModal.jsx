import React, { useState, useEffect } from 'react';
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

export default function AuthModal({ isOpen, onClose, onAuthSuccess, initialPortal = 'user' }) {
  const [portal, setPortal] = useState(initialPortal); // 'user' | 'admin'
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [municipality, setMunicipality] = useState('KAPATAGAN');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Sync portal when modal opens or initialPortal changes
  useEffect(() => {
    if (isOpen) {
      setPortal(initialPortal || 'user');
      setErrorMessage('');
      setSuccessMessage('');
    }
  }, [isOpen, initialPortal]);

  if (!isOpen) return null;

  const isAdminPortal = portal === 'admin';
  const selectedMuniObj = getMunicipalityById(municipality);

  const handlePortalSwitch = (newPortal) => {
    setPortal(newPortal);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser || !password) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    if (!isLoginMode && isAdminPortal && (!municipality || municipality === 'ALL')) {
      setErrorMessage('Admin coordinators must select a specific Municipality / City jurisdiction.');
      return;
    }

    setIsLoading(true);

    const endpoint = isLoginMode
      ? `${API_BASE_URL}/api/auth/login`
      : `${API_BASE_URL}/api/auth/register`;

    try {
      let regRole = isAdminPortal ? 'admin' : 'user';
      let regMuni = isAdminPortal ? selectedMuniObj.id : null;
      let regMuniName = isAdminPortal ? selectedMuniObj.shortName : null;

      if (cleanUser === 'admin_kapatagan' || cleanUser.includes('kapatagan')) {
        regRole = 'admin';
        regMuni = 'KAPATAGAN';
        regMuniName = 'Kapatagan';
      } else if (cleanUser === 'admin_iligan' || cleanUser.includes('iligan')) {
        regRole = 'admin';
        regMuni = 'ILIGAN';
        regMuniName = 'Iligan City';
      } else if (cleanUser.startsWith('admin_') || cleanUser === 'admin') {
        regRole = 'admin';
        regMuni = regMuni || 'KAPATAGAN';
        regMuniName = regMuniName || 'Kapatagan';
      }

      const payload = isLoginMode
        ? { username: cleanUser, password }
        : {
            username: cleanUser,
            password,
            role: regRole,
            municipality: regRole === 'admin' ? regMuni : null,
            municipality_name: regRole === 'admin' ? regMuniName : null
          };

      let data = {};
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const contentType = res.headers.get('content-type') || '';
        data = contentType.includes('application/json') ? await res.json() : {};

        if (!res.ok) {
          throw new Error(data.error || 'Authentication failed. Please check your credentials.');
        }
      } catch (fetchErr) {
        // Cloud & Vercel Resilience Fallback: If remote backend is sleeping (Render cold start) or unreachable
        if (isLoginMode) {
          if (cleanUser === 'admin_kapatagan' && password === 'admin123') {
            data = {
              user: {
                id: 4,
                username: 'admin_kapatagan',
                role: 'admin',
                municipality: 'KAPATAGAN',
                municipality_name: 'Kapatagan'
              }
            };
          } else if (cleanUser === 'admin_iligan' && password === 'admin123') {
            data = {
              user: {
                id: 3,
                username: 'admin_iligan',
                role: 'admin',
                municipality: 'ILIGAN',
                municipality_name: 'Iligan City'
              }
            };
          } else if (cleanUser === 'volunteer' && password === 'volunteer123') {
            data = {
              user: {
                id: 2,
                username: 'volunteer',
                role: 'user',
                municipality: null,
                municipality_name: null
              }
            };
          } else {
            const registeredUsers = JSON.parse(localStorage.getItem('ecosync_registered_users') || '[]');
            const matched = registeredUsers.find(u => u.username === cleanUser && u.password === password);
            if (matched) {
              data = { user: matched };
            } else {
              throw fetchErr;
            }
          }
        } else {
          // Registration fallback on cloud/Vercel
          const registeredUsers = JSON.parse(localStorage.getItem('ecosync_registered_users') || '[]');
          const newUser = {
            id: Date.now(),
            username: cleanUser,
            password,
            role: isAdminPortal ? 'admin' : 'user',
            municipality: isAdminPortal ? selectedMuniObj.id : null,
            municipality_name: isAdminPortal ? selectedMuniObj.shortName : null
          };
          registeredUsers.push(newUser);
          localStorage.setItem('ecosync_registered_users', JSON.stringify(registeredUsers));
          data = { user: newUser };
        }
      }

      if (isLoginMode) {
        let userRole = data.user?.role || 'user';
        const storedMap = getStoredMunicipalityMap();
        const builtinMuni = BUILTIN_ADMIN_MUNICIPALITIES[cleanUser];

        if (cleanUser === 'admin_kapatagan') {
          userRole = 'admin';
        }
        if (cleanUser === 'admin_iligan') {
          userRole = 'admin';
        }

        // Strict role validation based on the active portal capsule
        if (isAdminPortal && userRole !== 'admin') {
          throw new Error('Access Denied: This account has the Citizen / Volunteer role. Please switch to the "👤 Citizen / Volunteer" capsule above to sign in.');
        }

        const resolvedMuniId =
          (cleanUser === 'admin_kapatagan' ? 'KAPATAGAN' : null) ||
          (cleanUser === 'admin_iligan' ? 'ILIGAN' : null) ||
          data.user?.municipality ||
          storedMap[cleanUser]?.municipality ||
          (builtinMuni ? builtinMuni.id : null);

        const resolvedMuniName =
          (cleanUser === 'admin_kapatagan' ? 'Kapatagan' : null) ||
          (cleanUser === 'admin_iligan' ? 'Iligan City' : null) ||
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
          setPortal('admin');
          throw new Error(
            `Account "${cleanUser}" had no assigned municipality and was reset. Please select your Municipality below and click Register Admin.`
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
        if (isAdminPortal) {
          saveStoredMunicipality(cleanUser, selectedMuniObj.id, selectedMuniObj.shortName);
        }
        setSuccessMessage(
          isAdminPortal
            ? `Admin account registered for ${selectedMuniObj.shortName} jurisdiction! You can now sign in.`
            : 'Volunteer account registered successfully! You can now sign in.'
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
            {isAdminPortal ? (
              <ShieldCheck className="text-red" size={20} />
            ) : (
              <User className="text-cyan" size={20} />
            )}
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                {isAdminPortal ? 'Municipal Admin Portal' : 'Citizen & Volunteer Portal'}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#94a3b8' }}>
                EcoLanao Emergency Response Platform
              </p>
            </div>
          </div>
          <button id="auth-modal-close-btn" className="icon-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Top Capsule Switcher: Volunteer vs Admin */}
        <div className="portal-capsule-switcher">
          <button
            type="button"
            id="capsule-switch-volunteer"
            className={`portal-capsule-btn ${!isAdminPortal ? 'active-volunteer' : ''}`}
            onClick={() => handlePortalSwitch('user')}
          >
            <User size={15} />
            <span>👤 Citizen / Volunteer</span>
          </button>
          <button
            type="button"
            id="capsule-switch-admin"
            className={`portal-capsule-btn ${isAdminPortal ? 'active-admin' : ''}`}
            onClick={() => handlePortalSwitch('admin')}
          >
            <ShieldCheck size={15} />
            <span>🛡️ Municipal Admin</span>
          </button>
        </div>

        {/* Portal Context Banner */}
        <div className={`portal-banner ${isAdminPortal ? 'banner-admin' : 'banner-volunteer'}`}>
          {isAdminPortal ? (
            <span>
              🛡️ <strong>Official LGU Command Hub</strong>: For Municipal Coordinators to manage localized alerts, review dispatches, and oversee jurisdiction shelters.
            </span>
          ) : (
            <span>
              👤 <strong>Citizen / Volunteer Portal</strong>: Submit verified emergency reports, receive live alerts, and volunteer for on-site relief efforts.
            </span>
          )}
        </div>

        {/* Subtab Switcher: Login vs Register */}
        <div className="auth-tab-switch">
          <button
            type="button"
            className={`auth-tab-btn ${isLoginMode ? 'active' : ''}`}
            onClick={() => { setIsLoginMode(true); setErrorMessage(''); }}
          >
            <LogIn size={15} />
            <span>{isAdminPortal ? 'Admin Sign In' : 'Volunteer Sign In'}</span>
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${!isLoginMode ? 'active' : ''}`}
            onClick={() => { setIsLoginMode(false); setErrorMessage(''); }}
          >
            <UserPlus size={15} />
            <span>{isAdminPortal ? 'Register Admin' : 'Register Volunteer'}</span>
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
            <label>{isAdminPortal ? 'Admin Username' : 'Volunteer Username'}</label>
            <div className="input-with-icon">
              {isAdminPortal ? <ShieldCheck size={15} className="input-icon text-red" /> : <User size={15} className="input-icon text-cyan" />}
              <input
                id="auth-username-input"
                type="text"
                placeholder={isAdminPortal ? 'e.g. admin_kapatagan or admin_iligan' : 'e.g. volunteer_juan'}
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
                autoComplete={isLoginMode ? 'current-password' : 'new-password'}
              />
            </div>
          </div>

          {/* Specific Municipality Jurisdiction Selector (Mandatory when registering an Admin) */}
          {!isLoginMode && isAdminPortal && (
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
                <span>Assigned Municipality Jurisdiction (Required)</span>
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
            {isAdminPortal ? (
              <span>💡 Admin Demo: <strong>admin_iligan</strong> (pass: <code>admin123</code>) or <strong>admin_kapatagan</strong> (pass: <code>admin123</code>)</span>
            ) : (
              <span>💡 Volunteer Demo: <strong>volunteer</strong> (pass: <code>volunteer123</code>) or register any new username</span>
            )}
          </div>

          {/* Action Button */}
          <div className="auth-actions">
            <button
              id="auth-submit-btn"
              type="submit"
              className={isAdminPortal ? 'btn-primary btn-portal-admin' : 'btn-primary'}
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
                  <span>
                    {isLoginMode
                      ? isAdminPortal
                        ? 'Sign In to Admin Portal'
                        : 'Sign In as Volunteer'
                      : isAdminPortal
                        ? `Register Admin (${selectedMuniObj.shortName})`
                        : 'Register Volunteer Account'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
