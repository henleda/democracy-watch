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

export async function handler(): Promise<{ statusCode: number; body: string }> {
  console.log('Starting migrations...');

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
    // Create migrations tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Get executed migrations
    const result = await pool.query('SELECT version FROM public.schema_migrations');
    const executed = new Set(result.rows.map((r) => r.version));

    // Get migration files
    const migrationsDir = join(__dirname, 'migrations');
    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const results: string[] = [];

    for (const file of files) {
      const version = file.replace('.sql', '');

      if (executed.has(version)) {
        console.log(`Skipping ${file} (already executed)`);
        results.push(`Skipped: ${file}`);
        continue;
      }

      console.log(`Running ${file}...`);

      const sql = readFileSync(join(migrationsDir, file), 'utf-8');

      await pool.query('BEGIN');
      try {
        await pool.query(sql);
        await pool.query(
          'INSERT INTO public.schema_migrations (version) VALUES ($1)',
          [version]
        );
        await pool.query('COMMIT');
        console.log(`Completed ${file}`);
        results.push(`Executed: ${file}`);
      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }
    }

    console.log('All migrations completed successfully');

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Migrations complete', results }),
    };
  } finally {
    await pool.end();
  }
}
