-- Run this in the Supabase SQL Editor (found on the left sidebar: SQL Editor -> New Query)

CREATE TABLE IF NOT EXISTS public.incidents (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'General',     -- e.g. Medical, Flood, Food needed, Rescue, etc.
    urgency TEXT DEFAULT 'Medium',        -- e.g. Low, Medium, High, Critical
    status TEXT DEFAULT 'Open',           -- e.g. Open, In Progress, Resolved
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    location_name TEXT,
    reporter_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable public read/write for now so our backend service can freely perform CRUD
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access"
ON public.incidents FOR SELECT
USING (true);

CREATE POLICY "Allow public insert access"
ON public.incidents FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update access"
ON public.incidents FOR UPDATE
USING (true);

CREATE POLICY "Allow public delete access"
ON public.incidents FOR DELETE
USING (true);

-- Users Table for Username-Based Authentication
CREATE TABLE IF NOT EXISTS public.app_users (
    id BIGSERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    municipality TEXT,
    municipality_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public all access on app_users"
ON public.app_users FOR ALL
USING (true)
WITH CHECK (true);

-- Seed Default Accounts (SHA-256 hashed passwords)
-- Password for volunteer is "volunteer123"
-- Password for admins is "admin123"
INSERT INTO public.app_users (username, password, role, municipality, municipality_name)
VALUES
    ('volunteer', '69c5e317e0ef6b9d6fa33c3aa74b295fd250ec4b8686ea95d3ab885c39ee7eef', 'user', NULL, NULL),
    ('admin_iligan', '0192023a7bbd73250516f069df18b500ee36ca940e0e549ec8b25a5fc6eeb251', 'admin', 'ILIGAN', 'Iligan City'),
    ('admin_kapatagan', '0192023a7bbd73250516f069df18b500ee36ca940e0e549ec8b25a5fc6eeb251', 'admin', 'KAPATAGAN', 'Kapatagan')
ON CONFLICT (username) DO UPDATE
SET role = EXCLUDED.role,
    municipality = EXCLUDED.municipality,
    municipality_name = EXCLUDED.municipality_name;
