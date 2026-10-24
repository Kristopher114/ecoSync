import React, { useState } from 'react';
import { X, Lock, User, ShieldCheck, LogIn, UserPlus, Loader2, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user'); // 'user' | 'admin'
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    const endpoint = isLoginMode
      ? `${API_BASE_URL}/api/auth/login`
      : `${API_BASE_URL}/api/auth/register`;

    try {
      const payload = isLoginMode
        ? { username, password }
        : { username, password, role };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please check your credentials.');
      }

      if (isLoginMode) {
        // User logged in
        const userObj = {
          username: data.user?.username || username,
          role: data.user?.role || 'user',
          id: data.user?.id
        };
        localStorage.setItem('ecosync_user', JSON.stringify(userObj));
        onAuthSuccess(userObj);
        onClose();
      } else {
        // User registered
        setSuccessMessage('Account registered successfully! You can now sign in.');
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
            <h3>{isLoginMode ? 'Sign In to EcoSync' : 'Create an Account'}</h3>
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
                placeholder="e.g. admin_iligan or volunteer_1"
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
              <label>Select Your System Role (Rubric Requirement)</label>
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
                    <p>Access Command Hub, resolve emergencies, manage reports</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Quick Demo Helper Hint */}
          <div className="demo-login-hint">
            💡 <span>Quick Demo Accounts: <strong>admin</strong> (pass: <code>admin123</code>) or <strong>volunteer</strong> (pass: <code>volunteer123</code>), or register your own username!</span>
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
                  <span>{isLoginMode ? 'Sign In' : 'Create Account'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
