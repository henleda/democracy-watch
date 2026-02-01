# Infrastructure Package

AWS CDK (TypeScript) for all infrastructure.

## Stacks
- NetworkStack: VPC, subnets, NAT
- DatabaseStack: Aurora PostgreSQL + pgvector
- StorageStack: S3 buckets
- ApiStack: API Gateway + Lambda
- IngestionStack: EventBridge + ingestion Lambdas
- AiStack: AI Lambdas + Bedrock permissions

## Commands
```bash
cdk deploy <StackName>
```
