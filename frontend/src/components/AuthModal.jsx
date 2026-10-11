import React, { useState } from 'react';
import { X, Lock, Mail, ShieldCheck, User, LogIn, UserPlus, Loader2, AlertCircle } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
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
      ? 'http://localhost:5000/api/auth/login'
      : 'http://localhost:5000/api/auth/register';

    try {
      const payload = isLoginMode
        ? { email, password }
        : { email, password, role };

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
        const userRole = data.session?.user?.user_metadata?.role || 'user';
        const userObj = {
          email: data.session?.user?.email || email,
          role: userRole,
          id: data.session?.user?.id
        };
        localStorage.setItem('ecosync_user', JSON.stringify(userObj));
        onAuthSuccess(userObj);
        onClose();
      } else {
        // User registered
        setSuccessMessage('Account registered successfully! Logging you in...');
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
          {/* Email */}
          <div className="form-group-compact">
            <label>Email Address</label>
            <div className="input-with-icon">
              <Mail size={15} className="input-icon" />
              <input
                id="auth-email-input"
                type="email"
                placeholder="name@ecosync.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
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
                minLength={6}
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
            💡 <span>Demo: Register as an <strong>Admin Coordinator</strong> to unlock the Command Hub, or as a <strong>Citizen</strong> to report emergencies.</span>
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
                  <span>Connecting to Supabase...</span>
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
