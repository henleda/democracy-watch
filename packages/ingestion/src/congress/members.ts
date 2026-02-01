import { CongressApiClient, CongressMember } from './client';
import { query, createLogger } from '@democracy-watch/shared';

const logger = createLogger('ingest-members');

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

  const sql = `
    INSERT INTO members.members (
      bioguide_id, first_name, last_name, full_name,
      party, state_code, chamber, district,
      current_term_start, is_active, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, NOW())
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
      is_active = TRUE,
      updated_at = NOW()
    RETURNING (xmax = 0) AS inserted
  `;

  const result = await query<{ inserted: boolean }>(sql, [
    member.bioguideId,
    firstName,
    lastName,
    `${firstName} ${lastName}`.trim(),
    party,
    member.state,
    chamber,
    member.district?.toString() || null,
    currentTerm?.startYear ? `${currentTerm.startYear}-01-03` : null,
  ]);

  return result[0]?.inserted ? 'inserted' : 'updated';
}
