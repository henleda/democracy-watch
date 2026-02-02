import { Handler } from 'aws-lambda';
import { ingestZipDistricts, validateStateCodes, downloadZipDistrictData, parseZipDistrictCsv } from './geo/zip-districts';
import { createLogger, closePool } from '@democracy-watch/shared';

const logger = createLogger('ingest-geo');

interface IngestGeoEvent {
  validateOnly?: boolean;
}

interface IngestGeoResponse {
  statusCode: number;
  body: string;
}

export const handler: Handler<IngestGeoEvent, IngestGeoResponse> = async (event) => {
  logger.info({ event }, 'Starting geo data ingestion');

  try {
    if (event.validateOnly) {
      // Validation mode: download and check state codes without inserting
      logger.info('Running in validation mode');

      const csvContent = await downloadZipDistrictData();
      const records = parseZipDistrictCsv(csvContent);
      const invalidStates = await validateStateCodes(records);

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          mode: 'validate',
          totalRecords: records.length,
          invalidStateCodes: invalidStates,
          validationPassed: invalidStates.length === 0,
        }),
      };
    }

    // Full ingestion mode
    const result = await ingestZipDistricts();

    logger.info({ result }, 'Geo data ingestion completed');

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        mode: 'ingest',
        ...result,
      }),
    };
  } catch (error) {
    logger.error({ error }, 'Geo data ingestion failed');

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  } finally {
    await closePool();
  }
};
