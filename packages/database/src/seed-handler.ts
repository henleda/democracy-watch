import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

interface DbCredentials {
  host: string;
  port: number;
  dbname: string;
  username: string;
  password: string;
}

async function getCredentials(): Promise<DbCredentials> {
  const secretArn = process.env.DATABASE_SECRET_ARN;
  if (!secretArn) {
    throw new Error('DATABASE_SECRET_ARN must be set');
  }

  const client = new SecretsManagerClient({});
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretArn })
  );

  if (!response.SecretString) {
    throw new Error('Secret has no string value');
  }

  return JSON.parse(response.SecretString);
}

// Define seed order - seeds may have dependencies
const SEED_ORDER = [
  'states.sql',
  'policy_areas.sql',
  'industry_taxonomy.sql', // Requires finance schema (migration 005)
];

export async function handler(event?: { seeds?: string[] }): Promise<{ statusCode: number; body: string }> {
  console.log('Starting seeds...');

  const credentials = await getCredentials();

  const pool = new Pool({
    host: credentials.host,
    port: credentials.port,
    database: credentials.dbname,
    user: credentials.username,
    password: credentials.password,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Get seed files
    const seedsDir = join(__dirname, 'seeds');
    const availableFiles = readdirSync(seedsDir)
      .filter((f) => f.endsWith('.sql'));

    // Determine which seeds to run
    let seedsToRun: string[];
    if (event?.seeds && event.seeds.length > 0) {
      // Run specific seeds if provided
      seedsToRun = event.seeds.filter(s => availableFiles.includes(s));
    } else {
      // Run all seeds in defined order
      seedsToRun = SEED_ORDER.filter(s => availableFiles.includes(s));
      // Add any seeds not in SEED_ORDER at the end
      const remainingSeeds = availableFiles.filter(f => !SEED_ORDER.includes(f));
      seedsToRun = [...seedsToRun, ...remainingSeeds];
    }

    const results: string[] = [];

    for (const file of seedsToRun) {
      console.log(`Running seed: ${file}...`);

      const sql = readFileSync(join(seedsDir, file), 'utf-8');

      try {
        await pool.query(sql);
        console.log(`Completed seed: ${file}`);
        results.push(`Seeded: ${file}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Failed to seed ${file}: ${errorMessage}`);

        // Check if it's a missing table error (finance schema not yet created)
        if (errorMessage.includes('relation "finance.') && errorMessage.includes('does not exist')) {
          console.log(`Skipping ${file} - finance schema not yet migrated`);
          results.push(`Skipped: ${file} (finance schema not ready)`);
          continue;
        }

        // Re-throw other errors
        throw error;
      }
    }

    console.log('All seeds completed successfully');

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Seeds complete', results }),
    };
  } finally {
    await pool.end();
  }
}
