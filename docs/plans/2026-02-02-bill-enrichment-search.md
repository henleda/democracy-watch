# Implementation Plan: Bill Data Enrichment & Search

## Overview

Enhance bill ingestion to capture summaries, sponsors, and subjects from Congress.gov API, then add bill search functionality to the home page. This enables users to understand what votes were actually about.

**Deployment Strategy**: Work on main branch, deploy to prod, run ingestion once on prod (not dev first).

---

## Discovery Findings

### What's Available from Congress.gov API

| Data | Available | Currently Fetched | Stored in DB |
|------|-----------|-------------------|--------------|
| Title, type, number | Yes | Yes | Yes |
| **CRS Summaries** | Yes | No | No |
| **Sponsors** | Yes | No | No |
| **Policy Areas** | Yes | No | No |
| **Subjects** | Yes | No | No |
| **Full Text URLs** | Yes | No | No |
| Introduced date | Yes | No | No |
| Latest action | Yes | Yes | Yes |

### Key Insight: List vs Detail Endpoints

**Current code** only uses the list endpoint (`/bill/{congress}`) which returns minimal data.

**Detail endpoint** (`/bill/{congress}/{type}/{number}`) returns rich data:
- `summaries[]` - CRS legislative analyst summaries
- `sponsors[]` - Sponsor bioguideId for FK linking
- `policyArea` - Primary policy classification
- `subjects.legislativeSubjects[]` - Multiple subject tags
- `textVersions[]` - URLs to full text (HTML/PDF/XML)

### Database Schema Already Prepared

The `voting.bills` table has columns ready but unpopulated:
- `summary TEXT` - For CRS summary
- `sponsor_id UUID` - FK to members
- `primary_policy_area_id INTEGER` - FK to policy_areas
- `full_text_url TEXT` - Link to congress.gov
- `introduced_date DATE`

### Rate Limits & Scope

- **5,000 requests/hour** (1 per 720ms)
- **Scope**: Congress 118 + 119 (both House and Senate)
- ~15,000 bills per Congress = ~30,000 total bills
- Full detail fetch: ~6 hours (using Step Functions chunking)
- Incremental updates much faster

---

## Implementation Plan

### Part 1: Enhance Bill Ingestion

**File:** `packages/ingestion/src/congress/bills.ts`

**Changes:**
1. After list fetch, call detail endpoint for each bill
2. Extract and store: summary, sponsor, policy area, subjects, text URL
3. Add chunking support for Step Functions (like votes)

```typescript
// New function to fetch bill details
async function fetchBillDetails(
  client: CongressApiClient,
  congress: number,
  billType: string,
  billNumber: number
): Promise<CongressBillDetail | null>

// Enhanced upsert with new fields
async function upsertBillWithDetails(bill: CongressBillDetail): Promise<void> {
  // Map sponsor bioguideId to member UUID
  // Store summary text (first/latest summary version)
  // Store congress.gov full text URL
  // Link policy area
}
```

**New fields to populate:**
```sql
UPDATE voting.bills SET
  summary = $1,           -- CRS summary text
  sponsor_id = $2,        -- FK from bioguide_id lookup
  introduced_date = $3,
  full_text_url = $4,     -- https://www.congress.gov/bill/{congress}/{type}/{number}/text
  primary_policy_area_id = $5
WHERE id = $6
```

### Part 2: Update API Client Types

**File:** `packages/ingestion/src/congress/client.ts`

Add/update types for bill detail response:

```typescript
export interface CongressBillDetail extends CongressBill {
  introducedDate: string;
  sponsors: Array<{ bioguideId: string; fullName: string }>;
  policyArea?: { name: string };
  subjects?: { legislativeSubjects: Array<{ name: string }> };
  summaries?: Array<{
    text: string;
    updateDate: string;
    versionCode: string;
  }>;
  textVersions?: Array<{
    type: string;
    url: string;
    formats: Array<{ type: string; url: string }>;
  }>;
}
```

