import { Handler, ScheduledEvent } from 'aws-lambda';
import { CongressApiClient } from './congress/client';
import { ingestMembers } from './congress/members';
import { ingestBills } from './congress/bills';
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
  // Step Functions chunking parameters
  voteStartOffset?: number;
  voteMaxRollCalls?: number;
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
      logger.info({ mode }, 'Ingesting bills');
      results.bills = await ingestBills(client, congress, mode);
    }

    // Sync votes (requires members to exist)
    // Supports chunked processing for Step Functions orchestration
    let voteResult = { inserted: 0, updated: 0, errors: 0, rollCallsProcessed: 0, hasMore: false, nextOffset: 0 };
    if (!event.skipVotes) {
      const voteOptions = {
        startOffset: event.voteStartOffset,
        maxRollCalls: event.voteMaxRollCalls,
      };
      logger.info({ mode, voteOptions }, 'Ingesting votes');
      voteResult = await ingestVotes(client, congress, mode, voteOptions);
      results.votes = voteResult;
    }

    logger.info({ results }, 'Ingestion completed');

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        mode,
        congress,
        results,
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
