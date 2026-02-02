-- States reference table
CREATE TABLE IF NOT EXISTS public.states (
    code CHAR(2) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    region VARCHAR(50),
    fips_code CHAR(2) UNIQUE
);

-- Policy area taxonomy
CREATE TABLE IF NOT EXISTS public.policy_areas (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    parent_id INTEGER REFERENCES public.policy_areas(id),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_policy_areas_parent ON public.policy_areas(parent_id);

-- Zip code to congressional district mapping
-- district_number is 'AL' for at-large districts
CREATE TABLE IF NOT EXISTS public.zip_districts (
    zip_code CHAR(5) NOT NULL,
    state_code CHAR(2) NOT NULL REFERENCES public.states(code),
    district_number VARCHAR(10) NOT NULL DEFAULT 'AL',
    PRIMARY KEY (zip_code, state_code, district_number)
);

CREATE INDEX IF NOT EXISTS idx_zip_districts_zip ON public.zip_districts(zip_code);
