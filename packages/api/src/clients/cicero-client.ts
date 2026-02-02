import { createLogger, query, getApiKey } from '@democracy-watch/shared';

const logger = createLogger('cicero-client');

const CICERO_API_URL = 'https://app.cicerodata.com/v3.1/official';

// Rate limiting: 200 requests/minute max, so ~300ms between requests to be safe
const REQUEST_DELAY_MS = 300;
let lastRequestTime = 0;

export interface CiceroDistrictResult {
  stateCode: string;
  districtNumber: string;
  stateName?: string;
  officials?: Array<{
    name: string;
    party: string;
    chamber: 'senate' | 'house';
  }>;
}

// Cicero API response types
interface CiceroOffice {
  district?: {
    district_type?: string;
    district_id?: string;
    state?: string;
  };
}

interface CiceroOfficial {
  first_name?: string;
  last_name?: string;
  party?: string;
  office?: CiceroOffice;
}

interface CiceroCandidate {
  match_postal?: string;
  match_region?: string;
  officials?: CiceroOfficial[];
}

interface CiceroApiResponse {
  response?: {
    results?: {
      candidates?: CiceroCandidate[];
    };
    errors?: Array<{
      message?: string;
      code?: string;
    }>;
  };
}

export class CiceroClient {
  private apiKey: string;

  private constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Creates a CiceroClient by fetching the API key from AWS Secrets Manager.
   * Returns null if the secret ARN is not configured.
   */
  static async create(): Promise<CiceroClient | null> {
    const secretArn = process.env.CICERO_API_KEY_ARN;
    if (!secretArn) {
      logger.warn('CICERO_API_KEY_ARN not configured, Cicero lookups will be disabled');
      return null;
    }

    try {
      const apiKey = await getApiKey(secretArn);
      return new CiceroClient(apiKey);
    } catch (error) {
      logger.error({ error }, 'Failed to fetch Cicero API key from Secrets Manager');
      return null;
    }
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < REQUEST_DELAY_MS) {
      await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS - elapsed));
    }
    lastRequestTime = Date.now();
  }

  /**
   * Looks up congressional district by ZIP code using Cicero API.
   * Returns null if the ZIP code cannot be found or has no congressional district.
   */
  async getDistrictByZip(zipCode: string): Promise<CiceroDistrictResult | null> {
    await this.rateLimit();

    const url = new URL(CICERO_API_URL);
    url.searchParams.set('search_postal', zipCode);
    url.searchParams.set('search_country', 'US');
    url.searchParams.set('format', 'json');
    url.searchParams.set('key', this.apiKey);

    logger.debug({ zipCode }, 'Querying Cicero API');

    try {
      const response = await fetch(url.toString());

      if (!response.ok) {
        logger.error({ zipCode, status: response.status }, 'Cicero API request failed');
        return null;
      }

      const data = (await response.json()) as CiceroApiResponse;

      // Check for API errors
      if (data.response?.errors && data.response.errors.length > 0) {
        logger.error({ zipCode, errors: data.response.errors }, 'Cicero API returned errors');
        return null;
      }

      const result = this.parseResponse(data, zipCode);

      if (result) {
        logger.info({ zipCode, stateCode: result.stateCode, district: result.districtNumber }, 'Cicero API found district');
      } else {
        logger.debug({ zipCode }, 'Cicero API returned no district');
      }

      return result;
    } catch (error) {
      logger.error({ zipCode, error }, 'Cicero API request error');
      return null;
    }
  }

  private parseResponse(data: CiceroApiResponse, zipCode: string): CiceroDistrictResult | null {
    const candidates = data.response?.results?.candidates;

    if (!candidates || candidates.length === 0) {
      logger.debug({ zipCode }, 'No candidates in Cicero response');
      return null;
    }

    const candidate = candidates[0];
    const officials = candidate.officials || [];

    // Find the House representative (NATIONAL_LOWER) to get district info
    const houseOfficial = officials.find(
      (o) => o.office?.district?.district_type === 'NATIONAL_LOWER'
    );

    if (!houseOfficial?.office?.district) {
      // Try to get state from any official or match_region
      const stateCode = candidate.match_region;
      if (stateCode) {
        // At-large state (only one representative)
        return {
          stateCode,
          districtNumber: 'AL',
          officials: this.extractOfficials(officials),
        };
      }
      logger.debug({ zipCode }, 'No House district found in Cicero response');
      return null;
    }

    const district = houseOfficial.office.district;
    const stateCode = district.state || candidate.match_region;
    let districtNumber = district.district_id || '';

    if (!stateCode) {
      logger.warn({ zipCode }, 'No state code found in Cicero response');
      return null;
    }

    // Normalize district number: "0" or "00" means at-large
    if (districtNumber === '0' || districtNumber === '00') {
      districtNumber = 'AL';
    }

    // Pad single-digit district numbers for consistency (e.g., "1" -> "01")
    if (districtNumber && districtNumber !== 'AL' && districtNumber.length === 1) {
      districtNumber = districtNumber.padStart(2, '0');
    }

    return {
      stateCode,
      districtNumber,
      officials: this.extractOfficials(officials),
    };
  }

  private extractOfficials(officials: CiceroOfficial[]): CiceroDistrictResult['officials'] {
    return officials
      .filter((o) => {
        const districtType = o.office?.district?.district_type;
        return districtType === 'NATIONAL_LOWER' || districtType === 'NATIONAL_UPPER';
      })
      .map((o) => ({
        name: `${o.first_name || ''} ${o.last_name || ''}`.trim(),
        party: this.normalizeParty(o.party),
        chamber: o.office?.district?.district_type === 'NATIONAL_UPPER' ? 'senate' as const : 'house' as const,
      }));
  }

  private normalizeParty(party?: string): string {
    if (!party) return 'Unknown';
    const lower = party.toLowerCase();
    if (lower.includes('democrat')) return 'Democratic';
    if (lower.includes('republican')) return 'Republican';
    return party;
  }

  /**
   * Caches a ZIP-to-district result in the database for future lookups.
   * This ensures we don't repeatedly query the Cicero API for the same ZIP.
   */
  async cacheResult(zipCode: string, result: CiceroDistrictResult): Promise<void> {
    try {
      await query(
        `INSERT INTO public.zip_districts (zip_code, state_code, district_number)
         VALUES ($1, $2, $3)
         ON CONFLICT (zip_code, state_code, district_number) DO NOTHING`,
        [zipCode, result.stateCode, result.districtNumber]
      );

      logger.debug({ zipCode, result: { stateCode: result.stateCode, districtNumber: result.districtNumber } }, 'Cached ZIP district result');
    } catch (error) {
      // Log but don't fail - caching is best-effort
      logger.warn({ zipCode, error }, 'Failed to cache ZIP district result');
    }
  }
}
