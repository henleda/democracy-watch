# Campaign Finance Data Pipeline

## Overview

This document describes the campaign finance data pipeline for Democracy.Watch. The pipeline ingests raw contribution data from the FEC, classifies donors by industry using AI, and aggregates funding patterns per member of Congress.

> **Note**: OpenSecrets API access is no longer available. This pipeline uses AI-powered industry classification as a replacement.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FINANCE DATA PIPELINE                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │ FEC OpenFEC  │    │ Senate LDA   │    │ FEC Bulk     │              │
│  │ API          │    │ Database     │    │ Downloads    │              │
│  │ (Real-time)  │    │ (Lobbying)   │    │ (Historical) │              │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘              │
│         │                   │                   │                       │
│         ▼                   ▼                   ▼                       │
│  ┌─────────────────────────────────────────────────────┐               │
│  │              RAW INGESTION LAYER                     │               │
│  │  • Lambda: finance-ingest-contributions              │               │
│  │  • Lambda: finance-ingest-lobbying                   │               │
│  │  • Schedule: Daily (contributions), Weekly (bulk)    │               │
│  └──────────────────────┬──────────────────────────────┘               │
│                         │                                               │
│                         ▼                                               │
│  ┌─────────────────────────────────────────────────────┐               │
│  │              STAGING TABLES                          │               │
│  │  • finance.raw_contributions                         │               │
│  │  • finance.raw_lobbying_registrations                │               │
│  │  • finance.raw_lobbying_reports                      │               │
│  └──────────────────────┬──────────────────────────────┘               │
│                         │                                               │
│                         ▼                                               │
│  ┌─────────────────────────────────────────────────────┐               │
│  │         AI INDUSTRY CLASSIFICATION                   │               │
│  │  • Lambda: finance-classify-donors                   │               │
│  │  • Model: Claude 3 Haiku (cost-optimized)            │               │
│  │  • Batch: 50 donors per request                      │               │
│  │  • Output: industry_code + confidence                │               │
│  └──────────────────────┬──────────────────────────────┘               │
│                         │                                               │
│                         ▼                                               │
│  ┌─────────────────────────────────────────────────────┐               │
│  │              AGGREGATION LAYER                       │               │
│  │  • finance.classified_contributions                  │               │
│  │  • finance.member_industry_totals                    │               │
│  │  • finance.member_top_donors                         │               │
│  │  • finance.member_funding_summary                    │               │
│  └─────────────────────────────────────────────────────┘               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Data Sources

### 1. FEC OpenFEC API (Primary)

**Base URL**: `https://api.open.fec.gov/v1`

**Key Endpoints**:
| Endpoint | Purpose | Rate Limit |
|----------|---------|------------|
| `/schedules/schedule_a/` | Individual contributions | 1000/hour |
| `/schedules/schedule_b/` | Disbursements | 1000/hour |
| `/candidates/` | Candidate info | 1000/hour |
| `/committees/` | Committee details | 1000/hour |

**API Key**: Required. Store in AWS Secrets Manager as `fec-api-key`.

**Pagination**: Use `last_index` and `last_contribution_receipt_date` for cursor-based pagination.

```python
# Example: Fetch contributions for a candidate
GET /schedules/schedule_a/?candidate_id=H0TX22107&two_year_transaction_period=2024&per_page=100
```

### 2. FEC Bulk Data (Historical Backfill)

**URL**: https://www.fec.gov/data/browse-data/?tab=bulk-data

**Files**:
- `indiv{YY}.txt` - Individual contributions
- `pas2{YY}.txt` - Contributions to candidates from committees
- `cn{YY}.txt` - Candidate master file
- `cm{YY}.txt` - Committee master file

**Format**: Pipe-delimited text files, updated weekly.

**Storage**: Download to S3, process with Lambda or Glue.

### 3. Senate LDA Database (Lobbying)

**API URL**: https://lda.senate.gov/api/

**Endpoints**:
| Endpoint | Purpose |
|----------|---------|
| `/v1/registrations/` | Lobbyist registrations |
| `/v1/filings/` | Quarterly activity reports |
| `/v1/lobbyists/` | Individual lobbyists |
| `/v1/clients/` | Lobbying clients |

**No API key required**. Rate limit: Be respectful (~1 req/sec).

