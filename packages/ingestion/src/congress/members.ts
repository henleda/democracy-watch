import { CongressApiClient, CongressMember } from './client';
import { query, createLogger } from '@democracy-watch/shared';

const logger = createLogger('ingest-members');

// State name to code mapping (for when API returns full names)
const STATE_NAME_TO_CODE: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
  'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
  'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
  'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
  'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
  'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
  'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
  'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
  'Wisconsin': 'WI', 'Wyoming': 'WY',
  // Territories
  'District of Columbia': 'DC', 'Puerto Rico': 'PR', 'Guam': 'GU',
  'Virgin Islands': 'VI', 'American Samoa': 'AS', 'Northern Mariana Islands': 'MP',
};

function normalizeStateCode(state: string | undefined): string | null {
  if (!state) return null;

  const trimmed = state.trim();

  // If it's already a 2-letter code, use it
  if (trimmed.length === 2) {
    return trimmed.toUpperCase();
  }

  // Try to map from full state name
  const code = STATE_NAME_TO_CODE[trimmed];
  if (code) {
    return code;
  }

  // Log and return null for unknown states
  logger.warn({ state }, 'Unknown state format');
  return null;
}

export interface IngestResult {
  inserted: number;
  updated: number;
  errors: number;
}

export async function ingestMembers(
  client: CongressApiClient,
  congress: number
): Promise<IngestResult> {
  const result: IngestResult = { inserted: 0, updated: 0, errors: 0 };

  let offset = 0;
  const limit = 250;
  let hasMore = true;

  while (hasMore) {
    logger.info({ offset, limit }, 'Fetching members batch');

    const response = await client.getMembers(congress, { limit, offset });
    const members = response.members || [];

    for (const member of members) {
      try {
        const upserted = await upsertMember(member);
        if (upserted === 'inserted') {
          result.inserted++;
        } else {
          result.updated++;
        }
      } catch (error) {
        logger.error({ error, bioguideId: member.bioguideId }, 'Failed to upsert member');
        result.errors++;
      }
    }

    hasMore = members.length === limit;
    offset += limit;
  }

  logger.info({ result }, 'Members ingestion completed');
  return result;
}

async function upsertMember(member: CongressMember): Promise<'inserted' | 'updated'> {
  const currentTerm = member.terms?.item?.find((t) => !t.endYear);
  const chamber = currentTerm?.chamber?.toLowerCase() === 'senate' ? 'senate' : 'house';

  // Parse name (format: "Last, First")
  const nameParts = member.name.split(', ');
  const lastName = nameParts[0] || member.name;
  const firstName = nameParts[1] || '';

  // Map party name
  let party = 'Independent';
  if (member.partyName.includes('Republican')) party = 'Republican';
  else if (member.partyName.includes('Democrat')) party = 'Democrat';

  // Normalize state code (handle full names and abbreviations)
  const stateCode = normalizeStateCode(member.state);
  if (!stateCode) {
    logger.warn({ bioguideId: member.bioguideId, state: member.state }, 'Invalid state code, skipping member');
    throw new Error(`Invalid state code: ${member.state}`);
  }

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
    member.officialWebsiteUrl || null,
  ]);

  return result[0]?.inserted ? 'inserted' : 'updated';
}
