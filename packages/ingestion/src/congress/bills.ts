import { CongressApiClient, CongressBill, CongressBillDetail } from './client';
import { query, queryOne, createLogger } from '@democracy-watch/shared';
import { IngestResult } from './members';

const logger = createLogger('ingest-bills');

export interface BillIngestOptions {
  congress: number;
  mode: 'full' | 'incremental';
  fetchDetails?: boolean;
  chunkStart?: number;
  chunkSize?: number;
}

export async function ingestBills(
  client: CongressApiClient,
  congress: number,
  mode: 'full' | 'incremental'
): Promise<IngestResult> {
  return ingestBillsWithOptions(client, {
    congress,
    mode,
    fetchDetails: true,
  });
}

export async function ingestBillsWithOptions(
  client: CongressApiClient,
  options: BillIngestOptions
): Promise<IngestResult> {
  const {
    congress,
    mode,
    fetchDetails = true,
    chunkStart,
    chunkSize,
  } = options;

  const result: IngestResult = { inserted: 0, updated: 0, errors: 0 };

  let offset = chunkStart ?? 0;
  const limit = 250;
  let hasMore = true;
  let processedCount = 0;

  // For incremental, get last sync time
  const fromDateTime = mode === 'incremental' ? await getLastSyncTime('bills') : undefined;

  while (hasMore) {
    logger.info({ offset, limit, mode, congress }, 'Fetching bills batch');

    const response = await client.getBills(congress, { limit, offset, fromDateTime });
    const bills = response.bills || [];

    for (const bill of bills) {
      try {
        // First upsert basic bill info from list endpoint
        await upsertBillBasic(bill);

        // Then fetch and upsert detailed info if enabled
        if (fetchDetails) {
          const detailResult = await fetchAndUpsertBillDetails(client, bill);
          if (detailResult === 'inserted') {
            result.inserted++;
          } else if (detailResult === 'updated') {
            result.updated++;
          } else {
            result.errors++;
          }
        } else {
          result.updated++;
        }

        processedCount++;

        // Check chunk limit
        if (chunkSize && processedCount >= chunkSize) {
          logger.info({ processedCount, chunkSize }, 'Chunk limit reached');
          hasMore = false;
          break;
        }
      } catch (error) {
        logger.error({ error, bill: `${bill.type}${bill.number}` }, 'Failed to process bill');
        result.errors++;
      }
    }

    if (!hasMore) break;

    hasMore = bills.length === limit;
    offset += limit;

    // In incremental mode, stop after first page if no new updates
    if (mode === 'incremental' && bills.length < limit) {
      hasMore = false;
    }
  }

  await updateLastSyncTime('bills');
  logger.info({ result, congress }, 'Bills ingestion completed');
  return result;
}

interface EnrichedBillDetail {
  detail: CongressBillDetail;
  summaries?: Array<{ text: string; updateDate: string; versionCode: string }>;
  subjects?: string[];
}

async function fetchAndUpsertBillDetails(
  client: CongressApiClient,
  bill: CongressBill
): Promise<'inserted' | 'updated' | 'error'> {
  try {
    // Fetch bill detail
    const { bill: detail } = await client.getBill(bill.congress, bill.type, bill.number);

    // Fetch summaries if available
    let summaries: Array<{ text: string; updateDate: string; versionCode: string }> | undefined;
    if (detail.summaries && detail.summaries.count > 0) {
      try {
        const summaryResponse = await client.getBillSummaries(bill.congress, bill.type, bill.number);
        summaries = summaryResponse.summaries;
      } catch (e) {
        logger.warn({ bill: `${bill.congress}-${bill.type}${bill.number}` }, 'Failed to fetch summaries');
      }
    }

    // Fetch subjects if available
    let subjects: string[] | undefined;
    if (detail.subjects && detail.subjects.count > 0) {
      try {
        const subjectsResponse = await client.getBillSubjects(bill.congress, bill.type, bill.number);
        subjects = subjectsResponse.subjects?.legislativeSubjects?.map((s) => s.name);
      } catch (e) {
        logger.warn({ bill: `${bill.congress}-${bill.type}${bill.number}` }, 'Failed to fetch subjects');
      }
    }

    return await upsertBillWithDetails({ detail, summaries, subjects });
  } catch (error) {
    logger.error(
      { error, bill: `${bill.congress}-${bill.type}${bill.number}` },
      'Failed to fetch bill details'
    );
    return 'error';
  }
}

async function upsertBillBasic(bill: CongressBill): Promise<'inserted' | 'updated'> {
  const sql = `
    INSERT INTO voting.bills (
      congress, bill_type, bill_number, title,
      latest_action, latest_action_date, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    ON CONFLICT (congress, bill_type, bill_number)
    DO UPDATE SET
      title = EXCLUDED.title,
      latest_action = EXCLUDED.latest_action,
      latest_action_date = EXCLUDED.latest_action_date,
      updated_at = NOW()
    RETURNING (xmax = 0) AS inserted
  `;

  const result = await query<{ inserted: boolean }>(sql, [
    bill.congress,
    bill.type.toLowerCase(),
    bill.number,
    bill.title,
    bill.latestAction?.text || null,
    bill.latestAction?.actionDate || null,
  ]);

  return result[0]?.inserted ? 'inserted' : 'updated';
}

