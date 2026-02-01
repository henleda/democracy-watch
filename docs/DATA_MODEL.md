# DATA_MODEL.md - Database Schema

## Overview

The database uses PostgreSQL with the pgvector extension for vector similarity search. Data is organized into schemas that correspond to bounded contexts.

## Schema Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PUBLIC SCHEMA                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                         │
│  │   states    │  │policy_areas │  │zip_districts│                         │
│  │             │  │             │  │             │                         │
│  │ code (PK)   │  │ id (PK)     │  │ zip_code    │                         │
│  │ name        │  │ code        │  │ state_code  │                         │
│  │ region      │  │ name        │  │ district    │                         │
│  └──────┬──────┘  │ parent_id   │  └─────────────┘                         │
│         │         └──────┬──────┘                                           │
└─────────┼────────────────┼──────────────────────────────────────────────────┘
          │                │
          │                │
┌─────────┼────────────────┼──────────────────────────────────────────────────┐
│         │    MEMBERS SCHEMA                                                 │
│         │                │                                                  │
│         ▼                │                                                  │
│  ┌─────────────┐         │         ┌─────────────┐                         │
│  │   members   │─────────┼────────▶│ committees  │                         │
│  │             │         │         │             │                         │
│  │ id (PK)     │         │         │ id (PK)     │                         │
│  │ bioguide_id │         │         │ code        │                         │
│  │ name        │         │         │ name        │                         │
│  │ party       │         │         │ chamber     │                         │
│  │ state_code ─┼─────────┘         └─────────────┘                         │
│  │ chamber     │                          │                                 │
│  │ district    │         ┌────────────────┘                                 │
│  │             │         │                                                  │
│  │ deviation_  │         ▼                                                  │
│  │ score       │  ┌─────────────────┐                                      │
│  │ party_      │  │ committee_      │                                      │
│  │ alignment   │  │ memberships     │                                      │
│  └──────┬──────┘  │                 │                                      │
│         │         │ member_id (FK)  │                                      │
│         │         │ committee_id(FK)│                                      │
│         │         │ role            │                                      │
│         │         └─────────────────┘                                      │
└─────────┼───────────────────────────────────────────────────────────────────┘
          │
          │
