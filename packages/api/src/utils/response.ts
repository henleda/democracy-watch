import { APIGatewayProxyResult } from 'aws-lambda';

// CORS configuration
// Phase 1: Using '*' for public read-only API serving public government data
// Phase 2 TODO: Implement dynamic origin checking when adding authentication
// Allowed origins would be: democracy.watch, dev.democracy.watch, localhost:3000

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
};

export function createResponse(
  statusCode: number,
  body: unknown,
  headers?: Record<string, string>
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: { ...DEFAULT_HEADERS, ...headers },
    body: JSON.stringify(body),
  };
}

export function createErrorResponse(
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, unknown>
): APIGatewayProxyResult {
  return createResponse(statusCode, {
    error: {
      code,
      message,
      details,
    },
  });
}
