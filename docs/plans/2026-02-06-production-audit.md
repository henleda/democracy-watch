# Production Audit Report

**Date:** 2026-02-06
**Environment:** Production (democracy.watch)
**API Endpoint:** https://5ik93ibw64.execute-api.us-east-1.amazonaws.com/v1

---

## Executive Summary

The production site is functional with core features working (member list, bill list, ZIP lookup, voting records). However, there are significant data quality issues and UI bugs that degrade the user experience.

**Critical Issues:** 3
**High Priority:** 4
**Medium Priority:** 5
**Low Priority:** 3

---

## Critical Issues

### 1. Party Vote Breakdown Data Missing
**Severity:** Critical
**Location:** API → `voting.roll_calls` table

Roll calls are missing party breakdown data (`republican_yea`, `republican_nay`, `democrat_yea`, `democrat_nay` are all NULL). This causes:
- Bill detail pages show "NaN%" for party vote bars
- No way to see how each party voted on legislation

**API Response Example:**
```json
{
  "rollCalls": [{
    "yeaTotal": 225,
    "nayTotal": 204,
    "republicanYea": null,  // Should have data
    "republicanNay": null,
    "democratYea": null,
    "democratNay": null
  }]
}
```

**Root Cause:** Vote ingestion doesn't aggregate individual votes by party.

**Fix Required:** Update vote ingestion to calculate and store party breakdown when processing roll calls.

---

### 2. Bill-Vote Linking Not Working
**Severity:** Critical
**Location:** API → Member votes endpoint

Member votes show `billId: null` for all votes, meaning:
- Can't show what bill a vote was for on member pages
- Votes appear without context

**API Response:**
```json
{
  "data": [{
    "position": "Yea",
    "voteDate": "2026-01-22",
    "billId": null,  // Should link to bill
    "rollCall": { "voteQuestion": "On Agreeing to the Resolution" }
  }]
}
```

**Root Cause:** Roll calls have `bill_id` populated, but member votes aren't joined properly to show bill info.

**Fix Required:** Update member votes query to include bill information via roll_call → bill join.

---

### 3. Bill Summaries Not Available
**Severity:** Critical (Data Limitation)
**Location:** Congress.gov API → `voting.bills.summary`

All bill summaries are NULL. Investigation shows Congress.gov returns 404 for most `/bill/{congress}/{type}/{number}/summaries` requests.

**This is a source data limitation**, not a bug. Options:
1. Accept that many bills won't have summaries
2. Generate summaries using AI (future feature)
3. Fetch summaries from alternative sources

**Recommendation:** Document limitation and plan AI summarization for Phase 4.

---

## High Priority Issues

### 4. Member Total Votes Count Always Zero
**Severity:** High
**Location:** API → Member detail endpoint

`totalVotes` shows 0 for all members even though they have hundreds of votes:
```json
{
  "fullName": "Aaron Bean",
  "totalVotes": 0  // Actually has 959 votes
}
```

**Fix Required:** Update member service to count votes from `voting.member_votes` table.

---

### 5. NaN% Display in Vote Bars
**Severity:** High
**Location:** Frontend → Bill detail page

Party breakdown bars show "NaN%" because the data is null. The UI should:
- Handle null values gracefully
- Show "Data not available" or hide the section

**Fix Required:** Add null checks in `BillCard.tsx` and bill detail page.

---

### 6. Static Statistics on Home Page
**Severity:** High
**Location:** Frontend → `page.tsx`

Home page stats are hardcoded:
```tsx
<div className="text-3xl font-bold">535</div>  // Hardcoded
<div className="text-3xl font-bold">15K+</div>  // Hardcoded
```

Should fetch actual counts from API.

**Fix Required:** Add stats endpoint and fetch real-time data.

---

### 7. Member Website URLs Not Populated
**Severity:** High
**Location:** Data → `members.members.website_url`

All member `websiteUrl` fields are null. Congress.gov API provides this data.

**Fix Required:** Update member ingestion to store `officialWebsiteUrl` from API.

---

## Medium Priority Issues

### 8. Bill Subjects Not Populated
**Severity:** Medium
**Location:** Data → `voting.bills.subjects`

Subjects array is null for all bills. Similar to summaries, Congress.gov often returns 404.

**Recommendation:** Accept limitation for now; subjects less critical than summaries.

---

### 9. Rankings Page All Placeholders
**Severity:** Medium
**Location:** Frontend → `/rankings`

Page shows only "Coming in Phase 2/3" placeholders with no actual data.

**Recommendation:** Either:
- Add basic rankings (most votes, party alignment)
- Remove from navigation until ready

---

### 10. Member Detail Missing Vote Context
**Severity:** Medium
**Location:** Frontend → Member detail page

Votes show only "On Agreeing to the Resolution" without bill title or link.

**Fix Required:** Include bill info in member votes display (depends on issue #2).

---

### 11. Contributions Display Shows "$B+"
**Severity:** Medium
**Location:** Frontend → Home page stats

Shows "$B+" which looks unfinished. Should either:
- Show actual contribution totals (when finance data added)
- Remove until Phase 2

---

### 12. Missing Member Biographical Data
**Severity:** Medium
**Location:** Frontend → Member detail page

Missing: committees, tenure length, contact info, social media links.

**Recommendation:** Add in UI cleanup phase.

---

## Low Priority Issues

### 13. Social Links in Footer
**Severity:** Low
**Location:** Frontend → Footer

GitHub/Twitter links point to organization accounts that may not exist.

---

### 14. Promise Tracking Placeholder
**Severity:** Low (Expected)
**Location:** Frontend → Member detail, Rankings

"Coming in Phase 3" - this is expected per roadmap.

---

### 15. Campaign Finance Placeholder
**Severity:** Low (Expected)
**Location:** Frontend → Member detail

"Coming in Phase 2" - this is expected per roadmap.

---

## Remediation Plan

### Phase 1: Critical Fixes (Immediate)

| Issue | Fix | Effort |
|-------|-----|--------|
| #1 Party Vote Breakdown | Calculate party breakdown during vote ingestion | Medium |
| #2 Bill-Vote Linking | Update member votes query to join bill info | Small |
| #5 NaN% Display | Add null checks in frontend | Small |
| #4 Total Votes Count | Update member service query | Small |

### Phase 2: UI Cleanup

| Issue | Fix | Effort |
|-------|-----|--------|
| #6 Static Stats | Create stats API endpoint, update frontend | Medium |
| #7 Member Website URLs | Update member ingestion | Small |
| #10 Vote Context | Show bill title in member votes | Small |
| #11 Contributions | Remove or add placeholder text | Small |
| #12 Member Bio Data | Add committees, tenure to UI | Medium |

### Phase 3: Data Quality (Ongoing)

| Issue | Fix | Effort |
|-------|-----|--------|
| #3 Bill Summaries | Plan AI summarization feature | Large |
| #8 Bill Subjects | Lower priority - accept limitation | None |
| #9 Rankings Page | Add basic rankings or hide | Medium |

---

## Data Inventory

| Entity | Count | Quality |
|--------|-------|---------|
| Members | 631 | Good (missing website URLs) |
| Bills | 32,388 | Partial (missing summaries) |
| Roll Calls | ~2,000 | Missing party breakdown |
| Member Votes | ~118,400 | Good (missing bill context) |
| Policy Areas | ~30 | Good |

---

## Next Steps

1. **Review this audit** with stakeholder
2. **Prioritize fixes** based on user impact
3. **Create implementation plan** for Phase 1 critical fixes
4. **Schedule UI cleanup** work after critical fixes
