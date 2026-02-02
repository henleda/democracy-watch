# Democracy Watch: Implementation Plan (Phases 1-3)

## Executive Summary

**Vision**: A civic tech platform that correlates congressional voting records against campaign promises and funding data to create transparency around political accountability.

**MVP Goal**: Users can search by zip code, see representatives with deviation scores, party alignment rankings, funding sources, and tracked promises.

| Phase | Duration | Milestone |
|-------|----------|-----------|
| Phase 1 | Weeks 1-3 | Zip search → view reps → see voting records |
| Phase 2 | Weeks 4-5 | Party rebel rankings + funding breakdown |
| Phase 3 | Weeks 6-8 | Promise tracking + deviation scores → **MVP Launch** |

**Key Decisions**:
- Frontend: **Vercel** (domain: democracy.watch)
- Zip mapping: **Census Bureau API**
- Finance scope: **2024 cycle only** (expandable)
- Finance data: **FEC API + AI classification** (OpenSecrets no longer available)
- Industry classification: **Claude Haiku** with caching (~$0.01/50 donors)
- Rate limits: **Queue-based ingestion** (upgrade path to bulk data)
- Branding: **Logo** at `/dw-logo.webp` - Capitol dome with magnifying glass

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         VERCEL                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Next.js 14 (App Router)                     │   │
│  │              democracy.watch                             │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────┼────────────────────────────────────┐
│                      AWS (us-east-1)                            │
│                            │                                    │
│  ┌─────────────────────────▼─────────────────────────────────┐  │
│  │                  API Gateway (REST)                        │  │
│  │                    /api/v1/*                               │  │
│  └─────────────────────────┬─────────────────────────────────┘  │
│                            │                                    │
│  ┌─────────────────────────▼─────────────────────────────────┐  │
│  │                Lambda Functions (VPC)                      │  │
│  │  members │ voting │ rankings │ search │ ingestion │ ai    │  │
│  └─────────────────────────┬─────────────────────────────────┘  │
│                            │                                    │
│  ┌─────────────────────────▼─────────────────────────────────┐  │
│  │         Aurora PostgreSQL Serverless v2 + pgvector        │  │
│  │  Schemas: public│members│voting│platforms│promises│       │  │
│  │           finance│analytics│users                         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │ EventBridge   │  │ Secrets Mgr   │  │ Amazon Bedrock│       │
│  │ (schedulers)  │  │ (API keys)    │  │ (Claude/Titan)│       │
│  └───────────────┘  └───────────────┘  └───────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Reference Documentation

| Document | Purpose |
|----------|---------|
| `/docs/FINANCE_PIPELINE.md` | Full architecture for FEC ingestion + AI classification |
| `/docs/INDUSTRY_TAXONOMY.md` | 17 sectors, 52 industries with codes and SQL seeds |
| `/docs/INDUSTRY_CLASSIFICATION_PROMPT.md` | Claude Haiku prompt template for donor classification |

---

## Phase 1: Foundation (Weeks 1-3)

### Week 1: Infrastructure & Database

#### 1.1 CDK Stacks

**Existing** (already scaffolded in `packages/infrastructure/src/stacks/`):
- `NetworkStack` - VPC, subnets, NAT, security groups
- `DatabaseStack` - Aurora PostgreSQL Serverless v2
- `SecretsStack` - API key placeholders
- `StorageStack` - S3 buckets

**New stacks to create**:

| Stack | File | Resources |
|-------|------|-----------|
| `ApiStack` | `api-stack.ts` | API Gateway REST API, Lambda handlers |
| `IngestionStack` | `ingestion-stack.ts` | Ingestion Lambda, EventBridge rule, SQS DLQ |

#### 1.2 Database Package

**Location**: `packages/database/`

```
packages/database/
├── package.json
├── tsconfig.json
├── src/
│   ├── migrations/
│   │   ├── 001_extensions.sql
│   │   ├── 002_public_schema.sql
│   │   ├── 003_members_schema.sql
│   │   └── 004_voting_schema.sql
│   ├── seeds/
│   │   ├── states.sql
│   │   └── policy_areas.sql
│   └── migrate.ts
```

**Migration 001**: Enable pgvector and pg_trgm extensions
**Migration 002**: Create `public` schema (states, policy_areas, zip_districts)
**Migration 003**: Create `members` schema (members, committees, committee_memberships)
**Migration 004**: Create `voting` schema (bills, roll_calls, votes, bill_embeddings)

**Seed Data**:
- 50 states + DC + territories
- ~40 policy areas from Congress.gov taxonomy
- Zip-to-district mapping via Census Bureau geocoder

#### 1.3 Deployment Sequence

```bash
# 1. Deploy infrastructure
cdk deploy DemocracyWatch-dev-Network
cdk deploy DemocracyWatch-dev-Secrets
cdk deploy DemocracyWatch-dev-Storage
cdk deploy DemocracyWatch-dev-Database

# 2. Add API key to Secrets Manager
aws secretsmanager put-secret-value \
  --secret-id democracy-watch/dev/congress-api-key \
  --secret-string '{"apiKey":"YOUR_KEY"}'

# 3. Run migrations
pnpm --filter @democracy-watch/database migrate

# 4. Run seeds
pnpm --filter @democracy-watch/database seed

# 5. Deploy remaining stacks
cdk deploy DemocracyWatch-dev-Ingestion
cdk deploy DemocracyWatch-dev-Api
```

---

### Week 2: Data Ingestion

#### 2.1 Shared Package

**Location**: `packages/shared/`

```
packages/shared/src/
├── types/
│   ├── member.ts      # Member, Committee interfaces
│   ├── bill.ts        # Bill, RollCall interfaces
│   ├── vote.ts        # Vote interface
│   └── api.ts         # ApiResponse, PaginatedResult
├── utils/
│   ├── database.ts    # Connection pooling, query helpers
│   ├── secrets.ts     # Secrets Manager client
│   └── logger.ts      # Structured logging (pino)
└── index.ts
```

#### 2.2 Ingestion Package

**Location**: `packages/ingestion/`

```
packages/ingestion/src/
├── congress/
│   ├── client.ts      # Congress.gov API client
│   ├── members.ts     # Member ingestion logic
│   ├── bills.ts       # Bill ingestion logic
│   ├── votes.ts       # Vote ingestion logic
│   └── types.ts       # API response types
├── handlers/
│   └── ingest-congress.ts  # Lambda handler
└── index.ts
```

**Congress.gov Client Features**:
- Rate limiting: 5000 requests/hour (~0.72s between requests)
- Pagination handling for large result sets
- Retry with exponential backoff
- Raw response archival to S3

**Data Volumes**:
| Entity | Count (118th Congress) |
|--------|------------------------|
| Members | 535 |
| Committees | ~200 |
| Bills | ~15,000 |
| Roll Calls | ~500 |
| Individual Votes | ~260,000 |

#### 2.3 EventBridge Schedule

- **Frequency**: Every 4 hours (`rate(4 hours)`)
- **Mode**: Incremental (only changes since last run)
- **Full refresh**: Manual trigger with `{ "mode": "full" }`

---

### Week 3: API & Frontend

#### 3.1 API Package

**Location**: `packages/api/`

```
packages/api/src/
├── handlers/
│   └── members.ts     # listMembers, getMember, getMembersByZip
├── services/
│   └── member-service.ts
├── middleware/
│   ├── cors.ts
│   └── error-handler.ts
└── utils/
    └── response.ts    # createResponse, createErrorResponse
```

**Phase 1 Endpoints**:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/members` | Paginated list with filters (state, party, chamber) |
| GET | `/members/{memberId}` | Member detail |
| GET | `/members/by-zip/{zipCode}` | 3 representatives for zip code |

**Response Format**:
```json
{
  "data": { ... },
  "meta": {
    "total": 535,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

#### 3.2 Frontend Package

**Location**: `packages/web/`

```
packages/web/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Home with zip search
│   ├── members/
│   │   ├── page.tsx                # Member list
│   │   └── [memberId]/page.tsx     # Member detail
│   └── zip/
│       └── [zipCode]/page.tsx      # Zip results
├── components/
│   ├── ui/                         # shadcn/ui
│   ├── home/
│   │   └── zip-search.tsx
│   └── member/
│       ├── member-card.tsx
│       └── member-list.tsx
└── lib/
    └── api-client.ts
```

**Tech Stack**:
- Next.js 14 (App Router)
- Tailwind CSS
- shadcn/ui components
- TanStack Query (client-side data fetching)

**Branding**:
- Logo: `/dw-logo.webp` → copy to `/packages/web/public/logo.webp`
- Brand colors: Navy blue (#1e3a5f), Red (#dc2626), Gold (#f59e0b)
- Tagline: "They Work For You"
- Logo features: Capitol dome with magnifying glass, bar chart, dollar sign

#### 3.3 Vercel Deployment

1. Connect GitHub repo to Vercel
2. Set root directory: `packages/web`
3. Environment variable: `NEXT_PUBLIC_API_URL`
4. Custom domains: `democracy.watch`, `dev.democracy.watch`

**CORS Configuration** (ApiStack):
```typescript
allowOrigins: [
  'https://democracy.watch',
  'https://dev.democracy.watch',
  'http://localhost:3000'
]
```

#### Phase 1 Verification Checklist

- [ ] All CDK stacks deploy successfully
- [ ] pgvector extension enabled: `SELECT * FROM pg_extension WHERE extname = 'vector'`
- [ ] 535 members in database
- [ ] `GET /members` returns paginated list
- [ ] `GET /members/by-zip/75201` returns 3 representatives
- [ ] Zip search works on democracy.watch
- [ ] Member detail shows voting record

---

## Phase 2: Platforms & Finance (Weeks 4-5)

### Week 4: Party Platforms & AI Infrastructure

#### 4.1 Database Migration

**File**: `packages/database/src/migrations/005_platforms_schema.sql`

Creates:
- `platforms.platforms` - Party platform documents (GOP 2024, DNC 2024)
- `platforms.planks` - Individual policy positions with embeddings

#### 4.2 AiStack

**File**: `packages/infrastructure/src/stacks/ai-stack.ts`

Resources:
- Bedrock IAM permissions for Claude (Haiku/Sonnet) and Titan models
- Lambda for embedding generation
- Lambda for platform alignment analysis
- Lambda for donor industry classification (new)

#### 4.3 AI Package

**Location**: `packages/ai/`

```
packages/ai/src/
├── platforms/
│   └── parse-platform.ts    # Extract planks using Claude Sonnet
├── embeddings/
│   └── embed-planks.ts      # Generate Titan embeddings
├── alignment/
│   └── analyze-alignment.ts  # Vote-plank alignment scoring
└── finance/
    └── classify-donors.ts    # AI industry classification (new)
```

**Platform Processing Pipeline**:
1. Load 2024 platform PDFs to S3
2. Parse into planks using Claude Sonnet (~$10-15 one-time)
3. Generate 1024-dim embeddings using Titan (~$5)
4. Store in `platforms.planks` with HNSW index

#### 4.4 Platform Alignment Calculation

For each member vote:
1. Find semantically similar planks (cosine similarity > 0.7)
2. Use Claude Haiku to determine alignment
3. Store in `analytics.platform_alignments`
4. Aggregate to `members.party_alignment_score`

---

### Week 5: Campaign Finance (AI-Powered Classification)

> **Note**: OpenSecrets API is no longer available. We use AI-powered industry classification via Claude Haiku as a replacement. See `docs/FINANCE_PIPELINE.md` for full architecture.

#### 5.1 Database Migration

**File**: `packages/database/src/migrations/006_finance_schema.sql`

Creates:

**Reference Tables**:
- `finance.ref_sectors` - 17 industry sectors (TECH, HLTH, FNCE, etc.)
- `finance.ref_industries` - 52 specific industries (TECH01, HLTH03, etc.)
- `finance.id_crosswalk` - FEC candidate ID → bioguide_id mapping

**Staging Tables**:
- `finance.raw_contributions` - Raw FEC Schedule A data
- `finance.raw_lobbying_registrations` - Senate LDA registrations
- `finance.raw_lobbying_reports` - Quarterly lobbying reports

**Classification Tables**:
- `finance.classification_cache` - Employer/occupation → industry mapping cache
- `finance.classified_contributions` - Contributions with AI-assigned industry codes

**Aggregation Tables**:
- `finance.member_industry_totals` - Aggregated totals per member/industry/cycle
- `finance.member_top_donors` - Top 10 donors per member
- `finance.member_funding_summary` - Summary stats (total raised, small donor %, etc.)

See `docs/INDUSTRY_TAXONOMY.md` for the complete sector/industry hierarchy.

#### 5.2 External Data Sources

| Source | Rate Limit | Data |
|--------|------------|------|
| FEC OpenFEC API | 1000/hr | Real-time contributions |
| FEC Bulk Downloads | Weekly | Historical backfill |
| Senate LDA Database | Respectful (~1 req/sec) | Lobbying data |

**Files**:
- `packages/ingestion/src/fec/fec-client.ts` - OpenFEC API client
- `packages/ingestion/src/fec/bulk-loader.ts` - Bulk file processor
- `packages/ingestion/src/lobbying/lda-client.ts` - Senate LDA client

#### 5.3 AI Industry Classification Pipeline

**File**: `packages/ai/src/finance/classify-donors.ts`

See `docs/INDUSTRY_CLASSIFICATION_PROMPT.md` for the full prompt template.

**Pipeline**:
1. **Pre-classification rules** - Skip obvious cases (RETIRED, NOT EMPLOYED, STUDENT)
2. **Cache lookup** - Check `classification_cache` for employer/occupation match
3. **AI classification** - Send uncached donors to Claude Haiku in batches of 50
4. **Cache update** - Store new classifications for future lookups

**Cost Optimization**:
- Pre-rules handle ~15% of donors (free)
- Cache achieves 70%+ hit rate after training period
- Haiku costs ~$0.01-0.02 per 50 donors

#### 5.4 Ingestion Lambdas

| Lambda | Trigger | Purpose |
|--------|---------|---------|
| `finance-ingest-contributions` | EventBridge (6hr) | Fetch new FEC contributions |
| `finance-ingest-lobbying` | EventBridge (daily) | Fetch Senate LDA data |
| `finance-classify-donors` | EventBridge (6hr) | Classify unprocessed contributions |
| `finance-aggregate` | EventBridge (daily 4am) | Refresh aggregation tables |

**Scope**: 2024 election cycle only (expandable to more cycles later)

#### 5.5 Analytics Package

**Location**: `packages/analytics/`

```
packages/analytics/src/
├── finance/
│   ├── calculate-industry-totals.ts   # Aggregate by industry
│   ├── calculate-rankings.ts          # Chamber percentiles
│   └── calculate-hhi.ts               # Funding concentration index
└── platform/
    └── calculate-alignment.ts
```

#### 5.6 API Additions

| Method | Path | Description |
|--------|------|-------------|
| GET | `/rankings` | Ranked lists (party_alignment, funding_concentration) |
| GET | `/members/{id}/funding` | Industry breakdown + top donors |
| GET | `/members/{id}/platform-alignment` | Alignment details |

#### 5.7 Frontend Additions

**Components**:
- `FundingBreakdown.tsx` - Top 5 industries bar chart (using our taxonomy)
- `TopDonors.tsx` - Top 10 donors list
- `FundingSummary.tsx` - Total raised, small/large donor %, in/out-of-state
- `PlatformAlignmentTab.tsx` - Score + misaligned votes

**Pages**:
- `/rankings` - Party rebel leaderboard + funding concentration rankings

#### Phase 2 Verification Checklist

- [ ] Both party platforms parsed into 50+ planks each
- [ ] All planks have 1024-dim embeddings
- [ ] Platform alignment scores calculated for all members
- [ ] `/rankings?type=party_alignment` returns data
- [ ] Finance schema migrated with all staging/classification tables
- [ ] Industry taxonomy seeded (17 sectors, 52 industries)
- [ ] FEC contributions loaded for 100+ members
- [ ] AI classification running with 70%+ cache hit rate
- [ ] `member_industry_totals` populated
- [ ] Funding breakdown visible on member detail pages

---

## Phase 3: Promises & MVP Launch (Weeks 6-8)

### Week 6: Promise Infrastructure

#### 6.1 Database Migration

**File**: `packages/database/src/migrations/007_promises_schema.sql`

Creates:
- `promises.sources` - Content sources (YouTube, C-SPAN, interviews)
- `promises.promises` - Extracted promises with embeddings

Key fields:
- `statement` - The promise text
- `policy_area_id` - Categorization
- `embedding` - 1024-dim vector for semantic matching
- `review_status` - 'pending', 'approved', 'rejected'
- `confidence` - AI extraction confidence score

#### 6.2 Admin Interface

**Location**: `packages/web/app/admin/`

Simple protected interface for manual promise entry:
- Search/select member
- Enter promise statement
- Select policy area
- Set source URL and date
- Submit for embedding generation

**Authentication**: Cognito with admin user pool group

#### 6.3 Target Members for Initial Curation

Focus on 50 members for MVP launch:

| State | Focus | Rationale |
|-------|-------|-----------|
| TX | House Republicans | Large delegation, swing potential |
| FL | House Republicans | High national visibility |
| PA | House members | Key swing state |
| MI | House members | Key swing state |
| AZ | House Republicans | Competitive districts |

**Goal**: 10-20 promises per member = 500-1000 total promises

#### 6.4 Promise Embedding Generation

Lambda triggered on promise creation:
1. Generate Titan embedding for statement
2. Store in `promises.promises.embedding`
3. Index via HNSW for fast similarity search

---

### Week 7: Deviation Analysis

#### 7.1 Database Migration

**File**: `packages/database/src/migrations/008_analytics_schema.sql`

Creates:
- `analytics.deviations` - Promise-vote mismatches
- `analytics.funding_correlations` - Vote-funding patterns
- `analytics.platform_alignments` - Vote-plank alignment (if not created in Phase 2)
- `analytics.member_rankings` - Aggregated scores and ranks

#### 7.2 Semantic Matching Pipeline

**File**: `packages/ai/src/deviations/match-promises-votes.ts`

Algorithm:
1. For each new vote by a member with promises:
   a. Get bill embedding (or generate if missing)
   b. Vector search for similar promises (cosine > 0.7)
   c. Filter to same policy area for precision
2. Queue matched pairs for alignment analysis

#### 7.3 AI Alignment Analysis

**File**: `packages/ai/src/deviations/analyze-alignment.ts`

For each promise-vote pair:
```
Promise: "{promise_statement}"
Bill: {bill_title}
Summary: {bill_summary}
Vote: {Yea/Nay}

Determine:
1. alignment_score: -1 (contradicts), 0 (unrelated), 1 (aligns)
2. confidence: 0-1
3. explanation: 1-2 sentence reasoning
4. is_significant: Would a voter care about this?
```

**Model**: Claude Haiku for cost efficiency (~$0.25/1M input tokens)

#### 7.4 Deviation Score Calculation

**File**: `packages/analytics/src/deviations/calculate-scores.ts`

```sql
deviation_score =
  (contradicting_votes * -1 + aligned_votes * 1) / total_matched_votes * 100

-- Scale: -100 (always contradicts) to +100 (always aligns)
-- 0 = neutral or no data
```

---

### Week 8: Rankings & Launch

#### 8.1 Member Rankings Calculation

**File**: `packages/analytics/src/rankings/calculate-rankings.ts`

Scheduled Lambda (hourly via EventBridge):
1. Calculate deviation scores for all members
2. Calculate party alignment scores
3. Compute combined accountability score
4. Update ranks (deviation_rank, party_alignment_rank, accountability_rank)
5. Denormalize key metrics to `members.members` for fast queries

#### 8.2 Ranking Types

| Type | Description | Sort |
|------|-------------|------|
| `deviation` | Promise-vote consistency | Low score = more contradictions |
| `party_alignment` | Votes vs party platform | Low score = more rebellion |
| `funding_correlation` | Suspicious vote-funding patterns | High = more flagged |
| `accountability` | Combined weighted score | Low = worse accountability |

#### 8.3 Frontend: Rankings Page

**File**: `packages/web/app/rankings/page.tsx`

Features:
- Tab navigation between ranking types
- Filter by party, state, chamber
- Paginated list with key metrics
- Click-through to member detail

#### 8.4 Frontend: Home Page Updates

**Components**:
- `TopDeviators.tsx` - Top 10 worst deviation scores
- `PartyRebels.tsx` - Top 5 from each party
- `RecentDeviations.tsx` - Latest flagged mismatches

#### 8.5 Soft Launch

**Beta user criteria**:
- Journalists covering Congress
- Civic tech community members
- Political science researchers

**Feedback channels**:
- In-app feedback widget
- Discord community
- GitHub issues

#### Phase 3 Verification Checklist

- [ ] Promises schema migrated
- [ ] Admin interface working (add/edit promises)
- [ ] 500+ promises entered for 50 target members
- [ ] All promises have embeddings
- [ ] Analytics schema migrated
- [ ] Semantic matching pipeline running
- [ ] Deviation scores calculated
- [ ] `/rankings?type=deviation` returns data
- [ ] Top deviators visible on home page
- [ ] Member detail shows promise-vote analysis
- [ ] Rankings page fully functional
- [ ] Beta users can access and provide feedback

---

## Complete File Structure

```
packages/
├── infrastructure/                 # CDK stacks
│   └── src/stacks/
│       ├── network-stack.ts        ✓ Phase 1
│       ├── database-stack.ts       ✓ Phase 1
│       ├── secrets-stack.ts        ✓ Phase 1
│       ├── storage-stack.ts        ✓ Phase 1
│       ├── api-stack.ts            ○ Phase 1
│       ├── ingestion-stack.ts      ○ Phase 1
│       └── ai-stack.ts             ○ Phase 2
│
├── database/                       # Migrations & seeds
│   └── src/migrations/
│       ├── 001_extensions.sql      ○ Phase 1
│       ├── 002_public_schema.sql   ○ Phase 1
│       ├── 003_members_schema.sql  ○ Phase 1
│       ├── 004_voting_schema.sql   ○ Phase 1
│       ├── 005_platforms.sql       ○ Phase 2
│       ├── 006_finance.sql         ○ Phase 2 (includes AI classification tables)
│       ├── 007_promises.sql        ○ Phase 3
│       └── 008_analytics.sql       ○ Phase 3
│
├── shared/                         # Types & utilities
│   └── src/
│       ├── types/                  ○ Phase 1
│       └── utils/                  ○ Phase 1
│
├── ingestion/                      # Data ingestion
│   └── src/
│       ├── congress/               ○ Phase 1
│       ├── fec/                    ○ Phase 2
│       │   ├── fec-client.ts       # OpenFEC API client
│       │   └── bulk-loader.ts      # FEC bulk file processor
│       └── lobbying/               ○ Phase 2
│           └── lda-client.ts       # Senate LDA client
│
├── api/                            # REST API
│   └── src/handlers/
│       ├── members.ts              ○ Phase 1
│       ├── rankings.ts             ○ Phase 2
│       └── search.ts               ○ Phase 3
│
├── ai/                             # Bedrock AI
│   └── src/
│       ├── platforms/              ○ Phase 2
│       │   └── parse-platform.ts   # Claude Sonnet plank extraction
│       ├── embeddings/             ○ Phase 2
│       │   └── embed-planks.ts     # Titan embeddings
│       ├── alignment/              ○ Phase 2
│       │   └── analyze-alignment.ts
│       ├── finance/                ○ Phase 2 (NEW)
│       │   ├── classify-donors.ts  # Claude Haiku classification
│       │   ├── taxonomy.ts         # Industry codes/names
│       │   └── pre-rules.ts        # RETIRED/NOT EMPLOYED rules
│       └── deviations/             ○ Phase 3
│
├── analytics/                      # Score calculations
│   └── src/
│       ├── finance/                ○ Phase 2
│       ├── platform/               ○ Phase 2
│       ├── deviations/             ○ Phase 3
│       └── rankings/               ○ Phase 3
│
└── web/                            # Next.js frontend
    └── app/
        ├── page.tsx                ○ Phase 1
        ├── members/                ○ Phase 1
        ├── zip/                    ○ Phase 1
        ├── rankings/               ○ Phase 2
        └── admin/                  ○ Phase 3
```

---

## Cost Estimates

### Development Environment (Monthly)

| Service | Cost |
|---------|------|
| Aurora Serverless (0.5-2 ACU) | $50-100 |
| Lambda invocations | $10-20 |
| API Gateway | $5 |
| S3 storage (incl. FEC bulk files) | $5-10 |
| NAT Gateway | $35 |
| **Subtotal AWS Infra** | **~$105-170** |
| Vercel (free tier) | $0 |
| **Subtotal Hosting** | **~$105-170/month** |

### Recurring AI Costs (Monthly)

| Task | Cost |
|------|------|
| Donor classification (Claude Haiku) | $50-100 |
| Alignment analysis (Claude Haiku) | $20-40 |
| Embeddings (Titan) | $5-10 |
| **Subtotal AI** | **~$75-150/month** |

### One-Time AI Costs

| Task | Cost |
|------|------|
| Platform parsing (Claude Sonnet) | $10-15 |
| Plank embeddings (Titan) | $5 |
| Promise embeddings (Titan) | $10-20 |
| Initial donor classification backlog | $50-100 |
| **Total** | **~$75-140** |

### Total Monthly (At Scale)

| Category | Cost |
|----------|------|
| AWS Infrastructure | $105-170 |
| AI/ML (Bedrock) | $75-150 |
| **Total** | **~$180-320/month** |

**Cost Optimization Strategies**:
1. **Classification cache** - 70%+ hit rate saves $35-70/mo on Haiku
2. **Pre-classification rules** - Skip RETIRED/NOT EMPLOYED (~15% of donors)
3. **Batch efficiently** - 50 donors/request is optimal for Haiku
4. **Aurora auto-pause** - 0 ACU when idle (dev only)

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Congress.gov rate limits (5000/hr) | Rate limiter + S3 response caching |
| FEC API rate limits (1000/hr) | SQS queue + exponential backoff |
| Census API downtime | Cache zip→district mappings locally |
| Aurora cold starts | Provisioned capacity for production |
| Vercel↔AWS latency | API Gateway edge-optimized endpoints |
| Promise quality variance | Human review workflow before approval |
| AI hallucinations | Confidence scoring + human review for flagged items |
| Donor classification accuracy | Pre-rules for obvious cases + 0.85 confidence threshold |
| Classification cost overrun | Aggressive caching (70%+ hit rate target) |
| FEC→bioguide ID mapping gaps | Fuzzy matching + manual override table |
| AI JSON parse failures | Retry once, flag for manual review if still failing |

---

## Success Criteria (MVP)

### Functional Requirements
- [ ] User enters zip code → sees 3 representatives
- [ ] Each rep shows deviation score, party alignment, top funding sources
- [ ] User can view tracked promises and vote alignment
- [ ] Rankings page shows top deviators and party rebels
- [ ] Data updates every 4 hours from Congress.gov

### Non-Functional Requirements
- [ ] API p95 latency < 500ms
- [ ] Page load time < 3s
- [ ] Mobile responsive design
- [ ] SEO-friendly (SSR for key pages)
- [ ] Accessibility (WCAG 2.1 AA)

### Launch Metrics
- [ ] 50+ members with promise data
- [ ] 500+ promises tracked
- [ ] 100+ deviation analyses completed
- [ ] 10+ beta users providing feedback
