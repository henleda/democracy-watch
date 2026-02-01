import { Handler, ScheduledEvent } from 'aws-lambda';
import { CongressApiClient } from './congress/client';
import { ingestMembers } from './congress/members';
import { ingestBills } from './congress/bills';
import { ingestVotes } from './congress/votes';
import { createLogger, getApiKey } from '@democracy-watch/shared';

const logger = createLogger('ingest-congress');

interface IngestEvent extends Partial<ScheduledEvent> {
  mode?: 'full' | 'incremental';
  source?: string;
  congress?: number;
}

export const handler: Handler<IngestEvent> = async (event) => {
  const mode = event.mode || 'incremental';
  const congress = event.congress || 118; // Current Congress

  logger.info({ mode, congress }, 'Starting Congress.gov ingestion');

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

    // Always sync members in full mode
    if (mode === 'full') {
      logger.info('Ingesting members (full)');
      results.members = await ingestMembers(client, congress);
    }

    // Sync bills
    logger.info({ mode }, 'Ingesting bills');
    results.bills = await ingestBills(client, congress, mode);

    // Sync votes
    logger.info({ mode }, 'Ingesting votes');
    results.votes = await ingestVotes(client, congress, mode);

    logger.info({ results }, 'Ingestion completed');

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        mode,
        congress,
        results,
      }),
    };
  } catch (error) {
    logger.error({ error }, 'Ingestion failed');
    throw error;
  }
};
