# API_DESIGN.md - API Specification

## Overview

RESTful API served via API Gateway + Lambda. Base URL: `/api/v1`

## Authentication

| Endpoint Type | Auth Required | Method |
|---------------|---------------|--------|
| Public endpoints | No | None |
| User endpoints | Yes | Cognito JWT |
| API tier endpoints | Yes | API Key header |

```
Authorization: Bearer <cognito_jwt>
X-API-Key: <api_key>
```

## Rate Limits

| Tier | Requests/Day | Requests/Minute |
|------|--------------|-----------------|
| Free (unauthenticated) | 100 | 10 |
| Free (authenticated) | 1,000 | 30 |
| Citizen ($5/mo) | 10,000 | 100 |
| Researcher ($25/mo) | 100,000 | 500 |
| Organization ($100/mo) | 1,000,000 | 2,000 |

## Response Format

### Success Response

```json
{
  "data": { ... },
  "meta": {
    "total": 100,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

### Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid state code",
    "details": {
      "field": "state",
      "value": "XX"
    }
  }
}
```

## Endpoints

---

### Members

#### GET /members

List congressional members with filtering.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| state | string | Filter by state code (e.g., "TX") |
| party | string | Filter by party ("Republican", "Democrat", "Independent") |
| chamber | string | Filter by chamber ("house", "senate") |
| active | boolean | Filter by active status (default: true) |
| sort | string | Sort field: "name", "deviation", "alignment", "state" |
| order | string | Sort order: "asc", "desc" (default: "asc") |
| limit | integer | Results per page (default: 20, max: 100) |
| offset | integer | Pagination offset |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "bioguideId": "A000001",
      "fullName": "Jane Doe",
      "firstName": "Jane",
      "lastName": "Doe",
      "party": "Republican",
      "stateCode": "TX",
      "chamber": "house",
      "district": "5",
      "isActive": true,
      "deviationScore": 78.5,
      "partyAlignmentScore": 71.2,
      "accountabilityRank": 23,
      "totalVotes": 1245,
      "promisesTracked": 47
    }
  ],
  "meta": {
    "total": 435,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

---

#### GET /members/{memberId}

Get detailed member profile.

**Path Parameters:**
- `memberId`: UUID or bioguide_id

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "bioguideId": "A000001",
    "fullName": "Jane Doe",
    "firstName": "Jane",
    "lastName": "Doe",
    "party": "Republican",
    "stateCode": "TX",
    "chamber": "house",
    "district": "5",
    "isActive": true,
    "currentTermStart": "2023-01-03",
    "currentTermEnd": "2025-01-03",
    "websiteUrl": "https://doe.house.gov",
    "twitterHandle": "RepJaneDoe",
    
    "scores": {
      "deviationScore": 78.5,
      "deviationRank": 23,
      "partyAlignmentScore": 71.2,
      "partyAlignmentRank": 156,
      "accountabilityScore": 65.3,
      "accountabilityRank": 45
    },
    
    "stats": {
      "totalVotes": 1245,
      "promisesTracked": 47,
      "contradictingVotes": 12,
      "flaggedCorrelations": 3
    },
    
    "committees": [
      {
        "name": "House Financial Services",
        "role": "member"
      }
    ],
    
    "topIndustries": [
      {
        "name": "Oil & Gas",
        "amount": 245000,
        "rank": 1
      }
    ],
    
    "recentDeviations": [
      {
        "id": "uuid",
        "promiseStatement": "I will never vote to raise taxes...",
        "voteDate": "2024-03-15",
        "billTitle": "HR 4521",
        "alignmentScore": -1
      }
    ]
  }
}
```

---

#### GET /members/by-zip/{zipCode}

Get representatives for a zip code.

**Path Parameters:**
- `zipCode`: 5-digit zip code

**Response:**
```json
{
  "data": {
    "zipCode": "75201",
    "state": {
      "code": "TX",
      "name": "Texas"
    },
    "district": "5",
    "representatives": [
      {
        "chamber": "house",
        "member": { ... }  // Same as member summary
      },
      {
        "chamber": "senate",
        "seniority": "senior",
        "member": { ... }
      },
      {
        "chamber": "senate",
        "seniority": "junior",
        "member": { ... }
      }
    ]
  }
}
```

---

#### GET /members/{memberId}/votes

Get member's voting record.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| policyArea | string | Filter by policy area code |
| fromDate | date | Filter votes after this date |
| toDate | date | Filter votes before this date |
| position | string | Filter by position ("Yea", "Nay") |
| limit | integer | Results per page (default: 20) |
| offset | integer | Pagination offset |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "rollCallId": "uuid",
      "position": "Yea",
      "voteDate": "2024-03-15",
      "bill": {
        "id": "uuid",
        "congressId": "hr4521-118",
        "title": "Tax Relief Act of 2024",
        "shortTitle": "Tax Relief Act"
      },
      "rollCall": {
        "voteQuestion": "On Passage",
        "voteResult": "Passed",
        "yeaTotal": 220,
        "nayTotal": 210
      },
      "partyBreakdown": {
        "republicanYea": 180,
        "republicanNay": 40,
        "democratYea": 40,
        "democratNay": 170
      },
      "alignsWithPartyMajority": true,
      "relevantPromises": [
        {
          "id": "uuid",
          "statement": "I will never vote to raise taxes...",
          "alignmentScore": -1
        }
      ]
    }
  ],
  "meta": { ... }
}
```

