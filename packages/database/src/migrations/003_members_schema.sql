-- Create members schema
CREATE SCHEMA IF NOT EXISTS members;

-- Congressional members
CREATE TABLE IF NOT EXISTS members.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- External identifiers
    bioguide_id VARCHAR(10) UNIQUE NOT NULL,
    thomas_id VARCHAR(10),
    lis_id VARCHAR(10),
    govtrack_id INTEGER,
    opensecrets_id VARCHAR(20),
    votesmart_id INTEGER,
    fec_id VARCHAR(20),

    -- Basic info
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    nickname VARCHAR(50),

    -- Current position
    party VARCHAR(20) NOT NULL,
    state_code CHAR(2) NOT NULL REFERENCES public.states(code),
    chamber VARCHAR(10) NOT NULL,
    district VARCHAR(10),

    -- Term info
    current_term_start DATE,
    current_term_end DATE,
    is_active BOOLEAN DEFAULT TRUE,

    -- Profile
    date_of_birth DATE,
    gender CHAR(1),
    website_url TEXT,
    twitter_handle VARCHAR(50),

    -- Denormalized metrics (updated by analytics)
    total_votes INTEGER DEFAULT 0,
    promises_tracked INTEGER DEFAULT 0,
    deviation_score DECIMAL(5,2),
    party_alignment_score DECIMAL(5,2),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_members_bioguide ON members.members(bioguide_id);
CREATE INDEX IF NOT EXISTS idx_members_state_party ON members.members(state_code, party);
CREATE INDEX IF NOT EXISTS idx_members_chamber ON members.members(chamber);
CREATE INDEX IF NOT EXISTS idx_members_active ON members.members(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_members_opensecrets ON members.members(opensecrets_id);

-- Committees
CREATE TABLE IF NOT EXISTS members.committees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    chamber VARCHAR(10) NOT NULL,
    committee_type VARCHAR(20),
    parent_committee_id UUID REFERENCES members.committees(id),
    url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Committee memberships
CREATE TABLE IF NOT EXISTS members.committee_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members.members(id) ON DELETE CASCADE,
    committee_id UUID NOT NULL REFERENCES members.committees(id) ON DELETE CASCADE,
    role VARCHAR(50),
    start_date DATE,
    end_date DATE,
    congress INTEGER NOT NULL,
    UNIQUE(member_id, committee_id, congress)
);

CREATE INDEX IF NOT EXISTS idx_committee_memberships_member ON members.committee_memberships(member_id);
CREATE INDEX IF NOT EXISTS idx_committee_memberships_committee ON members.committee_memberships(committee_id);
