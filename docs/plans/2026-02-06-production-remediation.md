# Production Remediation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all issues identified in the production audit, prioritized by severity.

**Architecture:** Backend data fixes first (ingestion + API), then frontend null handling.

**Tech Stack:** TypeScript, PostgreSQL, Lambda, Next.js

---

## All Issues Summary

### Phase 1: Critical & High Priority (This Plan)

| # | Issue | Severity | Component | Task |
|---|-------|----------|-----------|------|
| 1 | Party vote breakdown missing | Critical | Ingestion | 1 |
| 2 | Bill-vote linking broken | Critical | Ingestion | 2 |
| 4 | Member totalVotes always 0 | High | API | 3 |
| 5 | NaN% display in vote bars | High | Frontend | 4 |
| 6 | Static stats on home page | High | API + Frontend | 5-6 |
| 7 | Member website URLs not populated | High | Ingestion | 7 |

### Phase 2: Medium Priority

| # | Issue | Severity | Component | Task |
|---|-------|----------|-----------|------|
| 9 | Rankings page all placeholders | Medium | Frontend | 11 |
| 10 | Member votes missing bill context | Medium | Frontend | 9 |
| 11 | Contributions shows "$B+" | Medium | Frontend | (fixed in 6) |
| 12 | Missing member biographical data | Medium | Future | - |
| 13 | Footer social links broken | Low | Frontend | 12 |

### Phase 3: Data Limitations (No Fix)

| # | Issue | Status |
|---|-------|--------|
| 3 | Bill summaries unavailable | Congress.gov API limitation |
| 8 | Bill subjects not populated | Congress.gov API limitation |
| 14 | Promise tracking placeholder | Expected - Phase 3 roadmap |
| 15 | Campaign finance placeholder | Expected - Phase 2 roadmap |

---

## Task 1: Calculate Party Vote Breakdown During Ingestion

**Files:**
- Modify: `packages/ingestion/src/congress/votes.ts:300-350`
- Modify: `packages/ingestion/src/congress/votes.ts:700-750`

**Context:** Roll calls store `yea_total`/`nay_total` but `republican_yea`, `democrat_yea`, etc. are always NULL because we never calculate them.

**Step 1.1: Add party breakdown calculation helper function**

Add this function after `upsertMemberVotesFromClerk` (around line 432):

```typescript
/**
 * Calculate and update party breakdown for a roll call after member votes are inserted
 */
async function updatePartyBreakdown(
  rollCallId: string,
  chamber: string
): Promise<void> {
  const sql = `
    UPDATE voting.roll_calls rc
    SET
      republican_yea = (
        SELECT COUNT(*) FROM voting.votes v
        JOIN members.members m ON m.id = v.member_id
        WHERE v.roll_call_id = $1 AND v.position = 'Yea' AND m.party = 'Republican'
      ),
      republican_nay = (
        SELECT COUNT(*) FROM voting.votes v
        JOIN members.members m ON m.id = v.member_id
        WHERE v.roll_call_id = $1 AND v.position = 'Nay' AND m.party = 'Republican'
      ),
      democrat_yea = (
        SELECT COUNT(*) FROM voting.votes v
        JOIN members.members m ON m.id = v.member_id
        WHERE v.roll_call_id = $1 AND v.position = 'Yea' AND m.party = 'Democrat'
      ),
      democrat_nay = (
        SELECT COUNT(*) FROM voting.votes v
        JOIN members.members m ON m.id = v.member_id
        WHERE v.roll_call_id = $1 AND v.position = 'Nay' AND m.party = 'Democrat'
      )
    WHERE id = $1
  `;

  await query(sql, [rollCallId]);
}
```

**Step 1.2: Call the helper after House member votes**

In `ingestChamberVotes`, after the `upsertMemberVotesFromClerk` call (around line 150-156), add:

```typescript
// Calculate and store party breakdown
await updatePartyBreakdown(rollCall.id, chamber);
```

But we need the roll call ID. Modify `upsertRollCallFromClerk` to return the ID:

```typescript
async function upsertRollCallFromClerk(
  clerkVote: HouseClerkVote,
  listVote: HouseRollCallVote
): Promise<string> {  // Changed return type
  // ... existing code ...

  // Change the INSERT to return the ID
  const result = await query<{ id: string }>(sql + ' RETURNING id', [
    // ... existing params
  ]);

  return result[0].id;
}
```