┌─────────┼───────────────────────────────────────────────────────────────────┐
│         │    VOTING SCHEMA                                                  │
│         │                                                                   │
│         │         ┌─────────────┐         ┌─────────────┐                  │
│         │         │    bills    │◀────────│ roll_calls  │                  │
│         │         │             │         │             │                  │
│         │         │ id (PK)     │         │ id (PK)     │                  │
│         │         │ congress    │         │ congress    │                  │
│         │         │ bill_type   │         │ chamber     │                  │
│         │         │ bill_number │         │ vote_date   │                  │
│         │         │ title       │         │ bill_id (FK)│                  │
│         │         │ summary     │         │ vote_result │                  │
│         │         │ policy_area │         └──────┬──────┘                  │
│         │         └──────┬──────┘                │                         │
│         │                │                       │                         │
│         │                │                       │                         │
│         │                ▼                       │                         │
│         │         ┌─────────────┐                │                         │
│         │         │    bill_    │                │                         │
│         │         │ embeddings  │                │                         │
│         │         │             │                │                         │
│         │         │ embedding   │                │                         │
│         │         │ VECTOR(1024)│                │                         │
│         │         └─────────────┘                │                         │
│         │                                        │                         │
│         │         ┌─────────────┐                │                         │
│         └────────▶│    votes    │◀───────────────┘                         │
│                   │             │                                          │
│                   │ id (PK)     │                                          │
│                   │ member_id   │                                          │
│                   │ roll_call_id│                                          │
│                   │ position    │                                          │
│                   └─────────────┘                                          │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│    PLATFORMS SCHEMA                                                        │
│                                                                            │
│         ┌─────────────┐         ┌─────────────┐                           │
│         │  platforms  │────────▶│   planks    │                           │
│         │             │         │             │                           │
│         │ id (PK)     │         │ id (PK)     │                           │
│         │ party       │         │ platform_id │                           │
│         │ year        │         │ statement   │                           │
│         │ document_url│         │ policy_area │                           │
│         └─────────────┘         │ embedding   │                           │
│                                 │ VECTOR(1024)│                           │
│                                 └─────────────┘                           │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│    PROMISES SCHEMA                                                         │
│                                                                            │
│         ┌─────────────┐         ┌─────────────┐                           │
│         │   sources   │────────▶│  promises   │                           │
│         │             │         │             │                           │
│         │ id (PK)     │         │ id (PK)     │                           │
│         │ source_type │         │ member_id   │◀─── (from members.members)│
│         │ source_url  │         │ source_id   │                           │
│         │ status      │         │ statement   │                           │
│         └─────────────┘         │ policy_area │                           │
│                                 │ embedding   │                           │
│                                 │ VECTOR(1024)│                           │
│                                 │ confidence  │                           │
│                                 │ review_     │                           │
│                                 │ status      │                           │
│                                 └─────────────┘                           │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│    FINANCE SCHEMA                                                          │
│                                                                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                        │
│  │ industries  │  │organizations│  │contributions│                        │
│  │             │  │             │  │             │                        │
│  │ id (PK)     │  │ id (PK)     │  │ id (PK)     │                        │
│  │ code        │◀─│ industry_id │◀─│ org_id      │                        │
│  │ name        │  │ name        │  │ member_id   │◀─ (from members)       │
│  │ sector      │  │ type        │  │ amount      │                        │
│  └─────────────┘  └─────────────┘  │ cycle       │                        │
│         │                          └─────────────┘                        │
│         │                                                                  │
│         │         ┌───────────────────┐                                   │
│         └────────▶│ member_industry_  │                                   │
│                   │ totals            │                                   │
│                   │                   │                                   │
│                   │ member_id         │                                   │
│                   │ industry_id       │                                   │
│                   │ total_amount      │                                   │
│                   │ industry_rank     │                                   │
│                   └───────────────────┘                                   │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│    ANALYTICS SCHEMA                                                        │
│                                                                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│  │   deviations    │  │funding_         │  │ platform_       │            │
│  │                 │  │correlations     │  │ alignments      │            │
│  │ id (PK)         │  │                 │  │                 │            │
│  │ member_id (FK)  │  │ id (PK)         │  │ id (PK)         │            │
│  │ promise_id (FK) │  │ member_id (FK)  │  │ member_id (FK)  │            │
│  │ vote_id (FK)    │  │ vote_id (FK)    │  │ vote_id (FK)    │            │
│  │ alignment_score │  │ industry_id (FK)│  │ plank_id (FK)   │            │
│  │ confidence      │  │ vote_favors_ind │  │ is_aligned      │            │
│  │ explanation     │  │ correlation_str │  │ confidence      │            │
│  │ is_flagged      │  │ is_flagged      │  └─────────────────┘            │
│  └─────────────────┘  └─────────────────┘                                 │
│                                                                            │
│                       ┌─────────────────┐                                 │
│                       │ member_rankings │                                 │
│                       │                 │                                 │
│                       │ member_id (FK)  │                                 │
│                       │ deviation_score │                                 │
│                       │ deviation_rank  │                                 │
│                       │ party_alignment │                                 │
│                       │ accountability  │                                 │
│                       └─────────────────┘                                 │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

## Complete SQL Schema

### Schema: public

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- States reference table
CREATE TABLE public.states (
    code CHAR(2) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    region VARCHAR(50),  -- 'Northeast', 'Southeast', 'Midwest', 'Southwest', 'West'
    fips_code CHAR(2) UNIQUE
);

