import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('EcoLanao Global Uncaught Error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#090d16',
          color: '#f8fafc',
          padding: '24px',
          textAlign: 'center',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
        }}>
          <div style={{
            maxWidth: '520px',
            width: '100%',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '16px',
            padding: '32px 24px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
          }}>
            <div style={{ fontSize: '42px', marginBottom: '12px' }}>🛡️</div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>EcoLanao System Recovery</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.86rem', marginBottom: '18px', lineHeight: 1.5 }}>
              A client render issue was intercepted:
            </p>
            <pre style={{
              background: 'rgba(0,0,0,0.4)',
              padding: '10px 14px',
              borderRadius: '8px',
              color: '#fca5a5',
              fontSize: '0.78rem',
              overflowX: 'auto',
              marginBottom: '20px',
              textAlign: 'left'
            }}>
              {this.state.error?.message || 'Unknown render exception'}
            </pre>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem('ecosync_custom_shelters_v2');
                    localStorage.removeItem('ecosync_user');
                  } catch {}
                  window.location.reload();
                }}
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.5)',
                  color: '#fca5a5',
                  padding: '9px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.84rem'
                }}
              >
                Reset Cache & Reload
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  background: '#0284c7',
                  border: 'none',
                  color: '#fff',
                  padding: '9px 18px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.84rem'
                }}
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </StrictMode>,
);
