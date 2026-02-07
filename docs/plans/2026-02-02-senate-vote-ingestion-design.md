# Senate Vote Ingestion Design

**Date:** 2026-02-02
**Status:** Implemented

> **Note:** During implementation, we discovered that the Congress.gov API v3 does not yet have Senate vote endpoints (only House votes were added in May 2025). The implementation was adjusted to iterate directly through Senate.gov XML instead.

## Overview

Implement Senate vote ingestion to complete the voting data pipeline. This mirrors the existing House vote ingestion pattern.

## Architecture

### Data Flow

```
Congress.gov API (getSenateVotes)  →  List of roll calls for session
         ↓
Senate.gov XML (fetchSenateRollCall)  →  Member-level vote positions
         ↓
Database (upsert roll_calls + votes)
```

### Files

| File | Action | Purpose |
|------|--------|---------|
| `packages/ingestion/src/congress/senate-clerk.ts` | CREATE | Fetch & parse Senate.gov XML |
| `packages/ingestion/src/congress/votes.ts` | MODIFY | Add Senate ingestion logic |
| `packages/database/migrations/007_lis_member_id.sql` | CREATE | Add LIS ID column for Senate matching |

## Senate.gov XML Structure

**URL Pattern:**
```
https://www.senate.gov/legislative/LIS/roll_call_votes/vote{congress}{session}/vote_{congress}_{session}_{number}.xml
```

Example: `vote1191/vote_119_1_00001.xml` for Congress 119, Session 1, Roll Call 1

**Response Structure:**
```xml
<roll_call_vote>
  <congress>119</congress>
  <session>1</session>
  <vote_number>1</vote_number>
  <vote_date>January 3, 2025</vote_date>
  <vote_question_text>On the Motion</vote_question_text>
  <vote_result>Agreed to</vote_result>
  <count>
    <yeas>99</yeas>
    <nays>0</nays>
    <present>0</present>
    <absent>1</absent>
  </count>
  <members>
    <member>
      <member_full>Warner (D-VA)</member_full>
      <lis_member_id>S327</lis_member_id>
      <party>D</party>
      <state>VA</state>
      <vote_cast>Yea</vote_cast>
    </member>
  </members>
</roll_call_vote>
```

## Database Migration

```sql
-- Add LIS Member ID for Senate vote matching
ALTER TABLE members.members
ADD COLUMN IF NOT EXISTS lis_member_id VARCHAR(10);

CREATE INDEX IF NOT EXISTS idx_members_lis_member_id
ON members.members(lis_member_id)
WHERE lis_member_id IS NOT NULL;
```

## Implementation Details

### Session Auto-Detection

Both sessions (1 and 2) are ingested automatically:
- Session 1: odd years (e.g., 2025 for 119th Congress)
- Session 2: even years (e.g., 2026)
- Handle 404s gracefully when session 2 has no votes yet

### Member Matching

Senate XML uses `lis_member_id` instead of `bioguide_id`. Strategy:
1. Match by `lis_member_id` if already stored
2. Fallback: match by last name + state + party
3. Update member record with `lis_member_id` for future lookups

### Error Handling

- **Rate Limiting:** 500ms between Senate.gov requests
- **Missing Members:** Log warning, continue processing
- **XML Fetch Failures:** Retry once, skip on 404, continue on parse errors
- **Chunking:** Reuse existing `VoteIngestionOptions`

## Verification

```bash
# Run migration
pnpm --filter database migrate

# Deploy ingestion Lambda
cd packages/infrastructure && npx cdk deploy DemocracyWatch-dev-Ingestion

# Trigger vote ingestion via Step Functions
aws stepfunctions start-execution \
  --state-machine-arn <arn> \
  --input '{"mode":"full","congress":119}'

# Verify Senate votes in database
SELECT COUNT(*) FROM voting.votes v
JOIN voting.roll_calls rc ON v.roll_call_id = rc.id
WHERE rc.chamber = 'senate';
```