-- Policy area taxonomy
CREATE TABLE public.policy_areas (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    parent_id INTEGER REFERENCES public.policy_areas(id),
    description TEXT,
    votesmart_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_policy_areas_parent ON public.policy_areas(parent_id);

-- Zip code to congressional district mapping
CREATE TABLE public.zip_districts (
    zip_code CHAR(5) NOT NULL,
    state_code CHAR(2) NOT NULL REFERENCES public.states(code),
    district_number VARCHAR(10),  -- NULL for at-large, '00' for non-voting
    PRIMARY KEY (zip_code, state_code, COALESCE(district_number, ''))
);

CREATE INDEX idx_zip_districts_zip ON public.zip_districts(zip_code);
```

### Schema: members

```sql
CREATE SCHEMA IF NOT EXISTS members;

-- Congressional members
CREATE TABLE members.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- External identifiers
    bioguide_id VARCHAR(10) UNIQUE NOT NULL,
    thomas_id VARCHAR(10),
    lis_id VARCHAR(10),
    govtrack_id INTEGER,
    opensecrets_id VARCHAR(20),  -- CRP ID
    votesmart_id INTEGER,
    fec_id VARCHAR(20),
    
    -- Basic info
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    nickname VARCHAR(50),
    
    -- Current position
    party VARCHAR(20) NOT NULL,  -- 'Republican', 'Democrat', 'Independent'
    state_code CHAR(2) NOT NULL REFERENCES public.states(code),
    chamber VARCHAR(10) NOT NULL,  -- 'house', 'senate'
    district VARCHAR(10),  -- NULL for senators
    
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

CREATE INDEX idx_members_bioguide ON members.members(bioguide_id);
CREATE INDEX idx_members_state_party ON members.members(state_code, party);
CREATE INDEX idx_members_chamber ON members.members(chamber);
CREATE INDEX idx_members_active ON members.members(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_members_opensecrets ON members.members(opensecrets_id);

-- Committees
CREATE TABLE members.committees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    chamber VARCHAR(10) NOT NULL,
    committee_type VARCHAR(20),  -- 'standing', 'select', 'joint', 'subcommittee'
    parent_committee_id UUID REFERENCES members.committees(id),
    url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Committee memberships
CREATE TABLE members.committee_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members.members(id) ON DELETE CASCADE,
    committee_id UUID NOT NULL REFERENCES members.committees(id) ON DELETE CASCADE,
    role VARCHAR(50),  -- 'chair', 'ranking_member', 'member'
    start_date DATE,
    end_date DATE,
    congress INTEGER NOT NULL,
    UNIQUE(member_id, committee_id, congress)
);

CREATE INDEX idx_committee_memberships_member ON members.committee_memberships(member_id);
CREATE INDEX idx_committee_memberships_committee ON members.committee_memberships(committee_id);
```

### Schema: voting

```sql
CREATE SCHEMA IF NOT EXISTS voting;

-- Bills and resolutions
CREATE TABLE voting.bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Congress.gov identifier
    congress INTEGER NOT NULL,
    bill_type VARCHAR(10) NOT NULL,  -- 'hr', 's', 'hjres', 'sjres', etc.
    bill_number INTEGER NOT NULL,
    congress_id VARCHAR(50) GENERATED ALWAYS AS (
        bill_type || bill_number || '-' || congress
    ) STORED,
    
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

CREATE INDEX idx_bills_congress ON voting.bills(congress);
CREATE INDEX idx_bills_congress_id ON voting.bills(congress_id);
CREATE INDEX idx_bills_policy_area ON voting.bills(primary_policy_area_id);
CREATE INDEX idx_bills_sponsor ON voting.bills(sponsor_id);
CREATE INDEX idx_bills_summary_fts ON voting.bills USING gin(to_tsvector('english', summary));

-- Bill embeddings for semantic matching
CREATE TABLE voting.bill_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES voting.bills(id) ON DELETE CASCADE,
    embedding VECTOR(1024) NOT NULL,
    chunk_index INTEGER DEFAULT 0,
    chunk_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bill_id, chunk_index)
);

CREATE INDEX idx_bill_embeddings_hnsw ON voting.bill_embeddings 
    USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 256);