Then update the caller (around line 144-156):

```typescript
if (clerkVote) {
  // Upsert roll call with full totals from XML
  const rollCallId = await upsertRollCallFromClerk(clerkVote, vote);
  result.inserted++;

  // Upsert individual member votes
  const memberResult = await upsertMemberVotesFromClerk(
    clerkVote,
    chamber
  );
  result.inserted += memberResult.inserted;
  result.updated += memberResult.updated;
  result.errors += memberResult.errors;

  // Calculate and store party breakdown
  await updatePartyBreakdown(rollCallId, chamber);
  // ... rest of code
}
```

**Step 1.3: Call the helper after Senate member votes**

Similar change in `ingestSenateVotes` (around line 637-644):

Modify `upsertRollCallFromSenate` to return the ID, then call `updatePartyBreakdown` after `upsertMemberVotesFromSenate`.

**Step 1.4: Build and verify**

```bash
cd packages/ingestion && npm run build
```

**Step 1.5: Commit**

```bash
git add packages/ingestion/src/congress/votes.ts
git commit -m "feat: calculate party vote breakdown during vote ingestion"
```

---

## Task 2: Fix Bill-Vote Linking in Individual Votes

**Files:**
- Modify: `packages/ingestion/src/congress/votes.ts:390-403`
- Modify: `packages/ingestion/src/congress/votes.ts:822-835`

**Context:** The `voting.votes` table has a `bill_id` column, but `upsertMemberVotesFromClerk` and `upsertMemberVotesFromSenate` don't populate it. The roll call already has the `bill_id`, we just need to include it in the member vote insert.

**Step 2.1: Update House member vote insert to include bill_id**

In `upsertMemberVotesFromClerk` (around line 390-403), first get the bill_id from the roll call:

```typescript
async function upsertMemberVotesFromClerk(
  clerkVote: HouseClerkVote,
  chamber: string
): Promise<IngestResult> {
  const result: IngestResult = { inserted: 0, updated: 0, errors: 0 };
  let membersNotFound = 0;
  let sampleMissingIds: string[] = [];

  // Get roll call ID and bill_id
  const rollCall = await queryOne<{ id: string; bill_id: string | null }>(
    `SELECT id, bill_id FROM voting.roll_calls WHERE congress = $1 AND chamber = $2 AND roll_call_number = $3`,
    [clerkVote.congress, chamber, clerkVote.rollCallNumber]
  );

  if (!rollCall) {
    logger.error({ rollCallNumber: clerkVote.rollCallNumber }, 'Roll call not found after insert');
    return result;
  }

  const billId = rollCall.bill_id;

  // ... rest of loop ...

  // Update the INSERT to include bill_id
  const sql = `
    INSERT INTO voting.votes (member_id, roll_call_id, position, vote_date, bill_id)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (member_id, roll_call_id)
    DO UPDATE SET position = EXCLUDED.position, bill_id = EXCLUDED.bill_id
    RETURNING (xmax = 0) AS inserted
  `;

  const upsertResult = await query<{ inserted: boolean }>(sql, [
    member.id,
    rollCall.id,
    memberVote.position,
    clerkVote.voteDate,
    billId,  // Add this parameter
  ]);
```

**Step 2.2: Update Senate member vote insert similarly**

In `upsertMemberVotesFromSenate` (around line 765-835), make the same change.

**Step 2.3: Build and verify**

```bash
cd packages/ingestion && npm run build
```

**Step 2.4: Commit**

```bash
git add packages/ingestion/src/congress/votes.ts
git commit -m "feat: link bills to individual member votes during ingestion"
```

---

## Task 3: Fix Member Total Votes Count

**Files:**
- Modify: `packages/api/src/services/member-service.ts:135-157`

**Context:** The `getById` method returns `totalVotes: 0` because it reads from `members.members.total_votes` which is never populated. We need to count from `voting.votes`.

**Step 3.1: Update getById query to count votes**

Replace the query in `getById` (around line 139-157):

