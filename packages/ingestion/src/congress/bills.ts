import { CongressApiClient, CongressBill } from './client';
import { query, createLogger } from '@democracy-watch/shared';
import { IngestResult } from './members';

const logger = createLogger('ingest-bills');

export async function ingestBills(
  client: CongressApiClient,
  congress: number,
  mode: 'full' | 'incremental'
): Promise<IngestResult> {
  const result: IngestResult = { inserted: 0, updated: 0, errors: 0 };

  let offset = 0;
  const limit = 250;
  let hasMore = true;

  // For incremental, get last sync time
  const fromDateTime = mode === 'incremental' ? await getLastSyncTime('bills') : undefined;

  while (hasMore) {
    logger.info({ offset, limit, mode }, 'Fetching bills batch');

    const response = await client.getBills(congress, { limit, offset, fromDateTime });
    const bills = response.bills || [];

    for (const bill of bills) {
      try {
        const upserted = await upsertBill(bill);
        if (upserted === 'inserted') {
          result.inserted++;
        } else {
          result.updated++;
        }
      } catch (error) {
        logger.error({ error, bill: `${bill.type}${bill.number}` }, 'Failed to upsert bill');
        result.errors++;
      }
    }

    hasMore = bills.length === limit;
    offset += limit;

    // In incremental mode, stop after first page if no new updates
    if (mode === 'incremental' && bills.length < limit) {
      hasMore = false;
    }
  }

  await updateLastSyncTime('bills');
  logger.info({ result }, 'Bills ingestion completed');
  return result;
}

async function upsertBill(bill: CongressBill): Promise<'inserted' | 'updated'> {
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
