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
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public all access on app_users"
ON public.app_users FOR ALL
USING (true)
WITH CHECK (true);