```typescript
async getById(id: string): Promise<Member | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const sql = isUuid
    ? `
      SELECT m.*, s.name as state_name,
        (SELECT COUNT(*) FROM voting.votes v WHERE v.member_id = m.id) as total_votes
      FROM members.members m
      JOIN public.states s ON s.code = m.state_code
      WHERE m.id = $1
    `
    : `
      SELECT m.*, s.name as state_name,
        (SELECT COUNT(*) FROM voting.votes v WHERE v.member_id = m.id) as total_votes
      FROM members.members m
      JOIN public.states s ON s.code = m.state_code
      WHERE m.bioguide_id = $1
    `;

  const row = await queryOne<Record<string, unknown>>(sql, [id]);
  if (!row) return null;

  return this.mapRowToMember(row);
}
```

**Step 3.2: Build and verify**

```bash
cd packages/api && npm run build
```

**Step 3.3: Commit**

```bash
git add packages/api/src/services/member-service.ts
git commit -m "fix: calculate member totalVotes from voting.votes table"
```

---

## Task 4: Fix NaN% Display in Vote Bars

**Files:**
- Modify: `packages/web/src/app/bills/[billId]/page.tsx:182-248`

**Context:** When `republicanYea` and `republicanNay` are both null (or 0), the division `republicanYea / (republicanYea + republicanNay)` results in NaN or Infinity.

**Step 4.1: Add null check before rendering party breakdown**

Replace the party breakdown section (lines 182-248):

```tsx
{/* Party Breakdown */}
{hasPartyBreakdown(rollCall) && (
  <div className="space-y-3">
    <h4 className="font-medium text-gray-700">Party Breakdown</h4>

    {/* Republicans */}
    {rollCall.republicanYea != null && rollCall.republicanNay != null && (
      <PartyVoteBar
        label="Republicans"
        labelClass="text-red-700"
        yea={rollCall.republicanYea}
        nay={rollCall.republicanNay}
      />
    )}

    {/* Democrats */}
    {rollCall.democratYea != null && rollCall.democratNay != null && (
      <PartyVoteBar
        label="Democrats"
        labelClass="text-blue-700"
        yea={rollCall.democratYea}
        nay={rollCall.democratNay}
      />
    )}
  </div>
)}
```

**Step 4.2: Add helper functions at bottom of file**

```typescript
function hasPartyBreakdown(rollCall: {
  republicanYea?: number | null;
  republicanNay?: number | null;
  democratYea?: number | null;
  democratNay?: number | null;
}): boolean {
  return (
    (rollCall.republicanYea != null && rollCall.republicanNay != null) ||
    (rollCall.democratYea != null && rollCall.democratNay != null)
  );
}

function PartyVoteBar({
  label,
  labelClass,
  yea,
  nay,
}: {
  label: string;
  labelClass: string;
  yea: number;
  nay: number;
}) {
  const total = yea + nay;
  if (total === 0) {
    return (
      <div className="flex items-center gap-4">
        <span className={`w-24 text-sm font-medium ${labelClass}`}>{label}</span>
        <span className="text-gray-500 text-sm">No votes recorded</span>
      </div>
    );
  }

  const yeaPct = (yea / total) * 100;
  const nayPct = (nay / total) * 100;

  return (
    <div className="flex items-center gap-4">
      <span className={`w-24 text-sm font-medium ${labelClass}`}>{label}</span>
      <div className="flex-1 flex items-center gap-2">
        <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-green-500 flex items-center justify-center text-xs text-white font-medium"
            style={{ width: `${yeaPct}%` }}
          >
            {yea > 0 ? yea : ''}
          </div>
          <div
            className="h-full bg-red-500 flex items-center justify-center text-xs text-white font-medium"
            style={{ width: `${nayPct}%` }}
          >
            {nay > 0 ? nay : ''}
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 4.3: Build and verify**

```bash
cd packages/web && npm run build
```

**Step 4.4: Commit**

```bash
git add packages/web/src/app/bills/[billId]/page.tsx
git commit -m "fix: handle null party breakdown data in vote bars"
```

---

## Task 5: Add Stats API Endpoint

**Files:**
- Create: `packages/api/src/services/stats-service.ts`
- Modify: `packages/api/src/index.ts`
- Modify: `packages/infrastructure/src/stacks/api-stack.ts`

**Context:** Home page stats are hardcoded. We need an endpoint to return actual counts.

**Step 5.1: Create stats service**

Create `packages/api/src/services/stats-service.ts`:

```typescript
import { query, queryOne } from '@democracy-watch/shared';

