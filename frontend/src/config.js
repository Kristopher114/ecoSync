// Central API Base URL Configuration
// In local development: defaults to http://localhost:5000
// In cloud / production (Vercel, Netlify): automatically defaults to the live Render backend
const isLocal = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
);

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (isLocal ? 'http://localhost:5000' : 'https://ecosync-gus6.onrender.com');
