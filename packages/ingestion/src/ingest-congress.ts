import { Handler, ScheduledEvent } from 'aws-lambda';
import { CongressApiClient } from './congress/client';
import { ingestMembers } from './congress/members';
import { ingestBillsWithOptions } from './congress/bills';
import { ingestVotes } from './congress/votes';
import { createLogger, getApiKey, query, closePool } from '@democracy-watch/shared';

const logger = createLogger('ingest-congress');

interface IngestEvent extends Partial<ScheduledEvent> {
  mode?: 'full' | 'incremental';
  source?: string;
  congress?: number;
  skipMembers?: boolean;
  skipBills?: boolean;
  skipVotes?: boolean;
  // Chamber filter for vote ingestion
  chamber?: 'house' | 'senate' | 'both';
  // Step Functions chunking parameters
  voteStartOffset?: number;
  voteMaxRollCalls?: number;
  // Bill enrichment options
  fetchBillDetails?: boolean;
  billChunkStart?: number;
  billChunkSize?: number;
  // Backfill party breakdown for all existing roll calls
  backfillPartyBreakdown?: boolean;
}

export const handler: Handler<IngestEvent> = async (event) => {
  const mode = event.mode || 'incremental';
  const congress = event.congress || 118; // Current Congress

  logger.info({ mode, congress, event }, 'Starting Congress.gov ingestion');

  try {
    const apiKeyArn = process.env.CONGRESS_API_KEY_ARN;
    if (!apiKeyArn) {
      throw new Error('CONGRESS_API_KEY_ARN environment variable not set');
    }

    const apiKey = await getApiKey(apiKeyArn);
    const client = new CongressApiClient(apiKey);

    const results = {
      members: { inserted: 0, updated: 0, errors: 0 },
      bills: { inserted: 0, updated: 0, errors: 0 },
      votes: { inserted: 0, updated: 0, errors: 0 },
    };

    // Check if we need to sync members
    // Always sync in full mode, or if never synced, or if 24+ hours since last sync
    const shouldSyncMembers = !event.skipMembers && (
      mode === 'full' || await shouldRefreshMembers()
    );

    if (shouldSyncMembers) {
      logger.info('Ingesting members');
      results.members = await ingestMembers(client, congress);
      await updateSyncTime('members');
    } else {
      logger.info('Skipping members (recently synced)');
    }

    // Sync bills
    if (!event.skipBills) {
      const billOptions = {
        congress,
        mode,
        fetchDetails: event.fetchBillDetails ?? false,
        chunkStart: event.billChunkStart,
        chunkSize: event.billChunkSize,
      };
      logger.info({ mode, billOptions }, 'Ingesting bills');
      results.bills = await ingestBillsWithOptions(client, billOptions);
    }

    // Sync votes (requires members to exist)
    // Supports chunked processing for Step Functions orchestration
    // Chamber can be 'house', 'senate', or 'both' (default)
    let voteResult = { inserted: 0, updated: 0, errors: 0, rollCallsProcessed: 0, hasMore: false, nextOffset: 0 };
    if (!event.skipVotes) {
      const chamber = event.chamber || 'both';
      const voteOptions = {
        startOffset: event.voteStartOffset,
        maxRollCalls: event.voteMaxRollCalls,
        chamber,
      };
      logger.info({ mode, voteOptions, chamber }, 'Ingesting votes');
      voteResult = await ingestVotes(client, congress, mode, voteOptions);
      results.votes = voteResult;
    }

    // Backfill party breakdown for all roll calls (one-time fix)
    let backfillResult = { updated: 0, errors: 0 };
    if (event.backfillPartyBreakdown) {
      logger.info('Backfilling party breakdown for all roll calls');
      backfillResult = await backfillAllPartyBreakdowns();
    }

    logger.info({ results, backfillResult }, 'Ingestion completed');

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        mode,
        congress,
        results,
        backfillResult,
        // Include chunking info for Step Functions
        voteChunking: {
          rollCallsProcessed: voteResult.rollCallsProcessed,
          hasMore: voteResult.hasMore,
          nextOffset: voteResult.nextOffset,
        },
      }),
    };
  } catch (error) {
    logger.error({ error }, 'Ingestion failed');
    throw error;
  } finally {
    await closePool();
  }
};

