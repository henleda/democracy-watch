#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { getConfig } from './config';
import { NetworkStack } from './stacks/network-stack';
import { SecretsStack } from './stacks/secrets-stack';
import { DatabaseStack } from './stacks/database-stack';
import { StorageStack } from './stacks/storage-stack';

const app = new cdk.App();

const envName = app.node.tryGetContext('env') || 'dev';
const config = getConfig(envName);

const env = {
  account: config.account || process.env.CDK_DEFAULT_ACCOUNT,
  region: config.region || process.env.CDK_DEFAULT_REGION,
};

const prefix = `DemocracyWatch-${config.envName}`;

// Foundation stacks (Phase 1)
const networkStack = new NetworkStack(app, `${prefix}-Network`, {
  env,
  config,
  description: 'VPC and networking infrastructure for Democracy Watch',
});

const secretsStack = new SecretsStack(app, `${prefix}-Secrets`, {
  env,
  config,
  description: 'Secrets Manager for API keys and credentials',
});

const storageStack = new StorageStack(app, `${prefix}-Storage`, {
  env,
  config,
  description: 'S3 buckets for raw data storage',
});

const databaseStack = new DatabaseStack(app, `${prefix}-Database`, {
  env,
  config,
  vpc: networkStack.vpc,
  description: 'Aurora PostgreSQL Serverless v2 with pgvector',
});
databaseStack.addDependency(networkStack);

app.synth();