### Part 3: Add Bill Search API Endpoint

**File:** `packages/api/src/bills.ts` (CREATE)

New Lambda handler for bill endpoints:

```typescript
// GET /bills - List/search bills
// Query params: q (search), congress, policyArea, sponsor, limit, offset

// GET /bills/{billId} - Bill detail with vote breakdown
// Returns: bill info + roll calls + vote tallies by party
```

**File:** `packages/api/src/services/bill-service.ts` (CREATE)

```typescript
export class BillService {
  // Full-text search on title + summary
  async search(query: string, options: BillSearchOptions): Promise<PaginatedResponse<Bill>>

  // Get bill with associated votes
  async getById(id: string): Promise<BillDetail | null>

  // List bills with filters
  async list(options: BillListOptions): Promise<PaginatedResponse<Bill>>
}
```

### Part 4: Add Bill Search to Home Page

**File:** `packages/web/src/components/BillSearch.tsx` (CREATE)

New client component similar to ZipSearch:

```tsx
'use client';
export function BillSearch() {
  // Keyword input for bill search
  // Navigates to /bills?q={query}
  // Optional: autocomplete/suggestions
}
```

**File:** `packages/web/src/app/page.tsx` (MODIFY)

Add bill search below ZIP search section.

### Part 5: Create Bills List Page

**File:** `packages/web/src/app/bills/page.tsx` (CREATE)

Server component with search/filter params, BillCard grid, pagination.

**File:** `packages/web/src/components/BillCard.tsx` (CREATE)

Bill card showing title, bill number, sponsor, policy area, status, vote count.

### Part 6: Create Bill Detail Page

**File:** `packages/web/src/app/bills/[billId]/page.tsx` (CREATE)

Server component showing full title, summary, sponsor link, policy area, subjects, congress.gov link, vote breakdown with party charts.

### Part 7: Infrastructure Updates

**File:** `packages/infrastructure/src/stacks/api-stack.ts` (MODIFY)

Add bills Lambda handler and API Gateway routes for `/bills` endpoints.

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `packages/ingestion/src/congress/bills.ts` | MODIFY | Fetch bill details, extract summaries |
| `packages/ingestion/src/congress/client.ts` | MODIFY | Add bill detail types |
| `packages/api/src/bills.ts` | CREATE | Bill API handler |
| `packages/api/src/services/bill-service.ts` | CREATE | Bill business logic |
| `packages/web/src/components/BillSearch.tsx` | CREATE | Search component |
| `packages/web/src/components/BillCard.tsx` | CREATE | Bill list item |
| `packages/web/src/app/page.tsx` | MODIFY | Add bill search |
| `packages/web/src/app/bills/page.tsx` | CREATE | Bills list page |
| `packages/web/src/app/bills/[billId]/page.tsx` | CREATE | Bill detail page |
| `packages/infrastructure/src/stacks/api-stack.ts` | MODIFY | Add bills routes |

---

## Data Strategy

### Full Text: Link, Don't Store

Store URL to congress.gov instead of full text:
```
https://www.congress.gov/bill/119th-congress/house-bill/123/text
```

Benefits:
- No storage costs for large documents
- Always up-to-date
- Users see official formatting
- Reduces DB size significantly

### Summaries: Store for Search

Store CRS summary text (~500-2000 chars) because:
- Enables full-text search
- Can generate embeddings for semantic search
- Provides quick context without external fetch
- Small storage footprint

### Vote-Bill Linking

After enriching bills, re-run vote ingestion to properly link:
- Match `legislationType` + `legislationNumber` from votes to `bill_type` + `bill_number`
- ~80% of roll calls are on bills (rest are nominations, procedural)

---

## Verification

### Step 1: Run Enhanced Bill Ingestion
```bash
aws lambda invoke --function-name democracy-watch-ingest-congress-prod \
  --payload '{"mode":"full","congress":119,"skipMembers":true,"skipVotes":true}' \
  /tmp/output.json
```

