// Central API Base URL Configuration
// In local development: defaults to http://localhost:5000
// In cloud / production (Vercel): uses VITE_API_URL or relative same-origin
export const API_BASE_URL = import.meta.env.VITE_API_URL || (
  typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? window.location.origin
    : 'http://localhost:5000'
);