async function shouldRefreshMembers(): Promise<boolean> {
  try {
    const result = await query<{ last_sync_at: Date; hours_ago: number }>(
      `SELECT last_sync_at,
              EXTRACT(EPOCH FROM (NOW() - last_sync_at)) / 3600 AS hours_ago
       FROM public.sync_metadata
       WHERE entity = 'members'`
    );

    if (result.length === 0) {
      logger.info('Members never synced, will sync now');
      return true;
    }

    const hoursAgo = result[0].hours_ago;
    const shouldRefresh = hoursAgo >= 24;
    logger.info({ hoursAgo, shouldRefresh }, 'Member sync check');
    return shouldRefresh;
  } catch (error) {
    // Table might not exist yet, sync members
    logger.warn({ error }, 'Could not check sync metadata, will sync members');
    return true;
  }
}

async function updateSyncTime(entity: string): Promise<void> {
  await query(
    `INSERT INTO public.sync_metadata (entity, last_sync_at)
     VALUES ($1, NOW())
     ON CONFLICT (entity) DO UPDATE SET last_sync_at = NOW()`,
    [entity]
  );
}

/**
 * Backfill party breakdown for all roll calls that have null values.
 * This is a one-time fix for roll calls that were ingested before
 * party breakdown calculation was added.
 */
async function backfillAllPartyBreakdowns(): Promise<{ updated: number; errors: number }> {
  const result = { updated: 0, errors: 0 };

  // Find all roll calls with null party breakdown
  const rollCalls = await query<{ id: string; roll_call_number: number; chamber: string }>(
    `SELECT id, roll_call_number, chamber
     FROM voting.roll_calls
     WHERE republican_yea IS NULL
     ORDER BY vote_date DESC`
  );

  logger.info({ count: rollCalls.length }, 'Found roll calls needing party breakdown backfill');

  for (const rollCall of rollCalls) {
    try {
      // Count votes for this roll call
      const countResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM voting.votes WHERE roll_call_id = $1`,
        [rollCall.id]
      );
      const voteCount = parseInt(countResult[0]?.count || '0', 10);

      if (voteCount === 0) {
        continue; // Skip roll calls with no votes
      }

      // Update party breakdown
      const updateResult = await query<{
        republican_yea: number;
        republican_nay: number;
        democrat_yea: number;
        democrat_nay: number;
      }>(
        `UPDATE voting.roll_calls
         SET
           republican_yea = (
             SELECT COUNT(*) FROM voting.votes v
             JOIN members.members m ON m.id = v.member_id
             WHERE v.roll_call_id = $1 AND v.position = 'Yea' AND m.party = 'Republican'
           ),
           republican_nay = (
             SELECT COUNT(*) FROM voting.votes v
             JOIN members.members m ON m.id = v.member_id
             WHERE v.roll_call_id = $1 AND v.position = 'Nay' AND m.party = 'Republican'
           ),
           democrat_yea = (
             SELECT COUNT(*) FROM voting.votes v
             JOIN members.members m ON m.id = v.member_id
             WHERE v.roll_call_id = $1 AND v.position = 'Yea' AND m.party = 'Democrat'
           ),
           democrat_nay = (
             SELECT COUNT(*) FROM voting.votes v
             JOIN members.members m ON m.id = v.member_id
             WHERE v.roll_call_id = $1 AND v.position = 'Nay' AND m.party = 'Democrat'
           )
         WHERE id = $1
         RETURNING republican_yea, republican_nay, democrat_yea, democrat_nay`,
        [rollCall.id]
      );

      if (updateResult[0]) {
        result.updated++;
        if (result.updated % 100 === 0) {
          logger.info(
            { updated: result.updated, total: rollCalls.length },
            'Party breakdown backfill progress'
          );
        }
      }
    } catch (error) {
      logger.error(
        { error, rollCallId: rollCall.id, rollCallNumber: rollCall.roll_call_number },
        'Failed to backfill party breakdown'
      );
      result.errors++;
    }
  }

  logger.info({ result }, 'Party breakdown backfill completed');
  return result;
}