---

#### GET /members/{memberId}/promises

Get member's tracked promises.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| policyArea | string | Filter by policy area code |
| positionType | string | Filter by type ("promise", "commitment", "opposition") |
| limit | integer | Results per page (default: 10 free, 50 paid) |
| offset | integer | Pagination offset |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "statement": "I will never vote to raise taxes on working families.",
      "context": "During town hall in Dallas...",
      "policyArea": {
        "code": "taxes",
        "name": "Taxation"
      },
      "positionType": "promise",
      "positionStance": "oppose",
      "specificity": 4,
      "confidence": 0.94,
      "source": {
        "type": "youtube",
        "url": "https://youtube.com/watch?v=...",
        "date": "2022-03-15",
        "timestampStart": 145
      },
      "relatedVotes": [
        {
          "id": "uuid",
          "billTitle": "HR 4521",
          "voteDate": "2024-03-15",
          "position": "Yea",
          "alignmentScore": -1
        }
      ]
    }
  ],
  "meta": { ... }
}
```

---

#### GET /members/{memberId}/deviations

Get promise-vote deviations. **Requires authentication.**

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| significantOnly | boolean | Only return significant deviations |
| flaggedOnly | boolean | Only return flagged deviations |
| limit | integer | Results per page |
| offset | integer | Pagination offset |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "promise": {
        "id": "uuid",
        "statement": "I will never vote to raise taxes...",
        "sourceDate": "2022-03-15"
      },
      "vote": {
        "id": "uuid",
        "position": "Yea",
        "voteDate": "2024-03-15",
        "bill": {
          "congressId": "hr4521-118",
          "title": "Tax Relief Act of 2024"
        }
      },
      "alignmentScore": -1,
      "confidence": 0.92,
      "isSignificant": true,
      "explanation": "The member promised to oppose tax increases but voted in favor of HR 4521 which raises income taxes on brackets above $400,000.",
      "narrative": "Despite campaign promises to protect taxpayers, Rep. Doe voted...",
      "fundingCorrelation": {
        "industry": "Real Estate",
        "amount": 198000,
        "voteFavorsIndustry": true
      }
    }
  ],
  "meta": { ... }
}
```

---

#### GET /members/{memberId}/platform-alignment

Get party platform alignment details. **Requires authentication.**

**Response:**
```json
{
  "data": {
    "memberId": "uuid",
    "memberName": "Jane Doe",
    "party": "Republican",
    "platform": {
      "year": 2024,
      "title": "2024 Republican Party Platform"
    },
    "overallAlignmentScore": 71.2,
    "partyAverageAlignment": 87.4,
    "deviationFromPartyAverage": -16.2,
    "byPolicyArea": [
      {
        "policyArea": {
          "code": "taxes",
          "name": "Taxation"
        },
        "alignedVotes": 12,
        "totalVotes": 15,
        "alignmentPercentage": 80.0,
        "misalignedVotes": [
          {
            "voteId": "uuid",
            "billTitle": "HR 4521",
            "plankStatement": "Republicans will make permanent the provisions of the Tax Cuts and Jobs Act...",
            "explanation": "Vote to increase taxes contradicts platform position"
          }
        ]
      }
    ],
    "similarMembers": [
      {
        "id": "uuid",
        "fullName": "John Smith",
        "alignmentScore": 73.1
      }
    ]
  }
}
```

