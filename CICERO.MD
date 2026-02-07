# Implementation Plan: Cicero API Integration for ZIP Code Lookup

## Phase 1 Completion - Final Step

This completes the Phase 1 milestone: *"Users can search by zip, see their reps, view basic voting records."*

The current ZIP-to-district lookup has gaps (~5% of ZIP codes missing from the open source dataset). Cicero provides commercial-grade coverage to ensure all valid ZIP codes return representatives.

---

## Problem Statement

The current implementation uses:
1. **Primary**: OpenSourceActivismTech CSV dataset (~42,000 ZIPs)
2. **Fallback**: Census Geocoder API (requires full address, fails with ZIP-only)

**Issue**: ZIP codes like 20168 (Haymarket, VA) are not in the dataset and Census Geocoder can't handle ZIP-only lookups, resulting in "No representatives found" errors.

**Solution**: Replace Census Geocoder fallback with Cicero API, which supports postal code lookups with near-100% coverage.

---

## Cicero API Overview

| Feature | Details |
|---------|---------|
| **Endpoint** | `https://app.cicerodata.com/v3.1/official/` |
| **Auth** | API key via query parameter `?key={api_key}` |
| **ZIP Lookup** | `?search_postal=20168&search_country=US` |
| **Response** | JSON with officials and district info |
| **Rate Limit** | 200 requests/minute |
| **Pricing** | 1 credit per lookup; ~$300 for 5,000 credits |

---

## Implementation Plan

### Part 1: Create Cicero Client

**File**: `packages/api/src/clients/cicero-client.ts` (CREATE)

```typescript
export interface CiceroDistrictResult {
  stateCode: string;
  districtNumber: string;
  stateName: string;
  officials?: Array<{
    name: string;
    party: string;
    chamber: 'senate' | 'house';
  }>;
}

export class CiceroClient {
  private apiKey: string;
  private baseUrl = 'https://app.cicerodata.com/v3.1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getDistrictByZip(zipCode: string): Promise<CiceroDistrictResult | null> {
    // GET /official/?search_postal={zip}&search_country=US&format=json&key={key}
    // Parse response for congressional district and officials
    // Return normalized result
  }
}
```

**Key implementation details:**
- Use `search_postal` and `search_country=US` parameters
- Parse response to extract congressional district from `district.district_type === 'NATIONAL_LOWER'` (House) and `NATIONAL_UPPER` (Senate)
- Handle rate limiting (200 req/min max)
- Log API errors but don't expose to users

### Part 2: Update Member Service

**File**: `packages/api/src/services/member-service.ts` (MODIFY)

Replace `CensusGeocoderClient` with `CiceroClient` in the fallback logic:

```typescript
async getByZipCode(zipCode: string): Promise<ZipCodeResult | null> {
  // Step 1: Try database lookup (existing - keeps working for cached ZIPs)
  let district = await this.lookupDistrictFromDb(zipCode);

  // Step 2: If not found, try Cicero API
  if (!district) {
    const cicero = new CiceroClient(process.env.CICERO_API_KEY!);
    const ciceroResult = await cicero.getDistrictByZip(zipCode);

    if (ciceroResult) {
      // Cache the result for future lookups
      await this.cacheZipDistrict(zipCode, ciceroResult);
      district = ciceroResult;
    }
  }

  // Step 3: Get representatives (existing code)
  ...
}
```

### Part 3: Store API Key

**File**: AWS Secrets Manager (via CDK)

Add Cicero API key to the existing database secrets or create new secret:

```typescript
// In secrets-stack.ts or api-stack.ts
const ciceroApiKey = new secretsmanager.Secret(this, 'CiceroApiKey', {
  secretName: `democracy-watch-cicero-${config.envName}`,
});

// Pass to Lambda environment
environment: {
  CICERO_API_KEY: ciceroApiKey.secretValue.unsafeUnwrap(),
  // or use secretArn and fetch at runtime
}
```

### Part 4: Remove Census Geocoder

**File**: `packages/api/src/clients/census-geocoder.ts` (DELETE or DEPRECATE)

The Census Geocoder can be removed since Cicero provides better coverage. Keep the file if you want a free fallback option for development.

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `packages/api/src/clients/cicero-client.ts` | CREATE | Cicero API client |
| `packages/api/src/services/member-service.ts` | MODIFY | Use Cicero as fallback |
| `packages/api/src/clients/census-geocoder.ts` | DELETE | No longer needed |
| `packages/infrastructure/src/stacks/api-stack.ts` | MODIFY | Add Cicero API key to Lambda env |

---

## Environment Variables

```bash
# Add to Lambda environment
CICERO_API_KEY=your-api-key-here
```

**Note**: Store the API key in AWS Secrets Manager for production. For development, can use `.env` file.

---

## Cicero API Response Structure

```json
{
  "response": {
    "results": {
      "candidates": [{
        "match_postal": "20168",
        "match_region": "VA",
        "officials": [{
          "first_name": "Jennifer",
          "last_name": "Wexton",
          "party": "Democratic",
          "office": {
            "district": {
              "district_type": "NATIONAL_LOWER",
              "district_id": "10"
            }
          }
        }]
      }]
    }
  }
}
```

---

## Cost Estimation

| Usage | Credits | Cost |
|-------|---------|------|
| Dev testing | ~100 | Free trial (1,000 credits) |
| Production (per month) | ~1,000-5,000 | ~$300-600/year |

**Optimization**: Cache all lookups in `zip_districts` table to minimize API calls. Most users search the same ZIP codes repeatedly.

---

## Verification

### Step 1: Get Cicero API Key
1. Sign up at https://www.cicerodata.com/
2. Generate API key from account profile
3. Add to environment variables

### Step 2: Build and Deploy
```bash
cd packages/api && pnpm build
cd packages/infrastructure && npx cdk deploy DemocracyWatch-dev-Api
aws lambda update-function-code --function-name democracy-watch-members-dev \
  --zip-file fileb://<(cd packages/api/dist && zip -r - .)
```

### Step 3: Test Previously Failing ZIP
```bash
curl "https://akmlyp4244.execute-api.us-east-1.amazonaws.com/v1/members/by-zip/20168"
```

**Expected**: Returns VA senators + VA-10 representative (Jennifer Wexton or successor)

### Step 4: Verify Caching
```bash
# Second request should hit database, not Cicero API
curl "https://akmlyp4244.execute-api.us-east-1.amazonaws.com/v1/members/by-zip/20168"
```

### Step 5: Test on Website
- Go to https://dev.democracy.watch
- Enter ZIP code 20168
- Should see Virginia representatives

---

## Rollback Plan

If Cicero integration fails:
1. Revert to Census Geocoder (limited but free)
2. Or manually add missing ZIPs to database from known sources

---

## Timeline

| Task | Estimate |
|------|----------|
| Create Cicero client | 30 min |
| Update member service | 15 min |
| Add API key to infrastructure | 15 min |
| Testing and deployment | 30 min |
| **Total** | ~1.5 hours |