-- Roll call votes
CREATE TABLE voting.roll_calls (
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

CREATE INDEX idx_roll_calls_date ON voting.roll_calls(vote_date DESC);
CREATE INDEX idx_roll_calls_bill ON voting.roll_calls(bill_id);

-- Individual votes
CREATE TABLE voting.votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members.members(id),
    roll_call_id UUID NOT NULL REFERENCES voting.roll_calls(id),
    position VARCHAR(20) NOT NULL,  -- 'Yea', 'Nay', 'Present', 'Not Voting'
    vote_date DATE NOT NULL,
    bill_id UUID REFERENCES voting.bills(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(member_id, roll_call_id)
);

CREATE INDEX idx_votes_member_date ON voting.votes(member_id, vote_date DESC);
CREATE INDEX idx_votes_roll_call ON voting.votes(roll_call_id);
CREATE INDEX idx_votes_bill ON voting.votes(bill_id);
```

### Schema: platforms

```sql
CREATE SCHEMA IF NOT EXISTS platforms;

-- Party platforms (by election year)
CREATE TABLE platforms.platforms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party VARCHAR(20) NOT NULL,
    year INTEGER NOT NULL,
    title VARCHAR(200),
    document_url TEXT,
    full_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(party, year)
);

-- Platform planks (individual positions)
CREATE TABLE platforms.planks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_id UUID NOT NULL REFERENCES platforms.platforms(id) ON DELETE CASCADE,
    section_title VARCHAR(200),
    statement TEXT NOT NULL,
    summary VARCHAR(500),
    policy_area_id INTEGER REFERENCES public.policy_areas(id),
    position_stance VARCHAR(20),  -- 'support', 'oppose', 'neutral'
    keywords TEXT[],
    embedding VECTOR(1024),
    section_order INTEGER,
    plank_order INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_planks_platform ON platforms.planks(platform_id);
CREATE INDEX idx_planks_policy_area ON platforms.planks(policy_area_id);
CREATE INDEX idx_planks_embedding_hnsw ON platforms.planks 
    USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 256);
```

### Schema: promises

```sql
CREATE SCHEMA IF NOT EXISTS promises;

-- Content sources (videos, articles, etc.)
CREATE TABLE promises.sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type VARCHAR(50) NOT NULL,  -- 'youtube', 'cspan', 'interview', 'website'
    source_url TEXT NOT NULL UNIQUE,
    title VARCHAR(500),
    published_date DATE,
    discovered_date TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'processing', 'completed', 'failed'
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    transcript_s3_key TEXT,
    raw_content_s3_key TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sources_status ON promises.sources(status);
CREATE INDEX idx_sources_type ON promises.sources(source_type);

-- Extracted promises
CREATE TABLE promises.promises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members.members(id),
    source_id UUID REFERENCES promises.sources(id),
    
    -- Content
    statement TEXT NOT NULL,
    context TEXT,
    
    -- Categorization
    policy_area_id INTEGER REFERENCES public.policy_areas(id),
    position_type VARCHAR(50),  -- 'promise', 'commitment', 'opposition', 'value_statement'
    position_stance VARCHAR(20),  -- 'support', 'oppose'
    
    -- Quality
    specificity INTEGER CHECK (specificity BETWEEN 1 AND 5),
    confidence DECIMAL(3,2) CHECK (confidence BETWEEN 0 AND 1),
    
    -- Vector embedding
    embedding VECTOR(1024),
    
    -- Source reference
    source_url TEXT,
    source_date DATE,
    timestamp_start INTEGER,
    timestamp_end INTEGER,
    
    -- Review workflow
    review_status VARCHAR(20) DEFAULT 'pending',
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    
    -- AI metadata
    extraction_model VARCHAR(50),
    extraction_prompt_version VARCHAR(20),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_promises_member ON promises.promises(member_id);
CREATE INDEX idx_promises_policy_area ON promises.promises(policy_area_id);
CREATE INDEX idx_promises_review_status ON promises.promises(review_status);
CREATE INDEX idx_promises_source_date ON promises.promises(source_date DESC);
CREATE INDEX idx_promises_embedding_hnsw ON promises.promises 
    USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 256);
CREATE INDEX idx_promises_fts ON promises.promises 
    USING gin(to_tsvector('english', statement));
```

### Schema: finance

```sql
CREATE SCHEMA IF NOT EXISTS finance;

-- Industries (OpenSecrets categorization)
CREATE TABLE finance.industries (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    sector VARCHAR(100),
    keywords TEXT[],
    related_policy_areas INTEGER[]
);

