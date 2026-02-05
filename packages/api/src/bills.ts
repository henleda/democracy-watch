import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { BillService } from './services/bill-service';
import { createResponse, createErrorResponse } from './utils/response';
import { createLogger } from '@democracy-watch/shared';

const logger = createLogger('bills-handler');
const billService = new BillService();

export async function handler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  logger.info({ path: event.path, method: event.httpMethod }, 'Incoming request');

  try {
    const { resource, pathParameters, queryStringParameters } = event;

    // GET /bills - list/search bills
    if (resource === '/bills' && event.httpMethod === 'GET') {
      return await listBills(queryStringParameters || {});
    }

    // GET /bills/{billId} - get bill by ID
    if (resource === '/bills/{billId}' && event.httpMethod === 'GET') {
      const billId = pathParameters?.billId;
      if (!billId) {
        return createErrorResponse(400, 'BAD_REQUEST', 'Bill ID is required');
      }
      return await getBill(billId);
    }

    return createErrorResponse(404, 'NOT_FOUND', 'Route not found');
  } catch (error) {
    logger.error({ error }, 'Handler error');
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Internal server error');
  }
}

async function listBills(
  params: Record<string, string | undefined>
): Promise<APIGatewayProxyResult> {
  const options = {
    q: params.q,
    congress: params.congress ? parseInt(params.congress) : undefined,
    chamber: params.chamber as 'house' | 'senate' | undefined,
    policyArea: params.policyArea,
    sponsorId: params.sponsorId,
    limit: Math.min(parseInt(params.limit || '20'), 100),
    offset: parseInt(params.offset || '0'),
    sort: params.sort || 'latest_action_date',
    order: (params.order || 'desc') as 'asc' | 'desc',
  };

  const result = await billService.list(options);
  return createResponse(200, result);
}

async function getBill(billId: string): Promise<APIGatewayProxyResult> {
  const bill = await billService.getById(billId);
  if (!bill) {
    return createErrorResponse(404, 'NOT_FOUND', 'Bill not found');
  }
  return createResponse(200, { data: bill });
}
