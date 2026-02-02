-- Sync metadata for tracking incremental ingestion
-- Use CREATE TABLE IF NOT EXISTS with a minimal schema first
CREATE TABLE IF NOT EXISTS public.sync_metadata (
    entity VARCHAR(100) PRIMARY KEY,
    last_sync_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add optional columns if they don't exist (defensive migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                   AND table_name = 'sync_metadata'
                   AND column_name = 'records_processed') THEN
        ALTER TABLE public.sync_metadata ADD COLUMN records_processed INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                   AND table_name = 'sync_metadata'
                   AND column_name = 'created_at') THEN
        ALTER TABLE public.sync_metadata ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                   AND table_name = 'sync_metadata'
                   AND column_name = 'updated_at') THEN
        ALTER TABLE public.sync_metadata ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;