### Step 2: Verify Bill Data
```bash
curl "https://api.democracy.watch/v1/bills?limit=3" | jq '.data[0]'
# Should show summary, sponsor, policy area
```

### Step 3: Test Bill Search
```bash
curl "https://api.democracy.watch/v1/bills?q=healthcare" | jq '.meta.total'
```

### Step 4: Test on Website
- Go to https://democracy.watch
- Use bill search on home page
- Click through to bill detail
- Verify "View Full Text" links to congress.gov

### Step 5: Verify Vote-Bill Links
```bash
curl "https://api.democracy.watch/v1/members/W000805/votes?limit=5" | jq '.data[].bill.title'
# Should show actual bill titles, not null
```

---

## Execution Order

1. **Part 2**: Update API client types (dependency for Part 1)
2. **Part 1**: Enhance bill ingestion
3. **Part 3**: Add bill search API
4. **Part 7**: Infrastructure for new endpoints
5. **Part 4-6**: Frontend components and pages
6. Deploy to prod
7. Run bill ingestion on prod (Congress 118 + 119)
8. Re-run vote ingestion to link bills

---

## UI Mockups

### Home Page - Bill Search Section
```
+----------------------------------------------------------+
|  Search Legislation                                       |
|  +------------------------------------+  +----------+     |
|  | Search bills by keyword...        |  |  Search  |     |
|  +------------------------------------+  +----------+     |
|  Examples: "healthcare", "immigration", "H.R. 1234"       |
+----------------------------------------------------------+
```

### Bills List Page (`/bills?q=healthcare`)
```
+----------------------------------------------------------+
|  Results for "healthcare" (127 bills)                     |
|                                                           |
|  Filters: [Congress v] [Chamber v] [Status v]             |
|                                                           |
|  +-----------------------------------------------------+  |
|  | H.R. 3421 - Affordable Healthcare Access Act        |  |
|  | Health - Introduced 2024-03-15                      |  |
|  | Sponsor: Rep. Jane Doe (D-CA)                       |  |
|  | Status: In Committee     [Voted: House Y]           |  |
|  +-----------------------------------------------------+  |
+----------------------------------------------------------+
```

### Bill Detail Page (`/bills/hr-119-3421`)
```
+----------------------------------------------------------+
|  H.R. 3421                                                |
|  Affordable Healthcare Access Act                         |
|                                                           |
|  [Health]  119th Congress  Introduced Mar 15, 2024        |
|                                                           |
|  Sponsor: Rep. Jane Doe (D-CA-12) <- links to member      |
|  Cosponsors: 45 Democrats, 3 Republicans                  |
|                                                           |
|  ----------------------------------------------------------
|  Summary                                                  |
|  This bill establishes new requirements for health        |
|  insurance coverage and expands access to preventive      |
|  care services...                                         |
|                                                           |
|  [View Full Text on Congress.gov]  <- external link       |
|                                                           |
|  ----------------------------------------------------------
|  Voting Record                                            |
|                                                           |
|  House Vote - March 28, 2024                              |
|  Result: PASSED 220-207                                   |
|  +--------------------------------------+                 |
|  | Democrats    ========== 212 Y  | 3 N                  |
|  | Republicans  ==         8 Y    | 204 N                |
|  +--------------------------------------+                 |
|                                                           |
|  [View all 435 individual votes ->]                       |
+----------------------------------------------------------+
```

---

## Bill Data Fields

| Field | Source | Storage |
|-------|--------|---------|
| Title | API | DB |
| Short Title | API | DB |
| Bill Number | API | DB |
| Summary | API (CRS) | DB (for search) |
| Sponsor | API | DB (FK to members) |
| Cosponsors | API | DB (join table) |
| Introduced Date | API | DB |
| Policy Area | API | DB |
| Subjects | API | DB (array) |
| Latest Action | API | DB |
| Full Text | API | Link only (congress.gov) |
| Vote Results | Our data | Calculated |
