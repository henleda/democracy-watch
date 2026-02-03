-- Migration: 007_lis_member_id
-- Description: Add LIS Member ID column for Senate vote matching
-- Senate.gov uses LIS IDs (e.g., S327) instead of Bioguide IDs

-- Add LIS Member ID column
ALTER TABLE members.members
ADD COLUMN IF NOT EXISTS lis_member_id VARCHAR(10);

-- Index for fast lookups during Senate vote ingestion
CREATE INDEX IF NOT EXISTS idx_members_lis_member_id
ON members.members(lis_member_id)
WHERE lis_member_id IS NOT NULL;

-- Add descriptive comment
COMMENT ON COLUMN members.members.lis_member_id IS
  'Legislative Information System ID used by Senate.gov (e.g., S327 for Mark Warner)';