-- PACs and organizations
CREATE TABLE finance.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opensecrets_id VARCHAR(20) UNIQUE,
    fec_committee_id VARCHAR(20),
    name VARCHAR(200) NOT NULL,
    organization_type VARCHAR(50),
    industry_id INTEGER REFERENCES finance.industries(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_organizations_industry ON finance.organizations(industry_id);

-- Individual contributions
CREATE TABLE finance.contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members.members(id),
    contributor_name TEXT,
    contributor_type VARCHAR(50),
    organization_id UUID REFERENCES finance.organizations(id),
    industry_id INTEGER REFERENCES finance.industries(id),
    amount DECIMAL(12,2) NOT NULL,
    contribution_date DATE,
    election_cycle VARCHAR(10),
    fec_transaction_id VARCHAR(50),
    fec_filing_id VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contributions_member ON finance.contributions(member_id);
CREATE INDEX idx_contributions_industry ON finance.contributions(industry_id);
CREATE INDEX idx_contributions_cycle ON finance.contributions(election_cycle);

-- Aggregated totals (materialized for performance)
CREATE TABLE finance.member_industry_totals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members.members(id),
    industry_id INTEGER NOT NULL REFERENCES finance.industries(id),
    election_cycle VARCHAR(10) NOT NULL,
    total_amount DECIMAL(14,2) NOT NULL,
    contribution_count INTEGER NOT NULL,
    pac_amount DECIMAL(14,2),
    individual_amount DECIMAL(14,2),
    industry_rank INTEGER,
    percentage_of_total DECIMAL(5,2),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(member_id, industry_id, election_cycle)
);

CREATE INDEX idx_member_industry_totals_member ON finance.member_industry_totals(member_id);
CREATE INDEX idx_member_industry_totals_industry ON finance.member_industry_totals(industry_id);
```

### Schema: analytics

```sql
CREATE SCHEMA IF NOT EXISTS analytics;

-- Promise-Vote deviations
CREATE TABLE analytics.deviations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members.members(id),
    promise_id UUID NOT NULL REFERENCES promises.promises(id),
    vote_id UUID NOT NULL REFERENCES voting.votes(id),
    alignment_score INTEGER NOT NULL CHECK (alignment_score BETWEEN -1 AND 1),
    confidence DECIMAL(3,2) CHECK (confidence BETWEEN 0 AND 1),
    is_significant BOOLEAN DEFAULT FALSE,
    explanation TEXT,
    narrative TEXT,
    analysis_model VARCHAR(50),
    analysis_date TIMESTAMPTZ DEFAULT NOW(),
    is_flagged BOOLEAN DEFAULT FALSE,
    flagged_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(promise_id, vote_id)
);

CREATE INDEX idx_deviations_member ON analytics.deviations(member_id);
CREATE INDEX idx_deviations_flagged ON analytics.deviations(is_flagged) WHERE is_flagged = TRUE;
CREATE INDEX idx_deviations_score ON analytics.deviations(alignment_score);

-- Funding-Vote correlations
CREATE TABLE analytics.funding_correlations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members.members(id),
    vote_id UUID NOT NULL REFERENCES voting.votes(id),
    industry_id INTEGER NOT NULL REFERENCES finance.industries(id),
    vote_favors_industry BOOLEAN,
    industry_funding_amount DECIMAL(14,2),
    industry_funding_rank INTEGER,
    correlation_strength DECIMAL(5,4),
    p_value DECIMAL(8,6),
    bill_id UUID REFERENCES voting.bills(id),
    explanation TEXT,
    is_flagged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(vote_id, industry_id)
);

CREATE INDEX idx_funding_correlations_member ON analytics.funding_correlations(member_id);
CREATE INDEX idx_funding_correlations_flagged ON analytics.funding_correlations(is_flagged) WHERE is_flagged = TRUE;

-- Platform alignment scores
CREATE TABLE analytics.platform_alignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members.members(id),
    vote_id UUID NOT NULL REFERENCES voting.votes(id),
    plank_id UUID NOT NULL REFERENCES platforms.planks(id),
    is_aligned BOOLEAN NOT NULL,
    confidence DECIMAL(3,2),
    explanation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(vote_id, plank_id)
);

CREATE INDEX idx_platform_alignments_member ON analytics.platform_alignments(member_id);