export interface PlatformStats {
  memberCount: number;
  billCount: number;
  voteCount: number;
  rollCallCount: number;
}

export class StatsService {
  async getStats(): Promise<PlatformStats> {
    const results = await query<{ name: string; count: string }>(`
      SELECT 'members' as name, COUNT(*)::text as count FROM members.members WHERE is_active = true
      UNION ALL
      SELECT 'bills' as name, COUNT(*)::text as count FROM voting.bills
      UNION ALL
      SELECT 'votes' as name, COUNT(*)::text as count FROM voting.votes
      UNION ALL
      SELECT 'rollCalls' as name, COUNT(*)::text as count FROM voting.roll_calls
    `);

    const counts: Record<string, number> = {};
    for (const row of results) {
      counts[row.name] = parseInt(row.count, 10);
    }

    return {
      memberCount: counts.members || 0,
      billCount: counts.bills || 0,
      voteCount: counts.votes || 0,
      rollCallCount: counts.rollCalls || 0,
    };
  }
}
```

**Step 5.2: Add stats route to API**

Add to `packages/api/src/index.ts` (or the appropriate router file):

```typescript
import { StatsService } from './services/stats-service';

// GET /stats
app.get('/stats', async (req, res) => {
  const service = new StatsService();
  const stats = await service.getStats();
  res.json({ data: stats });
});
```

**Step 5.3: Build and verify**

```bash
cd packages/api && npm run build
```

**Step 5.4: Commit**

```bash
git add packages/api/src/services/stats-service.ts packages/api/src/index.ts
git commit -m "feat: add /stats endpoint for platform statistics"
```

---

## Task 6: Update Home Page to Use Stats API

**Files:**
- Modify: `packages/web/src/lib/api.ts`
- Modify: `packages/web/src/app/page.tsx`

**Step 6.1: Add stats API function**

Add to `packages/web/src/lib/api.ts`:

```typescript
export interface PlatformStats {
  memberCount: number;
  billCount: number;
  voteCount: number;
  rollCallCount: number;
}

export async function getStats(): Promise<{ data: PlatformStats }> {
  const response = await fetch(`${API_BASE_URL}/stats`, {
    next: { revalidate: 3600 }, // Cache for 1 hour
  });

  if (!response.ok) {
    throw new Error('Failed to fetch stats');
  }

  return response.json();
}
```

**Step 6.2: Update home page to fetch stats**

Modify `packages/web/src/app/page.tsx`:

```tsx
import { getStats } from '@/lib/api';