**Key Data Points**:
- Registrant (lobbying firm)
- Client (who's paying)
- Issue areas (general issue codes)
- Specific lobbying issues (text description)
- Income/expenses
- Covered officials contacted

---

## Database Schema

### Staging Tables

```sql
-- Raw contributions from FEC
CREATE TABLE finance.raw_contributions (
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
    ingested_at TIMESTAMP DEFAULT NOW(),
    classified BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_raw_contributions_unclassified 
ON finance.raw_contributions (classified) WHERE classified = FALSE;

CREATE INDEX idx_raw_contributions_candidate 
ON finance.raw_contributions (candidate_id, cycle);

-- Raw lobbying registrations
CREATE TABLE finance.raw_lobbying_registrations (
    id BIGSERIAL PRIMARY KEY,
    registration_id VARCHAR(36) UNIQUE NOT NULL,
    registrant_name VARCHAR(200),
    registrant_id VARCHAR(36),
    client_name VARCHAR(200),
    client_id VARCHAR(36),
    effective_date DATE,
    general_issue_codes TEXT[], -- Array of issue area codes
    specific_issues TEXT,
    ingested_at TIMESTAMP DEFAULT NOW()
);

-- Raw lobbying quarterly reports
CREATE TABLE finance.raw_lobbying_reports (
    id BIGSERIAL PRIMARY KEY,
    filing_id VARCHAR(36) UNIQUE NOT NULL,
    registration_id VARCHAR(36) REFERENCES finance.raw_lobbying_registrations(registration_id),
    filing_year SMALLINT,
    filing_period VARCHAR(10), -- Q1, Q2, Q3, Q4, MID-YEAR, YEAR-END
    income DECIMAL(14,2),
    expenses DECIMAL(14,2),
    lobbyists JSONB, -- Array of lobbyist objects
    covered_officials JSONB, -- Officials contacted
    ingested_at TIMESTAMP DEFAULT NOW()
);
```

### Classified/Aggregated Tables

```sql
-- Contributions with AI-assigned industry codes
CREATE TABLE finance.classified_contributions (
    id BIGSERIAL PRIMARY KEY,
    raw_contribution_id BIGINT REFERENCES finance.raw_contributions(id),
    industry_code VARCHAR(10) NOT NULL,
    industry_name VARCHAR(100) NOT NULL,
    sector_code VARCHAR(5) NOT NULL,
    sector_name VARCHAR(50) NOT NULL,
    classification_confidence DECIMAL(3,2), -- 0.00 to 1.00
    classified_at TIMESTAMP DEFAULT NOW(),
    classifier_version VARCHAR(20) DEFAULT 'v1.0'
);

CREATE INDEX idx_classified_industry 
ON finance.classified_contributions (industry_code);

-- Aggregated totals per member per industry per cycle
CREATE TABLE finance.member_industry_totals (
    id BIGSERIAL PRIMARY KEY,
    member_id UUID REFERENCES members.members(id),
    bioguide_id VARCHAR(10) NOT NULL,
    industry_code VARCHAR(10) NOT NULL,
    industry_name VARCHAR(100) NOT NULL,
    sector_code VARCHAR(5) NOT NULL,
    cycle SMALLINT NOT NULL,
    total_amount DECIMAL(14,2) NOT NULL,
    contribution_count INT NOT NULL,
    avg_contribution DECIMAL(10,2),
    pct_of_total DECIMAL(5,2), -- % of member's total fundraising
    chamber_percentile SMALLINT, -- 0-100 rank within chamber
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (bioguide_id, industry_code, cycle)
);

-- Top donors per member
CREATE TABLE finance.member_top_donors (
    id BIGSERIAL PRIMARY KEY,
    member_id UUID REFERENCES members.members(id),
    bioguide_id VARCHAR(10) NOT NULL,
    cycle SMALLINT NOT NULL,
    donor_name VARCHAR(200) NOT NULL,
    donor_employer VARCHAR(200),
    industry_code VARCHAR(10),
    total_amount DECIMAL(12,2) NOT NULL,
    contribution_count INT,
    rank SMALLINT, -- 1 = top donor
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Summary stats per member
CREATE TABLE finance.member_funding_summary (
    id BIGSERIAL PRIMARY KEY,
    member_id UUID REFERENCES members.members(id),
    bioguide_id VARCHAR(10) NOT NULL,
    cycle SMALLINT NOT NULL,
    total_raised DECIMAL(14,2),
    total_individual DECIMAL(14,2),
    total_pac DECIMAL(14,2),
    total_self_funded DECIMAL(14,2),
    pct_small_donor DECIMAL(5,2), -- Under $200
    pct_large_donor DECIMAL(5,2), -- $200+
    pct_in_state DECIMAL(5,2),
    pct_out_of_state DECIMAL(5,2),
    top_industry_code VARCHAR(10),
    top_industry_pct DECIMAL(5,2),
    industry_concentration_hhi INT, -- Herfindahl index
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (bioguide_id, cycle)
);
```

---

## AI Industry Classification

### Overview

Since OpenSecrets API is no longer available, we use Claude to classify donors by industry based on their employer and occupation fields.

### Classification Lambda

**Function**: `finance-classify-donors`
**Runtime**: Python 3.11
**Memory**: 512 MB
**Timeout**: 5 minutes
**Trigger**: EventBridge schedule (every 6 hours) or SQS queue

### Batching Strategy

- Fetch 500 unclassified contributions per invocation
- Send to Claude in batches of 50 donors
- Process 10 batches per Lambda invocation
- Cost: ~$0.01-0.02 per 50 donors (Haiku)

### Classification Prompt

See `INDUSTRY_CLASSIFICATION_PROMPT.md` for the full prompt template.

### Confidence Thresholds

| Confidence | Action |
|------------|--------|
| >= 0.85 | Accept classification |
| 0.60 - 0.84 | Accept with flag for review |
| < 0.60 | Queue for manual review |

### Caching Strategy

To minimize API costs, cache classifications:

```sql
-- Cache table for employer/occupation → industry mapping
CREATE TABLE finance.classification_cache (
    id BIGSERIAL PRIMARY KEY,
    employer_normalized VARCHAR(200),
    occupation_normalized VARCHAR(100),
    industry_code VARCHAR(10) NOT NULL,
    sector_code VARCHAR(5) NOT NULL,
    confidence DECIMAL(3,2),
    hit_count INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (employer_normalized, occupation_normalized)
);

CREATE INDEX idx_classification_cache_lookup 
ON finance.classification_cache (employer_normalized, occupation_normalized);
```

**Normalization Rules**:
1. Uppercase
2. Remove punctuation
3. Remove common suffixes (INC, LLC, CORP, CO, LTD)
4. Trim whitespace

**Cache Hit Rate Target**: 70%+ after initial training period.

---

## Ingestion Schedules

| Pipeline | Schedule | Data Source | Volume |
|----------|----------|-------------|--------|
| Daily contributions | Every 6 hours | OpenFEC API | ~5K-20K records/day during cycle |
| Bulk historical | Weekly (Sunday 2am) | FEC bulk files | Full refresh |
| Lobbying registrations | Daily | Senate LDA | ~50-200/day |
| Lobbying reports | Quarterly + 7 days | Senate LDA | ~15K/quarter |
| AI classification | Every 6 hours | Internal | Backlog processing |
| Aggregation refresh | Daily (4am) | Internal | Full recalc |

---

## ID Resolution

### FEC Candidate ID → Bioguide ID

The FEC uses its own candidate IDs (e.g., `H0TX22107`). We need to map these to Congress.gov bioguide IDs.

**Strategy**:
1. **Primary**: Use Congress.gov API to search by name + state + district
2. **Fallback**: FEC bulk file `cn.txt` contains bioguide_id for many candidates
3. **Manual**: Maintain override table for edge cases

```sql
CREATE TABLE finance.id_crosswalk (
    id SERIAL PRIMARY KEY,
    fec_candidate_id VARCHAR(9) UNIQUE NOT NULL,
    bioguide_id VARCHAR(10),
    member_id UUID REFERENCES members.members(id),
    confidence VARCHAR(10), -- 'exact', 'fuzzy', 'manual'
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Committee → Candidate Resolution

PAC contributions flow through committees. Map committees to candidates:

```python
# Get candidate's principal campaign committee
GET /candidates/{candidate_id}/?fields=principal_committees

# Then fetch contributions to that committee
GET /schedules/schedule_a/?committee_id={committee_id}
```

---

## Aggregation Queries

### Member Industry Totals

```sql
INSERT INTO finance.member_industry_totals 
    (bioguide_id, industry_code, industry_name, sector_code, cycle, 
     total_amount, contribution_count, avg_contribution)
SELECT 
    cw.bioguide_id,
    cc.industry_code,
    cc.industry_name,
    cc.sector_code,
    rc.cycle,
    SUM(rc.contribution_amount) as total_amount,
    COUNT(*) as contribution_count,
    AVG(rc.contribution_amount) as avg_contribution
FROM finance.raw_contributions rc
JOIN finance.classified_contributions cc ON rc.id = cc.raw_contribution_id
JOIN finance.id_crosswalk cw ON rc.candidate_id = cw.fec_candidate_id
WHERE rc.contribution_amount > 0
GROUP BY cw.bioguide_id, cc.industry_code, cc.industry_name, cc.sector_code, rc.cycle
ON CONFLICT (bioguide_id, industry_code, cycle) 
DO UPDATE SET
    total_amount = EXCLUDED.total_amount,
    contribution_count = EXCLUDED.contribution_count,
    avg_contribution = EXCLUDED.avg_contribution,
    updated_at = NOW();
```

### Chamber Percentile Ranking

```sql
UPDATE finance.member_industry_totals mit
SET chamber_percentile = sub.percentile
FROM (
    SELECT 
        id,
        NTILE(100) OVER (
            PARTITION BY industry_code, cycle 
            ORDER BY total_amount
        ) as percentile
    FROM finance.member_industry_totals
    WHERE bioguide_id IN (
        SELECT bioguide_id FROM members.members 
        WHERE chamber = 'house' AND current = TRUE
    )
) sub
WHERE mit.id = sub.id;
```

### Industry Concentration (HHI)

```sql
-- Herfindahl-Hirschman Index for funding concentration
UPDATE finance.member_funding_summary mfs
SET industry_concentration_hhi = sub.hhi
FROM (
    SELECT 
        bioguide_id,
        cycle,
        SUM(POWER(pct_of_total, 2))::INT as hhi
    FROM finance.member_industry_totals
    GROUP BY bioguide_id, cycle
) sub
WHERE mfs.bioguide_id = sub.bioguide_id 
  AND mfs.cycle = sub.cycle;

-- HHI interpretation:
-- < 1500: Diversified funding
-- 1500-2500: Moderate concentration  
-- > 2500: Highly concentrated
```

---

## Error Handling

### FEC API Errors

| Error | Response | Retry Strategy |
|-------|----------|----------------|
| 429 Rate Limited | Wait + retry | Exponential backoff (1, 2, 4, 8 min) |
| 500 Server Error | Log + retry | 3 attempts, then skip batch |
| 400 Bad Request | Log + skip | Don't retry, investigate |
| Timeout | Retry | Reduce page size, retry 2x |

### Classification Errors

- **Claude API failure**: Queue for retry, continue with next batch
- **Invalid JSON response**: Log full response, retry once
- **Low confidence batch**: Flag entire batch for review

### Data Quality Checks

Run daily:

```sql
-- Check for unclassified contributions older than 7 days
SELECT COUNT(*) FROM finance.raw_contributions 
WHERE classified = FALSE AND ingested_at < NOW() - INTERVAL '7 days';

-- Check for missing bioguide mappings
SELECT candidate_id, COUNT(*) 
FROM finance.raw_contributions rc
LEFT JOIN finance.id_crosswalk cw ON rc.candidate_id = cw.fec_candidate_id
WHERE cw.bioguide_id IS NULL
GROUP BY candidate_id
ORDER BY COUNT(*) DESC
LIMIT 20;

-- Check classification distribution (should roughly match known patterns)
SELECT sector_code, sector_name, COUNT(*), 
       ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as pct
FROM finance.classified_contributions
GROUP BY sector_code, sector_name
ORDER BY COUNT(*) DESC;
```

---

## Cost Estimates

### Monthly Costs (At Scale)

| Component | Estimate |
|-----------|----------|
| FEC API | Free |
| Senate LDA | Free |
| S3 (bulk files) | $5-10 |
| Lambda (ingestion) | $10-20 |
| Lambda (classification) | $20-40 |
| Claude Haiku (classification) | $50-100 |
| Aurora (storage + compute) | $50-100 |
| **Total** | **$135-270/mo** |

### Cost Optimization

1. **Cache aggressively**: 70% cache hit rate saves ~$35-70/mo
2. **Batch efficiently**: 50 donors/request is optimal for Haiku
3. **Skip obvious cases**: "RETIRED", "NOT EMPLOYED" don't need AI
4. **Incremental processing**: Only classify new contributions

---

## Monitoring & Alerts

### CloudWatch Metrics

- `finance.contributions.ingested` - Daily count
- `finance.contributions.classified` - Daily count  
- `finance.classification.cache_hit_rate` - Target: 70%+
- `finance.classification.avg_confidence` - Target: 0.80+
- `finance.crosswalk.unmapped` - Should decrease over time

### Alerts

- **Critical**: Classification Lambda failing > 3 consecutive runs
- **Warning**: Cache hit rate < 60%
- **Warning**: > 10K unclassified contributions in backlog
- **Info**: New FEC candidate ID without bioguide mapping
