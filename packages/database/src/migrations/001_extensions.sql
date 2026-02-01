-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create sync metadata table for tracking ingestion state
CREATE TABLE IF NOT EXISTS public.sync_metadata (
    entity VARCHAR(50) PRIMARY KEY,
    last_sync_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
