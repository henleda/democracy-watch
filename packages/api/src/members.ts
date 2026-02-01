import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { MemberService } from './services/member-service';
import { createResponse, createErrorResponse } from './utils/response';
import { createLogger } from '@democracy-watch/shared';

const logger = createLogger('members-handler');
const memberService = new MemberService();

export async function handler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  logger.info({ path: event.path, method: event.httpMethod }, 'Incoming request');

  try {
    const { resource, pathParameters, queryStringParameters } = event;

    // GET /members
    if (resource === '/members' && event.httpMethod === 'GET') {
      return await listMembers(queryStringParameters || {});
    }

    // GET /members/by-zip/{zipCode}
    if (resource === '/members/by-zip/{zipCode}' && event.httpMethod === 'GET') {
      const zipCode = pathParameters?.zipCode;
      if (!zipCode) {
        return createErrorResponse(400, 'BAD_REQUEST', 'Zip code is required');
      }
      return await getMembersByZip(zipCode);
    }

    // GET /members/{memberId}
    if (resource === '/members/{memberId}' && event.httpMethod === 'GET') {
      const memberId = pathParameters?.memberId;
      if (!memberId) {
        return createErrorResponse(400, 'BAD_REQUEST', 'Member ID is required');
      }
      return await getMember(memberId);
    }

    // GET /members/{memberId}/votes
    if (resource === '/members/{memberId}/votes' && event.httpMethod === 'GET') {
      const memberId = pathParameters?.memberId;
      if (!memberId) {
        return createErrorResponse(400, 'BAD_REQUEST', 'Member ID is required');
      }
      return await getMemberVotes(memberId, queryStringParameters || {});
    }

    return createErrorResponse(404, 'NOT_FOUND', 'Route not found');
  } catch (error) {
    logger.error({ error }, 'Handler error');
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Internal server error');
  }
}

async function listMembers(
  params: Record<string, string | undefined>
): Promise<APIGatewayProxyResult> {
  const options = {
    state: params.state,
    party: params.party,
    chamber: params.chamber as 'house' | 'senate' | undefined,
    active: params.active === 'false' ? false : true,
    limit: Math.min(parseInt(params.limit || '20'), 100),
    offset: parseInt(params.offset || '0'),
    sort: params.sort || 'fullName',
    order: (params.order || 'asc') as 'asc' | 'desc',
  };

  const result = await memberService.list(options);
  return createResponse(200, result);
}

async function getMember(memberId: string): Promise<APIGatewayProxyResult> {
  const member = await memberService.getById(memberId);
  if (!member) {
    return createErrorResponse(404, 'NOT_FOUND', 'Member not found');
  }
  return createResponse(200, { data: member });
}

async function getMembersByZip(zipCode: string): Promise<APIGatewayProxyResult> {
  if (!/^\d{5}$/.test(zipCode)) {
    return createErrorResponse(400, 'BAD_REQUEST', 'Invalid zip code format');
  }

  const result = await memberService.getByZipCode(zipCode);
  if (!result) {
    return createErrorResponse(404, 'NOT_FOUND', 'No representatives found for this zip code');
  }
  return createResponse(200, { data: result });
}

async function getMemberVotes(
  memberId: string,
  params: Record<string, string | undefined>
): Promise<APIGatewayProxyResult> {
  const options = {
    limit: Math.min(parseInt(params.limit || '20'), 100),
    offset: parseInt(params.offset || '0'),
  };

  const result = await memberService.getVotes(memberId, options);
  return createResponse(200, result);
}
