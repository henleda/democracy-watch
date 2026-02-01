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
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      dbname: url.pathname.slice(1),
      username: url.username,
      password: url.password,
    };
  }

  const secretArn = process.env.DATABASE_SECRET_ARN;
  if (!secretArn) {
    throw new Error('DATABASE_SECRET_ARN or DATABASE_URL must be set');
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

async function runSeeds(): Promise<void> {
  console.log('Starting seed data...');

  const credentials = await getCredentials();

  const pool = new Pool({
    host: credentials.host,
    port: credentials.port,
    database: credentials.dbname,
    user: credentials.username,
    password: credentials.password,
    ssl: process.env.DATABASE_URL ? false : { rejectUnauthorized: false },
  });

  try {
    const seedsDir = join(__dirname, 'seeds');
    const files = readdirSync(seedsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      console.log(`Running seed: ${file}...`);
      const sql = readFileSync(join(seedsDir, file), 'utf-8');
      await pool.query(sql);
      console.log(`Completed ${file}`);
    }

    console.log('All seeds completed successfully');
  } finally {
    await pool.end();
  }
}

runSeeds().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
