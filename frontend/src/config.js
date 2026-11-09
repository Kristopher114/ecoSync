// Central API Base URL Configuration
// In local development: defaults to http://localhost:5000
// In cloud / production (Vercel): uses VITE_API_URL or relative same-origin
export const API_BASE_URL = import.meta.env.VITE_API_URL || (
  typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? window.location.origin
    : 'http://localhost:5000'
);

// Direct Cloud Supabase Integration (Zero backend needed for Vercel global sync)
export const SUPABASE_URL = 'https://wpoajxlftegyibcybtzr.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_kw1czTkC_ugnCdE5vtk4lg_5yNoVuGZ';