---

### Rankings

#### GET /rankings

Get ranked lists of members.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| type | string | **Required.** Ranking type: "deviation", "party_alignment", "funding_correlation", "accountability" |
| party | string | Filter by party |
| state | string | Filter by state |
| chamber | string | Filter by chamber |
| order | string | "asc" (best first) or "desc" (worst first, default) |
| limit | integer | Results per page (default: 10) |
| offset | integer | Pagination offset |

**Response:**
```json
{
  "data": [
    {
      "rank": 1,
      "member": {
        "id": "uuid",
        "fullName": "Jane Doe",
        "party": "Republican",
        "stateCode": "TX",
        "chamber": "house"
      },
      "metricValue": 78.5,
      "metricLabel": "Deviation Score",
      "details": {
        "contradictingVotes": 12,
        "totalPromises": 47
      }
    }
  ],
  "meta": { ... }
}
```

---

### Bills

#### GET /bills

List bills.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| congress | integer | Filter by congress number |
| policyArea | string | Filter by policy area |
| search | string | Full-text search in title/summary |
| limit | integer | Results per page |
| offset | integer | Pagination offset |

---

#### GET /bills/{billId}

Get bill details with vote breakdown.

---

### Search

#### GET /search

Full-text search across entities.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| q | string | **Required.** Search query |
| type | string | Filter by type: "members", "bills", "promises", "all" |
| limit | integer | Results per page |

**Response:**
```json
{
  "data": {
    "members": [
      { "id": "uuid", "fullName": "Jane Doe", "relevance": 0.95 }
    ],
    "bills": [
      { "id": "uuid", "title": "Tax Relief Act", "relevance": 0.87 }
    ],
    "promises": [
      { "id": "uuid", "statement": "...", "memberName": "Jane Doe", "relevance": 0.82 }
    ]
  },
  "meta": {
    "query": "tax relief",
    "totalResults": 45
  }
}
```

---

### Stats

#### GET /stats

Get aggregate statistics.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| groupBy | string | Group by: "party", "state", "chamber" |

**Response:**
```json
{
  "data": {
    "totals": {
      "members": 535,
      "promises": 12847,
      "votes": 4521,
      "deviations": 892
    },
    "byParty": [
      {
        "party": "Republican",
        "memberCount": 222,
        "avgDeviationScore": 45.2,
        "avgPartyAlignment": 82.1
      },
      {
        "party": "Democrat",
        "memberCount": 213,
        "avgDeviationScore": 38.7,
        "avgPartyAlignment": 89.3
      }
    ]
  }
}
```

---

### User Endpoints

#### GET /me

Get current user profile. **Requires authentication.**

#### POST /alerts

Create an alert subscription. **Requires authentication.**

**Request Body:**
```json
{
  "alertType": "member",
  "memberId": "uuid",
  "channel": "email",
  "frequency": "immediate"
}
```

#### GET /alerts

List user's alerts. **Requires authentication.**

#### DELETE /alerts/{alertId}

Delete an alert. **Requires authentication.**

---

### Bulk Endpoints (API Tier Only)

#### GET /bulk/members

Export all members. **Requires API key (Researcher+).**

#### GET /bulk/votes

Export votes for a congress. **Requires API key (Researcher+).**

**Query Parameters:**
- `congress`: Congress number (required)
- `format`: "json" or "csv"

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Invalid request parameters |
| UNAUTHORIZED | 401 | Missing or invalid authentication |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| RATE_LIMITED | 429 | Rate limit exceeded |
| INTERNAL_ERROR | 500 | Server error |

---

## Lambda Handler Pattern

```typescript
// packages/api/src/handlers/members.ts

import { APIGatewayProxyHandler } from 'aws-lambda';
import { MemberService } from '../services/member-service';

export const listMembers: APIGatewayProxyHandler = async (event) => {
  try {
    const { state, party, chamber, limit, offset } = event.queryStringParameters || {};
    
    const service = new MemberService();
    const result = await service.list({
      state,
      party,
      chamber,
      limit: parseInt(limit || '20'),
      offset: parseInt(offset || '0'),
    });
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: result.members,
        meta: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          hasMore: result.offset + result.members.length < result.total,
        },
      }),
    };
  } catch (error) {
    return handleError(error);
  }
};
```