async function upsertBillWithDetails(
  enriched: EnrichedBillDetail
): Promise<'inserted' | 'updated'> {
  const { detail, summaries, subjects } = enriched;

  // Extract the best summary (prefer most recent)
  const summary = extractBestSummary(summaries);

  // Look up sponsor ID from bioguide_id
  const sponsorId = await resolveSponsorId(detail.sponsors?.[0]?.bioguideId);

  // Look up or create policy area ID
  const policyAreaId = await resolvePolicyAreaId(detail.policyArea?.name);

  // Build full text URL (congress.gov standard format)
  const fullTextUrl = buildCongressGovTextUrl(detail);

  // Use subjects from the fetched data
  const subjectsArray = subjects || [];

  const sql = `
    INSERT INTO voting.bills (
      congress, bill_type, bill_number, title,
      summary, sponsor_id, introduced_date, full_text_url,
      primary_policy_area_id, subjects,
      latest_action, latest_action_date, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
    ON CONFLICT (congress, bill_type, bill_number)
    DO UPDATE SET
      title = EXCLUDED.title,
      summary = COALESCE(EXCLUDED.summary, voting.bills.summary),
      sponsor_id = COALESCE(EXCLUDED.sponsor_id, voting.bills.sponsor_id),
      introduced_date = COALESCE(EXCLUDED.introduced_date, voting.bills.introduced_date),
      full_text_url = COALESCE(EXCLUDED.full_text_url, voting.bills.full_text_url),
      primary_policy_area_id = COALESCE(EXCLUDED.primary_policy_area_id, voting.bills.primary_policy_area_id),
      subjects = COALESCE(EXCLUDED.subjects, voting.bills.subjects),
      latest_action = EXCLUDED.latest_action,
      latest_action_date = EXCLUDED.latest_action_date,
      updated_at = NOW()
    RETURNING (xmax = 0) AS inserted
  `;

  const result = await query<{ inserted: boolean }>(sql, [
    detail.congress,
    detail.type.toLowerCase(),
    detail.number,
    detail.title,
    summary,
    sponsorId,
    detail.introducedDate || null,
    fullTextUrl,
    policyAreaId,
    subjectsArray.length > 0 ? subjectsArray : null,
    detail.latestAction?.text || null,
    detail.latestAction?.actionDate || null,
  ]);

  return result[0]?.inserted ? 'inserted' : 'updated';
}

function extractBestSummary(
  summaries?: Array<{ text: string; updateDate: string; versionCode: string }>
): string | null {
  if (!summaries || summaries.length === 0) return null;

  // Sort by updateDate descending to get most recent
  const sorted = [...summaries].sort((a, b) => {
    const dateA = new Date(a.updateDate).getTime();
    const dateB = new Date(b.updateDate).getTime();
    return dateB - dateA;
  });

  // Get the most recent summary's text
  const text = sorted[0]?.text;
  if (!text) return null;

  // Strip HTML tags from the summary text
  return text.replace(/<[^>]*>/g, '').trim();
}

async function resolveSponsorId(bioguideId?: string): Promise<string | null> {
  if (!bioguideId) return null;

  const sql = `SELECT id FROM members.members WHERE bioguide_id = $1`;
  const result = await queryOne<{ id: string }>(sql, [bioguideId]);
  return result?.id || null;
}

async function resolvePolicyAreaId(policyAreaName?: string): Promise<number | null> {
  if (!policyAreaName) return null;

  // Try to find existing policy area
  const findSql = `SELECT id FROM public.policy_areas WHERE name = $1`;
  const existing = await queryOne<{ id: number }>(findSql, [policyAreaName]);
  if (existing) return existing.id;

  // Create new policy area if not found
  try {
    const insertSql = `
      INSERT INTO public.policy_areas (name)
      VALUES ($1)
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `;
    const inserted = await queryOne<{ id: number }>(insertSql, [policyAreaName]);
    return inserted?.id || null;
  } catch (error) {
    logger.warn({ error, policyAreaName }, 'Failed to create policy area');
    return null;
  }
}

function buildCongressGovTextUrl(detail: CongressBillDetail): string | null {
  // Build standard Congress.gov URL format
  // e.g., https://www.congress.gov/bill/118th-congress/house-bill/1/text
  const congressOrdinal = getOrdinal(detail.congress);
  const chamberType = mapBillTypeToChamberPath(detail.type);
  if (!chamberType) return null;

  return `https://www.congress.gov/bill/${congressOrdinal}-congress/${chamberType}/${detail.number}/text`;
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function mapBillTypeToChamberPath(billType: string): string | null {
  const typeMap: Record<string, string> = {
    hr: 'house-bill',
    hres: 'house-resolution',
    hjres: 'house-joint-resolution',
    hconres: 'house-concurrent-resolution',
    s: 'senate-bill',
    sres: 'senate-resolution',
    sjres: 'senate-joint-resolution',
    sconres: 'senate-concurrent-resolution',
  };
  return typeMap[billType.toLowerCase()] || null;
}

async function getLastSyncTime(entity: string): Promise<string | undefined> {
  const sql = `
    SELECT last_sync_at FROM public.sync_metadata WHERE entity = $1
  `;
  const result = await query<{ last_sync_at: Date }>(sql, [entity]);
  if (result[0]?.last_sync_at) {
    return result[0].last_sync_at.toISOString();
  }
  return undefined;
}

async function updateLastSyncTime(entity: string): Promise<void> {
  const sql = `
    INSERT INTO public.sync_metadata (entity, last_sync_at)
    VALUES ($1, NOW())
    ON CONFLICT (entity) DO UPDATE SET last_sync_at = NOW()
  `;
  await query(sql, [entity]);
}
