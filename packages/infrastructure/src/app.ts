#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { getConfig } from './config';
import { NetworkStack } from './stacks/network-stack';
import { SecretsStack } from './stacks/secrets-stack';
import { DatabaseStack } from './stacks/database-stack';
import { StorageStack } from './stacks/storage-stack';
import { ApiStack } from './stacks/api-stack';
import { IngestionStack } from './stacks/ingestion-stack';
import { OrchestrationStack } from './stacks/orchestration-stack';

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
  lambdaSecurityGroup: networkStack.lambdaSecurityGroup,
  description: 'Aurora PostgreSQL Serverless v2 with pgvector',
});
databaseStack.addDependency(networkStack);

// API stack (Phase 1)
const apiStack = new ApiStack(app, `${prefix}-Api`, {
  env,
  config,
  vpc: networkStack.vpc,
  lambdaSecurityGroup: networkStack.lambdaSecurityGroup,
  databaseSecretArn: databaseStack.clusterSecretArn,
  description: 'REST API Gateway and Lambda handlers',
});
apiStack.addDependency(networkStack);
apiStack.addDependency(databaseStack);

// Ingestion stack (Phase 1)
const ingestionStack = new IngestionStack(app, `${prefix}-Ingestion`, {
  env,
  config,
  vpc: networkStack.vpc,
  lambdaSecurityGroup: networkStack.lambdaSecurityGroup,
  databaseSecretArn: databaseStack.clusterSecretArn,
  congressApiKeySecret: secretsStack.congressApiKeySecret,
  rawDataBucket: storageStack.rawDataBucket,
  description: 'Data ingestion Lambdas and EventBridge schedules',
});
ingestionStack.addDependency(networkStack);
ingestionStack.addDependency(databaseStack);
ingestionStack.addDependency(secretsStack);
ingestionStack.addDependency(storageStack);

// Orchestration stack - Step Functions for coordinated ingestion
const orchestrationStack = new OrchestrationStack(app, `${prefix}-Orchestration`, {
  env,
  config,
  ingestCongressHandler: ingestionStack.ingestCongressHandler,
  description: 'Step Functions state machine for vote ingestion orchestration',
});
orchestrationStack.addDependency(ingestionStack);

app.synth();
