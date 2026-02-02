import { createLogger, query } from '@democracy-watch/shared';

const logger = createLogger('census-geocoder');

const CENSUS_GEOCODER_URL = 'https://geocoding.geo.census.gov/geocoder/geographies/address';

// Rate limiting: add delay between requests to be a good citizen
const REQUEST_DELAY_MS = 200;
let lastRequestTime = 0;

export interface CensusGeocodeResult {
  stateCode: string;
  stateFips: string;
  districtNumber: string;
  stateName?: string;
}

interface CongressionalDistrict {
  GEOID?: string;
  STATE?: string;
  CD119?: string;
  CD?: string;
  NAME?: string;
}

interface CensusApiResponse {
  result?: {
    addressMatches?: Array<{
      geographies?: {
        '119th Congressional Districts'?: CongressionalDistrict[];
        'Congressional Districts'?: CongressionalDistrict[];
      };
    }>;
  };
}

// FIPS state codes to postal codes mapping
const FIPS_TO_STATE: Record<string, string> = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA',
  '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL',
  '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN',
  '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME',
  '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS',
  '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH',
  '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND',
  '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI',
  '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT',
  '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI',
  '56': 'WY', '60': 'AS', '66': 'GU', '69': 'MP', '72': 'PR',
  '78': 'VI',
};

export class CensusGeocoderClient {
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < REQUEST_DELAY_MS) {
      await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS - elapsed));
    }
    lastRequestTime = Date.now();
  }

  /**
   * Looks up congressional district by ZIP code using Census Geocoder API.
   * Returns null if the ZIP code cannot be geocoded or has no congressional district.
   */
  async getDistrictByZip(zipCode: string): Promise<CensusGeocodeResult | null> {
    await this.rateLimit();

    // Build the Census Geocoder URL
    // Using ZIP-only lookup (no street address needed for district lookup)
    const url = new URL(CENSUS_GEOCODER_URL);
    url.searchParams.set('street', '');
    url.searchParams.set('city', '');
    url.searchParams.set('state', '');
    url.searchParams.set('zip', zipCode);
    url.searchParams.set('benchmark', 'Public_AR_Current');
    url.searchParams.set('vintage', 'Current_Current');
    url.searchParams.set('layers', '54'); // Congressional Districts layer
    url.searchParams.set('format', 'json');

    logger.debug({ zipCode, url: url.toString() }, 'Querying Census Geocoder');

    try {
      const response = await fetch(url.toString());

      if (!response.ok) {
        logger.error({ zipCode, status: response.status }, 'Census Geocoder request failed');
        return null;
      }

      const data = (await response.json()) as CensusApiResponse;

      // Extract congressional district from response
      const result = this.parseResponse(data, zipCode);

      if (result) {
        logger.info({ zipCode, result }, 'Census Geocoder found district');
      } else {
        logger.debug({ zipCode }, 'Census Geocoder returned no district');
      }

      return result;
    } catch (error) {
      logger.error({ zipCode, error }, 'Census Geocoder request error');
      return null;
    }
  }

  private parseResponse(data: CensusApiResponse, zipCode: string): CensusGeocodeResult | null {
    const addressMatches = data.result?.addressMatches;

    if (!addressMatches || addressMatches.length === 0) {
      logger.debug({ zipCode }, 'No address matches in Census response');
      return null;
    }

    const geographies = addressMatches[0].geographies;
    if (!geographies) {
      return null;
    }

    // Try 119th Congress first, then fall back to generic
    const districts =
      geographies['119th Congressional Districts'] || geographies['Congressional Districts'];

    if (!districts || districts.length === 0) {
      return null;
    }

    const district = districts[0];
    const stateFips = district.STATE;
    const districtCode = district.CD119 || district.CD;

    if (!stateFips || !districtCode) {
      return null;
    }

    // Convert FIPS code to state postal code
    const stateCode = FIPS_TO_STATE[stateFips];
    if (!stateCode) {
      logger.warn({ stateFips, zipCode }, 'Unknown FIPS state code');
      return null;
    }

    // Normalize district number: "00" or "98" typically means at-large
    let districtNumber = districtCode;
    if (districtNumber === '00' || districtNumber === '98') {
      districtNumber = 'AL';
    }

    return {
      stateCode,
      stateFips,
      districtNumber,
    };
  }

  /**
   * Caches a ZIP-to-district result in the database for future lookups.
   * This ensures we don't repeatedly query the Census API for the same ZIP.
   */
  async cacheResult(zipCode: string, result: CensusGeocodeResult): Promise<void> {
    try {
      await query(
        `INSERT INTO public.zip_districts (zip_code, state_code, district_number)
         VALUES ($1, $2, $3)
         ON CONFLICT (zip_code, state_code, district_number) DO NOTHING`,
        [zipCode, result.stateCode, result.districtNumber]
      );

      logger.debug({ zipCode, result }, 'Cached ZIP district result');
    } catch (error) {
      // Log but don't fail - caching is best-effort
      logger.warn({ zipCode, error }, 'Failed to cache ZIP district result');
    }
  }
}