-- Member rankings (refreshed hourly)
CREATE TABLE analytics.member_rankings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members.members(id) UNIQUE,
    
    -- Deviation metrics
    total_promises INTEGER DEFAULT 0,
    total_votes_with_promises INTEGER DEFAULT 0,
    aligned_votes INTEGER DEFAULT 0,
    contradicting_votes INTEGER DEFAULT 0,
    deviation_score DECIMAL(5,2),
    deviation_rank INTEGER,
    
    -- Party alignment
    party_platform_votes INTEGER DEFAULT 0,
    party_aligned_votes INTEGER DEFAULT 0,
    party_alignment_score DECIMAL(5,2),
    party_alignment_rank INTEGER,
    
    -- Funding correlations
    flagged_correlations INTEGER DEFAULT 0,
    correlation_score DECIMAL(5,2),
    
    -- Combined score
    accountability_score DECIMAL(5,2),
    accountability_rank INTEGER,
    
    calculation_period VARCHAR(20),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_member_rankings_deviation ON analytics.member_rankings(deviation_rank);
CREATE INDEX idx_member_rankings_party ON analytics.member_rankings(party_alignment_rank);
CREATE INDEX idx_member_rankings_accountability ON analytics.member_rankings(accountability_rank);
```

### Schema: users

```sql
CREATE SCHEMA IF NOT EXISTS users;

-- User accounts
CREATE TABLE users.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cognito_sub VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    zip_code CHAR(5),
    state_code CHAR(2) REFERENCES public.states(code),
    tier VARCHAR(20) DEFAULT 'free',
    subscription_start DATE,
    subscription_end DATE,
    api_key_hash VARCHAR(64),
    api_calls_today INTEGER DEFAULT 0,
    api_calls_month INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User alerts
CREATE TABLE users.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users.accounts(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL,
    member_id UUID REFERENCES members.members(id),
    policy_area_id INTEGER REFERENCES public.policy_areas(id),
    channel VARCHAR(20) DEFAULT 'email',
    webhook_url TEXT,
    frequency VARCHAR(20) DEFAULT 'immediate',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_user ON users.alerts(user_id);
CREATE INDEX idx_alerts_member ON users.alerts(member_id);
```

## Key Queries

### Find representatives by zip code

```sql
SELECT 
    m.id, m.full_name, m.party, m.state_code, m.chamber, m.district,
    r.deviation_score, r.party_alignment_score, r.accountability_rank
FROM public.zip_districts zd
JOIN members.members m ON m.state_code = zd.state_code 
    AND (m.chamber = 'senate' OR m.district = zd.district_number)
LEFT JOIN analytics.member_rankings r ON r.member_id = m.id
WHERE zd.zip_code = $1 AND m.is_active = TRUE;
```

### Find promises similar to a bill (vector search)

```sql
WITH bill_vec AS (
    SELECT embedding FROM voting.bill_embeddings WHERE bill_id = $1 LIMIT 1
)
SELECT 
    p.id, p.statement, p.policy_area_id, p.confidence,
    1 - (p.embedding <=> bv.embedding) AS similarity
FROM promises.promises p, bill_vec bv
WHERE p.member_id = $2
  AND p.review_status = 'approved'
  AND 1 - (p.embedding <=> bv.embedding) > 0.7
ORDER BY p.embedding <=> bv.embedding
LIMIT 10;
```

### Top deviators ranking

```sql
SELECT 
    m.id, m.full_name, m.party, m.state_code, m.chamber,
    r.deviation_score, r.deviation_rank, r.contradicting_votes
FROM members.members m
JOIN analytics.member_rankings r ON r.member_id = m.id
WHERE m.is_active = TRUE
ORDER BY r.deviation_rank ASC
LIMIT 10;
```

### Party platform rebels

```sql
SELECT 
    m.id, m.full_name, m.party, m.state_code,
    r.party_alignment_score, r.party_alignment_rank
FROM members.members m
JOIN analytics.member_rankings r ON r.member_id = m.id
WHERE m.is_active = TRUE AND m.party = $1
ORDER BY r.party_alignment_score ASC
LIMIT 10;
```
