import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import { DatabaseCredentials } from './database';

const client = new SecretsManagerClient({});

const secretCache = new Map<string, { value: string; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getSecret(secretArn: string): Promise<string> {
  const cached = secretCache.get(secretArn);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const command = new GetSecretValueCommand({ SecretId: secretArn });
  const response = await client.send(command);

  if (!response.SecretString) {
    throw new Error(`Secret ${secretArn} has no string value`);
  }

  secretCache.set(secretArn, {
    value: response.SecretString,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return response.SecretString;
}

export async function getSecretJson<T>(secretArn: string): Promise<T> {
  const secretString = await getSecret(secretArn);
  return JSON.parse(secretString) as T;
}

export async function getDatabaseCredentials(): Promise<DatabaseCredentials> {
  const secretArn = process.env.DATABASE_SECRET_ARN;
  if (!secretArn) {
    throw new Error('DATABASE_SECRET_ARN environment variable is not set');
  }

  const secret = await getSecretJson<{
    host: string;
    port: number;
    dbname: string;
    username: string;
    password: string;
  }>(secretArn);

  return {
    host: secret.host,
    port: secret.port,
    database: secret.dbname,
    username: secret.username,
    password: secret.password,
  };
}

export async function getApiKey(secretArn: string): Promise<string> {
  const secret = await getSecretJson<{ apiKey: string }>(secretArn);
  return secret.apiKey;
}
