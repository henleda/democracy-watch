import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { StatsService } from './services/stats-service';
import { createResponse, createErrorResponse } from './utils/response';
import { createLogger } from '@democracy-watch/shared';

const logger = createLogger('stats-handler');
const statsService = new StatsService();

export async function handler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  logger.info({ path: event.path, method: event.httpMethod }, 'Incoming request');

  try {
    const { resource } = event;

    // GET /stats - platform statistics
    if (resource === '/stats' && event.httpMethod === 'GET') {
      return await getStats();
    }

    return createErrorResponse(404, 'NOT_FOUND', 'Route not found');
  } catch (error) {
    logger.error({ error }, 'Handler error');
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Internal server error');
  }
}

async function getStats(): Promise<APIGatewayProxyResult> {
  const stats = await statsService.getStats();
  return createResponse(200, { data: stats });
}