export default async function HomePage() {
  let stats = { memberCount: 0, billCount: 0, voteCount: 0 };

  try {
    const response = await getStats();
    stats = response.data;
  } catch (error) {
    console.error('Failed to fetch stats:', error);
  }

  // ... rest of component

  // In the Stats Bar section, replace hardcoded values:
  <section className="bg-brand-blue py-8">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
        <div>
          <div className="text-3xl md:text-4xl font-bold">{stats.memberCount}</div>
          <div className="text-blue-200 text-sm">Members Tracked</div>
        </div>
        <div>
          <div className="text-3xl md:text-4xl font-bold">{formatNumber(stats.billCount)}</div>
          <div className="text-blue-200 text-sm">Bills Analyzed</div>
        </div>
        <div>
          <div className="text-3xl md:text-4xl font-bold">{formatNumber(stats.voteCount)}</div>
          <div className="text-blue-200 text-sm">Votes Recorded</div>
        </div>
        <div>
          <div className="text-3xl md:text-4xl font-bold">Coming Soon</div>
          <div className="text-blue-200 text-sm">Contributions Tracked</div>
        </div>
      </div>
    </div>
  </section>
```

Add helper at bottom of file:

```typescript
function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K+`;
  return n.toString();
}
```

**Step 6.3: Build and verify**

```bash
cd packages/web && npm run build
```

**Step 6.4: Commit**

```bash
git add packages/web/src/lib/api.ts packages/web/src/app/page.tsx
git commit -m "feat: display real-time stats on home page"
```

---

## Task 7: Store Member Website URLs During Ingestion

**Files:**
- Modify: `packages/ingestion/src/congress/members.ts:91-146`
- Modify: `packages/ingestion/src/congress/client.ts` (add type)

**Context:** Congress.gov API returns `officialWebsiteUrl` but we don't store it.

**Step 7.1: Update CongressMember type**

In `packages/ingestion/src/congress/client.ts`, add to the `CongressMember` interface:

```typescript
export interface CongressMember {
  bioguideId: string;
  name: string;
  partyName: string;
  state?: string;
  district?: number;
  officialWebsiteUrl?: string;  // Add this
  terms?: {
    item: Array<{
      chamber: string;
      startYear?: number;
      endYear?: number;
    }>;
  };
}
```

**Step 7.2: Update member upsert to include website URL**

In `packages/ingestion/src/congress/members.ts`, modify the `upsertMember` function:

```typescript
async function upsertMember(member: CongressMember): Promise<'inserted' | 'updated'> {
  // ... existing code for parsing name, party, state ...

  const sql = `
    INSERT INTO members.members (
      bioguide_id, first_name, last_name, full_name,
      party, state_code, chamber, district,
      current_term_start, website_url, is_active, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, NOW())
    ON CONFLICT (bioguide_id)
    DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      full_name = EXCLUDED.full_name,
      party = EXCLUDED.party,
      state_code = EXCLUDED.state_code,
      chamber = EXCLUDED.chamber,
      district = EXCLUDED.district,
      current_term_start = EXCLUDED.current_term_start,
      website_url = COALESCE(EXCLUDED.website_url, members.members.website_url),
      is_active = TRUE,
      updated_at = NOW()
    RETURNING (xmax = 0) AS inserted
  `;

  const result = await query<{ inserted: boolean }>(sql, [
    member.bioguideId,
    firstName.substring(0, 100),
    lastName.substring(0, 100),
    `${firstName} ${lastName}`.trim().substring(0, 200),
    party,
    stateCode,
    chamber,
    member.district?.toString() || null,
    currentTerm?.startYear ? `${currentTerm.startYear}-01-03` : null,
    member.officialWebsiteUrl || null,  // Add this
  ]);

  return result[0]?.inserted ? 'inserted' : 'updated';
}
```

**Step 7.3: Build and verify**

```bash
cd packages/ingestion && npm run build
```

**Step 7.4: Commit**

```bash
git add packages/ingestion/src/congress/members.ts packages/ingestion/src/congress/client.ts
git commit -m "feat: store member website URLs during ingestion"
```

---

## Task 8: Deploy and Re-ingest Data

**Step 8.1: Deploy infrastructure**

```bash
cd packages/infrastructure && npm run build && cdk deploy --all
```

**Step 8.2: Re-run member ingestion to get website URLs**

```bash
aws lambda invoke --function-name democracy-watch-ingest-congress-prod \
  --payload '{"mode":"full","congress":119,"skipBills":true,"skipVotes":true}' \
  /tmp/members-119.json
```

**Step 8.3: Re-run vote ingestion to calculate party breakdown**

Note: This will take several hours due to API rate limits. Use Step Functions:

```bash
# Start House votes for Congress 119
aws stepfunctions start-execution \
  --state-machine-arn arn:aws:states:us-east-1:ACCOUNT:stateMachine:HouseVoteIngestion-prod \
  --input '{"congress":119,"mode":"full"}'

# Start Senate votes for Congress 119
aws stepfunctions start-execution \
  --state-machine-arn arn:aws:states:us-east-1:ACCOUNT:stateMachine:SenateVoteIngestion-prod \
  --input '{"congress":119,"mode":"full"}'
```

**Step 8.4: Verify fixes in production**

```bash
# Check party breakdown is populated
curl "https://api.democracy.watch/v1/bills/hr-119-1" | jq '.data.rollCalls[0]'

# Check member totalVotes
curl "https://api.democracy.watch/v1/members/W000805" | jq '.data.totalVotes'

# Check stats endpoint
curl "https://api.democracy.watch/v1/stats" | jq
```

---

## Verification Checklist

After deployment, verify each fix:

| Issue | Verification | Expected |
|-------|--------------|----------|
| Party breakdown | `curl .../bills/hr-119-1 \| jq '.data.rollCalls[0].republicanYea'` | Non-null integer |
| Bill-vote linking | `curl .../members/W000805/votes?limit=1 \| jq '.data[0].billId'` | Non-null UUID |
| Member totalVotes | `curl .../members/W000805 \| jq '.data.totalVotes'` | > 0 |
| No NaN in vote bars | Visit bill detail page with votes | Bars show numbers or "No data" |
| Stats endpoint | `curl .../stats \| jq` | Real counts returned |
| Home page stats | Visit home page | Real numbers displayed |
| Website URLs | `curl .../members/W000805 \| jq '.data.websiteUrl'` | URL or null (not all have it) |

---

# Phase 2: Medium Priority Issues

These can be addressed after the critical/high priority fixes are deployed and verified.

## Issues Summary (Medium Priority)

| # | Issue | Severity | Component |
|---|-------|----------|-----------|
| 8 | Bill subjects not populated | Medium | Data Limitation |
| 9 | Rankings page all placeholders | Medium | Frontend |
| 10 | Member votes missing bill context | Medium | Frontend |
| 11 | Contributions shows "$B+" | Medium | Frontend |
| 12 | Missing member biographical data | Medium | Ingestion + Frontend |

---

## Task 9: Show Bill Context in Member Votes

**Files:**
- Modify: `packages/web/src/app/members/[id]/page.tsx`

**Context:** After Task 2 (bill-vote linking) is complete, member votes will have `billId` and `bill` data. The frontend needs to display it.

**Step 9.1: Update member votes display**

Find the votes list rendering and add bill title:

```tsx
{vote.bill ? (
  <Link href={`/bills/${vote.bill.billType}-${vote.rollCall.congress}-${vote.bill.billNumber}`}>
    <span className="font-medium hover:text-brand-blue">
      {formatBillIdentifier(vote.bill.billType, vote.bill.billNumber)}
    </span>
    {vote.bill.title && (
      <span className="text-gray-600 ml-2 line-clamp-1">{vote.bill.title}</span>
    )}
  </Link>
) : (
  <span className="text-gray-500">{vote.rollCall.voteQuestion || 'Procedural Vote'}</span>
)}
```

**Step 9.2: Build and verify**

```bash
cd packages/web && npm run build
```

**Step 9.3: Commit**

```bash
git add packages/web/src/app/members/[id]/page.tsx
git commit -m "feat: show bill title and link in member votes"
```

---

## Task 10: Fix Contributions Placeholder

**Files:**
- Modify: `packages/web/src/app/page.tsx`

**Context:** The "$B+" looks unfinished. Replace with clearer placeholder until Phase 2.

**Step 10.1: Update the stats section**

Already addressed in Task 6 - the stats section will show "Coming Soon" for contributions.

**No additional work needed** - Task 6 already fixes this.

---

## Task 11: Add Basic Rankings Page

**Files:**
- Modify: `packages/web/src/app/rankings/page.tsx`
- Create: `packages/api/src/services/rankings-service.ts`

**Context:** Rankings page shows only placeholders. Add basic rankings we can compute now.

**Step 11.1: Create rankings service**

```typescript
import { query } from '@democracy-watch/shared';

export interface MemberRanking {
  id: string;
  bioguideId: string;
  fullName: string;
  party: string;
  stateCode: string;
  chamber: string;
  value: number;
}

export class RankingsService {
  async getMostActiveVoters(limit = 10): Promise<MemberRanking[]> {
    const sql = `
      SELECT m.id, m.bioguide_id, m.full_name, m.party, m.state_code, m.chamber,
             COUNT(v.id)::integer as value
      FROM members.members m
      JOIN voting.votes v ON v.member_id = m.id
      WHERE m.is_active = true
      GROUP BY m.id
      ORDER BY value DESC
      LIMIT $1
    `;
    return query<MemberRanking>(sql, [limit]);
  }

  async getMostMissedVotes(limit = 10): Promise<MemberRanking[]> {
    const sql = `
      SELECT m.id, m.bioguide_id, m.full_name, m.party, m.state_code, m.chamber,
             COUNT(v.id) FILTER (WHERE v.position = 'Not Voting')::integer as value
      FROM members.members m
      JOIN voting.votes v ON v.member_id = m.id
      WHERE m.is_active = true
      GROUP BY m.id
      HAVING COUNT(v.id) FILTER (WHERE v.position = 'Not Voting') > 0
      ORDER BY value DESC
      LIMIT $1
    `;
    return query<MemberRanking>(sql, [limit]);
  }
}
```

**Step 11.2: Update rankings page**

Replace placeholder content with actual rankings:

```tsx
import { RankingsService } from '@/lib/api';

export default async function RankingsPage() {
  const service = new RankingsService();
  const [mostActive, mostMissed] = await Promise.all([
    service.getMostActiveVoters(10),
    service.getMostMissedVotes(10),
  ]);

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Member Rankings</h1>

      <div className="grid md:grid-cols-2 gap-8">
        <section className="card">
          <h2 className="text-xl font-bold mb-4">Most Active Voters</h2>
          <RankingsList rankings={mostActive} label="votes cast" />
        </section>

        <section className="card">
          <h2 className="text-xl font-bold mb-4">Most Missed Votes</h2>
          <RankingsList rankings={mostMissed} label="votes missed" />
        </section>
      </div>

      <section className="mt-12 bg-gray-50 rounded-lg p-8 text-center">
        <h2 className="text-xl font-bold mb-2">More Rankings Coming Soon</h2>
        <p className="text-gray-600">
          Party alignment scores, promise tracking, and funding correlations
          will be added in upcoming phases.
        </p>
      </section>
    </div>
  );
}
```

**Step 11.3: Build and commit**

```bash
cd packages/web && npm run build
git add packages/api/src/services/rankings-service.ts packages/web/src/app/rankings/page.tsx
git commit -m "feat: add basic rankings (most active, most missed votes)"
```

---

## Task 12: Update Footer Social Links

**Files:**
- Modify: `packages/web/src/components/Footer.tsx`

**Context:** Social links may point to non-existent accounts.

**Step 12.1: Remove or fix social links**

Option A - Remove until accounts exist:
```tsx
{/* Social links removed until official accounts are created */}
```

Option B - Link to GitHub repo only:
```tsx
<a href="https://github.com/your-org/democracy-watch" target="_blank" rel="noopener noreferrer">
  <GitHubIcon className="w-6 h-6" />
</a>
```

**Step 12.2: Commit**

```bash
git add packages/web/src/components/Footer.tsx
git commit -m "fix: update footer social links"
```

---

# Phase 3: Data Limitations (No Fix Needed)

These issues are documented limitations, not bugs.

| # | Issue | Status | Notes |
|---|-------|--------|-------|
| 3 | Bill summaries unavailable | Data Limitation | Congress.gov returns 404 for most summary endpoints. Plan AI summarization for Phase 4. |
| 8 | Bill subjects not populated | Data Limitation | Same issue - Congress.gov returns 404. Lower priority than summaries. |
| 14 | Promise tracking placeholder | Expected | Phase 3 roadmap item |
| 15 | Campaign finance placeholder | Expected | Phase 2 roadmap item |

---

# Phase 4: Future Enhancements

These are not bugs but potential improvements identified during the audit.

| Enhancement | Description | Effort |
|-------------|-------------|--------|
| AI bill summaries | Use Claude to generate summaries when Congress.gov doesn't provide them | Medium |
| Member committees | Ingest committee assignments from Congress.gov | Medium |
| Member tenure | Calculate years in office from term data | Small |
| Member contact info | Ingest office addresses and phone numbers | Small |
| Social media links | Ingest Twitter/Facebook handles if available | Small |

---

## Notes

- **Party breakdown requires re-ingestion**: The fix calculates breakdown after inserting votes, so existing data needs to be re-ingested.
- **Bill-vote linking requires re-ingestion**: Same reason - the fix happens during insert.
- **Stats endpoint is lightweight**: Uses COUNT(*) which Postgres optimizes well.
- **Website URLs may still be null**: Not all members have official websites in Congress.gov data.
- **Bill summaries are a source data problem**: Congress.gov API doesn't provide summaries for most bills. Consider AI generation in future phase.
