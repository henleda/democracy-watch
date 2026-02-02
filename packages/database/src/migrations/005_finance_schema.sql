-- Finance schema for campaign contribution tracking
-- Phase 2: AI-powered industry classification (replaces OpenSecrets)

CREATE SCHEMA IF NOT EXISTS finance;

-- Reference table for industry sectors (17 sectors)
CREATE TABLE IF NOT EXISTS finance.ref_sectors (
    code VARCHAR(4) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    policy_areas TEXT[],
    display_order SMALLINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reference table for industries (52 industries)
CREATE TABLE IF NOT EXISTS finance.ref_industries (
    code VARCHAR(6) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    sector_code VARCHAR(4) NOT NULL REFERENCES finance.ref_sectors(code),
    description TEXT,
    keywords TEXT[],
    display_order SMALLINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ref_industries_sector ON finance.ref_industries(sector_code);

-- FEC candidate ID to bioguide ID crosswalk
CREATE TABLE IF NOT EXISTS finance.id_crosswalk (
    id SERIAL PRIMARY KEY,
    fec_candidate_id VARCHAR(9) UNIQUE NOT NULL,
    bioguide_id VARCHAR(10),
    member_id UUID,
    candidate_name VARCHAR(200),
    confidence VARCHAR(10) DEFAULT 'unknown', -- 'exact', 'fuzzy', 'manual', 'unknown'
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_id_crosswalk_bioguide ON finance.id_crosswalk(bioguide_id);

-- Raw contributions from FEC (staging table)
CREATE TABLE IF NOT EXISTS finance.raw_contributions (
    id BIGSERIAL PRIMARY KEY,
    fec_transaction_id VARCHAR(32) UNIQUE NOT NULL,
    committee_id VARCHAR(9) NOT NULL,
    candidate_id VARCHAR(9),
    contributor_name VARCHAR(200),
    contributor_employer VARCHAR(200),
    contributor_occupation VARCHAR(100),
    contributor_city VARCHAR(50),
    contributor_state VARCHAR(2),
    contributor_zip VARCHAR(10),
    contribution_amount DECIMAL(12,2),
    contribution_date DATE,
    transaction_type VARCHAR(3),
    cycle SMALLINT NOT NULL,
    ingested_at TIMESTAMPTZ DEFAULT NOW(),
    classified BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_raw_contributions_unclassified
    ON finance.raw_contributions(classified) WHERE classified = FALSE;
CREATE INDEX IF NOT EXISTS idx_raw_contributions_candidate
    ON finance.raw_contributions(candidate_id, cycle);
CREATE INDEX IF NOT EXISTS idx_raw_contributions_date
    ON finance.raw_contributions(contribution_date);

-- Classification cache for employer/occupation -> industry mapping
CREATE TABLE IF NOT EXISTS finance.classification_cache (
    id BIGSERIAL PRIMARY KEY,
    employer_normalized VARCHAR(200),
    occupation_normalized VARCHAR(100),
    industry_code VARCHAR(6) NOT NULL REFERENCES finance.ref_industries(code),
    sector_code VARCHAR(4) NOT NULL REFERENCES finance.ref_sectors(code),
    confidence DECIMAL(3,2),
    hit_count INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (employer_normalized, occupation_normalized)
);

CREATE INDEX IF NOT EXISTS idx_classification_cache_lookup
    ON finance.classification_cache(employer_normalized, occupation_normalized);

-- Classified contributions with AI-assigned industry codes
CREATE TABLE IF NOT EXISTS finance.classified_contributions (
    id BIGSERIAL PRIMARY KEY,
    raw_contribution_id BIGINT REFERENCES finance.raw_contributions(id),
    industry_code VARCHAR(6) NOT NULL REFERENCES finance.ref_industries(code),
    industry_name VARCHAR(100) NOT NULL,
    sector_code VARCHAR(4) NOT NULL REFERENCES finance.ref_sectors(code),
    sector_name VARCHAR(50) NOT NULL,
    classification_confidence DECIMAL(3,2),
    classification_source VARCHAR(20) DEFAULT 'claude', -- 'pre_rule', 'cache', 'claude'
    classified_at TIMESTAMPTZ DEFAULT NOW(),
    classifier_version VARCHAR(20) DEFAULT 'v1.0',
    taxonomy_version VARCHAR(20) DEFAULT 'v1.0'
);

CREATE INDEX IF NOT EXISTS idx_classified_industry
    ON finance.classified_contributions(industry_code);
CREATE INDEX IF NOT EXISTS idx_classified_sector
    ON finance.classified_contributions(sector_code);

-- Aggregated totals per member per industry per cycle
CREATE TABLE IF NOT EXISTS finance.member_industry_totals (
    id BIGSERIAL PRIMARY KEY,
    member_id UUID,
    bioguide_id VARCHAR(10) NOT NULL,
    industry_code VARCHAR(6) NOT NULL REFERENCES finance.ref_industries(code),
    industry_name VARCHAR(100) NOT NULL,
    sector_code VARCHAR(4) NOT NULL REFERENCES finance.ref_sectors(code),
    sector_name VARCHAR(50) NOT NULL,
    cycle SMALLINT NOT NULL,
    total_amount DECIMAL(14,2) NOT NULL,
    contribution_count INT NOT NULL,
    avg_contribution DECIMAL(10,2),
    pct_of_total DECIMAL(5,2),
    chamber_percentile SMALLINT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (bioguide_id, industry_code, cycle)
);

CREATE INDEX IF NOT EXISTS idx_member_industry_bioguide
    ON finance.member_industry_totals(bioguide_id);
CREATE INDEX IF NOT EXISTS idx_member_industry_sector
    ON finance.member_industry_totals(sector_code, cycle);

-- Top donors per member
CREATE TABLE IF NOT EXISTS finance.member_top_donors (
    id BIGSERIAL PRIMARY KEY,
    member_id UUID,
    bioguide_id VARCHAR(10) NOT NULL,
    cycle SMALLINT NOT NULL,
    donor_name VARCHAR(200) NOT NULL,
    donor_employer VARCHAR(200),
    donor_occupation VARCHAR(100),
    industry_code VARCHAR(6),
    total_amount DECIMAL(12,2) NOT NULL,
    contribution_count INT,
    rank SMALLINT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_member_top_donors_bioguide
    ON finance.member_top_donors(bioguide_id, cycle);

-- Summary stats per member
CREATE TABLE IF NOT EXISTS finance.member_funding_summary (
    id BIGSERIAL PRIMARY KEY,
    member_id UUID,
    bioguide_id VARCHAR(10) NOT NULL,
    cycle SMALLINT NOT NULL,
    total_raised DECIMAL(14,2),
    total_individual DECIMAL(14,2),
    total_pac DECIMAL(14,2),
    total_self_funded DECIMAL(14,2),
    pct_small_donor DECIMAL(5,2),
    pct_large_donor DECIMAL(5,2),
    pct_in_state DECIMAL(5,2),
    pct_out_of_state DECIMAL(5,2),
    top_industry_code VARCHAR(6),
    top_industry_pct DECIMAL(5,2),
    industry_concentration_hhi INT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (bioguide_id, cycle)
);

CREATE INDEX IF NOT EXISTS idx_member_funding_bioguide
    ON finance.member_funding_summary(bioguide_id);
