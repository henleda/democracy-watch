-- Add subjects column to bills table for storing legislative subjects as array
ALTER TABLE voting.bills ADD COLUMN IF NOT EXISTS subjects TEXT[];

-- Create GIN index for efficient array searches
CREATE INDEX IF NOT EXISTS idx_bills_subjects ON voting.bills USING gin(subjects);

COMMENT ON COLUMN voting.bills.subjects IS 'Legislative subjects from Congress.gov (e.g., Healthcare, Immigration, Defense)';
