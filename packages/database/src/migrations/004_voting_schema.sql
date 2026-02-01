-- Create voting schema
CREATE SCHEMA IF NOT EXISTS voting;

-- Bills and resolutions
CREATE TABLE IF NOT EXISTS voting.bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Congress.gov identifier
    congress INTEGER NOT NULL,
    bill_type VARCHAR(10) NOT NULL,
    bill_number INTEGER NOT NULL,

    -- Content
    title TEXT NOT NULL,
    short_title VARCHAR(500),
    summary TEXT,
    full_text_url TEXT,

    -- Sponsor
    sponsor_id UUID REFERENCES members.members(id),
    introduced_date DATE,

    -- Status
    latest_action TEXT,
    latest_action_date DATE,
    became_law BOOLEAN DEFAULT FALSE,
    law_number VARCHAR(50),

    -- Policy categorization
    primary_policy_area_id INTEGER REFERENCES public.policy_areas(id),
    policy_area_ids INTEGER[],

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(congress, bill_type, bill_number)
);

CREATE INDEX IF NOT EXISTS idx_bills_congress ON voting.bills(congress);
CREATE INDEX IF NOT EXISTS idx_bills_policy_area ON voting.bills(primary_policy_area_id);
CREATE INDEX IF NOT EXISTS idx_bills_sponsor ON voting.bills(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_bills_summary_fts ON voting.bills USING gin(to_tsvector('english', COALESCE(summary, '')));

-- Bill embeddings for semantic matching
CREATE TABLE IF NOT EXISTS voting.bill_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES voting.bills(id) ON DELETE CASCADE,
    embedding VECTOR(1024) NOT NULL,
    chunk_index INTEGER DEFAULT 0,
    chunk_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bill_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_bill_embeddings_hnsw ON voting.bill_embeddings
    USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 256);

-- Roll call votes
CREATE TABLE IF NOT EXISTS voting.roll_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identifiers
    congress INTEGER NOT NULL,
    chamber VARCHAR(10) NOT NULL,
    session INTEGER NOT NULL,
    roll_call_number INTEGER NOT NULL,

    -- Related bill
    bill_id UUID REFERENCES voting.bills(id),

    -- Vote info
    vote_date DATE NOT NULL,
    vote_time TIME,
    vote_question TEXT,
    vote_type VARCHAR(50),
    vote_result VARCHAR(50),

    -- Totals
    yea_total INTEGER,
    nay_total INTEGER,
    present_total INTEGER,
    not_voting_total INTEGER,

    -- Party breakdown (denormalized)
    republican_yea INTEGER,
    republican_nay INTEGER,
    democrat_yea INTEGER,
    democrat_nay INTEGER,

    -- Source
    source_url TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(congress, chamber, session, roll_call_number)
);

CREATE INDEX IF NOT EXISTS idx_roll_calls_date ON voting.roll_calls(vote_date DESC);
CREATE INDEX IF NOT EXISTS idx_roll_calls_bill ON voting.roll_calls(bill_id);

-- Individual votes
CREATE TABLE IF NOT EXISTS voting.votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members.members(id),
    roll_call_id UUID NOT NULL REFERENCES voting.roll_calls(id),
    position VARCHAR(20) NOT NULL,
    vote_date DATE NOT NULL,
    bill_id UUID REFERENCES voting.bills(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(member_id, roll_call_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_member_date ON voting.votes(member_id, vote_date DESC);
CREATE INDEX IF NOT EXISTS idx_votes_roll_call ON voting.votes(roll_call_id);
CREATE INDEX IF NOT EXISTS idx_votes_bill ON voting.votes(bill_id);
