import { createLogger, query } from '@democracy-watch/shared';

const logger = createLogger('zip-districts');

// OpenSourceActivismTech ZIP-to-Congressional-District dataset
const ZCCD_CSV_URL =
  'https://raw.githubusercontent.com/OpenSourceActivismTech/us-zipcodes-congress/master/zccd.csv';

export interface ZipDistrictRecord {
  zipCode: string;
  stateCode: string;
  districtNumber: string;
}

export interface IngestResult {
  inserted: number;
  updated: number;
  errors: number;
}

/**
 * Downloads the ZIP-to-congressional-district CSV from GitHub.
 * The file is ~1.5MB and contains ~48,000 rows.
 */
export async function downloadZipDistrictData(): Promise<string> {
  logger.info({ url: ZCCD_CSV_URL }, 'Downloading ZIP district data');

  const response = await fetch(ZCCD_CSV_URL);

  if (!response.ok) {
    throw new Error(`Failed to download ZIP district data: ${response.status} ${response.statusText}`);
  }

  const csvContent = await response.text();
  logger.info({ bytes: csvContent.length }, 'Downloaded ZIP district data');

  return csvContent;
}

/**
 * Parses the ZCCD CSV format from OpenSourceActivismTech.
 * Format: state_fips,state_abbr,zcta,cd (e.g., "01,AL,30165,3")
 * - state_fips: 2-digit FIPS code
 * - state_abbr: 2-letter state abbreviation
 * - zcta: 5-digit ZIP Code Tabulation Area
 * - cd: Congressional district number (1-53) or empty for at-large
 */
export function parseZipDistrictCsv(csvContent: string): ZipDistrictRecord[] {
  const lines = csvContent.trim().split('\n');
  const records: ZipDistrictRecord[] = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(',');
    if (parts.length < 4) {
      logger.warn({ line, lineNumber: i + 1 }, 'Invalid CSV line, skipping');
      continue;
    }

    const [_stateFips, stateAbbr, zcta, cd] = parts;

    // Normalize the ZIP code to 5 digits (pad with leading zeros)
    const zipCode = zcta.padStart(5, '0');

    // Normalize district number: "AL" for at-large, or the district number
    // Empty or "0" typically means at-large
    let districtNumber = cd.trim();
    if (!districtNumber || districtNumber === '0' || districtNumber === '00') {
      districtNumber = 'AL';
    }

    records.push({
      zipCode,
      stateCode: stateAbbr.toUpperCase(),
      districtNumber,
    });
  }

  logger.info({ recordCount: records.length }, 'Parsed ZIP district records');
  return records;
}

/**
 * Bulk upserts ZIP district records to the database.
 * Uses batching to avoid memory issues with large datasets.
 */
export async function ingestZipDistricts(records?: ZipDistrictRecord[]): Promise<IngestResult> {
  // Download and parse if records not provided
  if (!records) {
    const csvContent = await downloadZipDistrictData();
    records = parseZipDistrictCsv(csvContent);
  }

  const result: IngestResult = {
    inserted: 0,
    updated: 0,
    errors: 0,
  };

  const BATCH_SIZE = 1000;
  const totalBatches = Math.ceil(records.length / BATCH_SIZE);

  logger.info({ totalRecords: records.length, batchSize: BATCH_SIZE, totalBatches }, 'Starting bulk upsert');

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const start = batchIndex * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, records.length);
    const batch = records.slice(start, end);

    try {
      const batchResult = await upsertBatch(batch);
      result.inserted += batchResult.inserted;
      result.updated += batchResult.updated;

      if ((batchIndex + 1) % 10 === 0 || batchIndex === totalBatches - 1) {
        logger.info(
          { batch: batchIndex + 1, totalBatches, inserted: result.inserted, updated: result.updated },
          'Progress update'
        );
      }
    } catch (error) {
      logger.error({ error, batchIndex, start, end }, 'Batch upsert failed');
      result.errors += batch.length;
    }
  }

  logger.info(result, 'ZIP district ingestion complete');
  return result;
}

/**
 * Upserts a batch of records using a single multi-row INSERT with ON CONFLICT.
 */
async function upsertBatch(records: ZipDistrictRecord[]): Promise<{ inserted: number; updated: number }> {
  if (records.length === 0) {
    return { inserted: 0, updated: 0 };
  }

  // Build parameterized VALUES clause
  const values: unknown[] = [];
  const valuePlaceholders: string[] = [];

  for (let i = 0; i < records.length; i++) {
    const offset = i * 3;
    valuePlaceholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3})`);
    values.push(records[i].zipCode, records[i].stateCode, records[i].districtNumber);
  }

  const sql = `
    INSERT INTO public.zip_districts (zip_code, state_code, district_number)
    VALUES ${valuePlaceholders.join(', ')}
    ON CONFLICT (zip_code, state_code, district_number) DO NOTHING
    RETURNING (xmax = 0) AS inserted
  `;

  const result = await query<{ inserted: boolean }>(sql, values);

  // Count inserted vs updated (existing records won't be returned due to DO NOTHING)
  const inserted = result.filter((r) => r.inserted).length;
  const updated = result.length - inserted;

  return { inserted, updated };
}

/**
 * Validates that the state codes in the records match our states reference table.
 * Returns invalid state codes for debugging.
 */
export async function validateStateCodes(records: ZipDistrictRecord[]): Promise<string[]> {
  const stateCodesInRecords = [...new Set(records.map((r) => r.stateCode))];

  const validStates = await query<{ code: string }>(
    'SELECT code FROM public.states WHERE code = ANY($1)',
    [stateCodesInRecords]
  );

  const validStateCodes = new Set(validStates.map((s) => s.code));
  const invalidCodes = stateCodesInRecords.filter((code) => !validStateCodes.has(code));

  if (invalidCodes.length > 0) {
    logger.warn({ invalidCodes }, 'Found state codes not in reference table');
  }

  return invalidCodes;
}
