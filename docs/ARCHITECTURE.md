# ARCHITECTURE.md - System Architecture

## Overview

This document describes the complete system architecture for the Congressional Accountability Platform.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                 USERS                                       │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
          ▼                       ▼                       ▼
   ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
   │ CloudFront  │         │ CloudFront  │         │ API Gateway │
   │  (Web App)  │         │   (Blog)    │         │  (REST API) │
   └──────┬──────┘         └──────┬──────┘         └──────┬──────┘
          │                       │                       │
          ▼                       ▼                       │
   ┌─────────────┐         ┌─────────────┐               │
   │   Amplify   │         │     S3      │               │
   │  (Next.js)  │         │   (Hugo)    │               │
   └─────────────┘         └─────────────┘               │
                                                         │
┌────────────────────────────────────────────────────────┼────────────────────┐
│                         AWS VPC                        │                    │
│                                                        │                    │
│  ┌─────────────────────────────────────────────────────┼─────────────────┐  │
│  │                    APPLICATION LAYER                │                 │  │
│  │                                                     ▼                 │  │
│  │  ┌───────────┐  ┌───────────┐  ┌────────────────────────────────┐    │  │
│  │  │  Cognito  │  │    WAF    │  │      Lambda Functions          │    │  │
│  │  │  (Auth)   │  │           │  │  ┌────────┐ ┌────────┐         │    │  │
│  │  └───────────┘  └───────────┘  │  │Members │ │ Votes  │ ...     │    │  │
│  │                                 │  │  API   │ │  API   │         │    │  │
│  │                                 │  └────────┘ └────────┘         │    │  │
│  │                                 └────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    AI AGENT LAYER                                     │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │              Step Functions (Orchestrator)                      │  │  │
│  │  │  Discovery → Extraction → Classification → Alignment            │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                    Amazon Bedrock                               │  │  │
│  │  │  Claude Sonnet/Haiku (extraction, analysis, narratives)         │  │  │
│  │  │  Titan Embeddings (semantic search vectors)                     │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    DATA INGESTION LAYER                               │  │
│  │                                                                       │  │
│  │  EventBridge Scheduler                                                │  │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐             │  │
│  │  │Congress   │ │   FEC     │ │OpenSecrets│ │ VoteSmart │             │  │
│  │  │(4 hours)  │ │ (daily)   │ │ (daily)   │ │ (weekly)  │             │  │
│  │  └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘             │  │
│  │        └─────────────┴─────────────┴─────────────┘                   │  │
│  │                              │                                        │  │
│  │                        SQS Queues                                     │  │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐             │  │
│  │  │  Votes    │ │   Bills   │ │Transcripts│ │ Promises  │             │  │
│  │  └───────────┘ └───────────┘ └───────────┘ └───────────┘             │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         DATA LAYER                                    │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │           Aurora PostgreSQL Serverless v2 + pgvector            │  │  │
│  │  │                                                                 │  │  │
│  │  │  Schemas: public | members | voting | platforms | promises |    │  │  │
│  │  │           finance | analytics | users                           │  │  │
│  │  │                                                                 │  │  │
│  │  │  Vector indexes: HNSW with cosine similarity                    │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                       │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │  │
│  │  │     S3      │  │ ElastiCache │  │ CloudWatch  │                   │  │
│  │  │ (raw data)  │  │  (Redis)    │  │  (logs)     │                   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Bounded Contexts

### Core Domain (Our Differentiator)

| Context | Responsibility | Key Entities |
|---------|----------------|--------------|
| **Promises** | Extract, store, and manage policy promises | Promise, Source, Transcript |
| **Analytics** | Calculate deviations, correlations, rankings | Deviation, Correlation, Ranking |

### Supporting Domain (Necessary Infrastructure)

| Context | Responsibility | Key Entities |
|---------|----------------|--------------|
| **Members** | Congressional member data | Member, Committee, District |
| **Voting** | Voting records and bills | Vote, Bill, RollCall |
| **Finance** | Campaign finance data | Contribution, Industry, PAC |
| **Platforms** | Party platform data | Platform, Plank |

### Generic Domain (Shared)

| Context | Responsibility | Key Entities |
|---------|----------------|--------------|
| **Geography** | Location reference data | State, ZipCode, Region |
| **Taxonomy** | Policy categorization | PolicyArea, Sector |
| **Users** | User accounts and subscriptions | Account, Subscription, Alert |

## Data Flow

### Vote Ingestion Flow

```
Congress.gov API
       │
       ▼
┌─────────────────┐
│ ingest-congress │ (Lambda, every 4 hours)
│    Lambda       │
└────────┬────────┘
         │
         ├──────────────────────┐
         │                      │
         ▼                      ▼
┌─────────────────┐    ┌─────────────────┐
│   votes table   │    │ EventBridge     │
│                 │    │ vote.created    │
└─────────────────┘    └────────┬────────┘
                                │
         ┌──────────────────────┼──────────────────────┐
         │                      │                      │
         ▼                      ▼                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ ai-analyze-     │    │ ai-correlate-   │    │ analytics-      │
│ alignment       │    │ funding         │    │ platform-       │
│                 │    │                 │    │ alignment       │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                      │
         ▼                      ▼                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   deviations    │    │   correlations  │    │   alignments    │
│     table       │    │     table       │    │     table       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                      │                      │
         └──────────────────────┼──────────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ analytics-      │
                       │ calculate-      │
                       │ rankings        │
                       └────────┬────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ member_rankings │
                       │     table       │
                       └─────────────────┘
```

### Promise Extraction Flow

```
YouTube / C-SPAN / Campaign Sites
              │
              ▼
     ┌─────────────────┐
     │ Discovery Agent │ (ECS Fargate)
     └────────┬────────┘
              │
              ▼
     ┌─────────────────┐
     │  sources table  │
     │  SQS: transcripts│
     └────────┬────────┘
              │
              ▼
     ┌─────────────────┐
     │ Extraction      │ (Lambda)
     │ - Transcribe    │
     │ - youtube-dl    │
     └────────┬────────┘
              │
              ▼
     ┌─────────────────┐
     │ ai-extract-     │ (Lambda + Bedrock Claude)
     │ promises        │
     └────────┬────────┘
              │
              ▼
     ┌─────────────────┐
     │ ai-embed        │ (Lambda + Bedrock Titan)
     └────────┬────────┘
              │
              ▼
     ┌─────────────────┐
     │ promises table  │
     │ (with vectors)  │
     └─────────────────┘
```

## AWS Service Configuration

### Aurora PostgreSQL Serverless v2

```yaml
Engine: aurora-postgresql
Version: 16.4
Capacity:
  MinACU: 0.5
  MaxACU: 8 (scale up for traffic)
Extensions:
  - pgvector (0.7.0+)
  - pg_trgm (fuzzy search)
Features:
  - Data API enabled (for Lambda)
  - Performance Insights enabled
```

### Lambda Configuration

| Function | Memory | Timeout | Trigger |
|----------|--------|---------|---------|
| api-members | 512MB | 30s | API Gateway |
| api-voting | 512MB | 30s | API Gateway |
| ingest-congress | 1024MB | 5min | EventBridge (4hr) |
| ingest-fec | 1024MB | 10min | EventBridge (daily) |
| ai-extract-promises | 1024MB | 5min | SQS |
| ai-analyze-alignment | 512MB | 2min | SQS |
| ai-embed | 512MB | 1min | SQS |
| analytics-rankings | 1024MB | 5min | EventBridge (hourly) |

### Bedrock Models

| Model | Use Case | Cost (per 1M tokens) |
|-------|----------|----------------------|
| Claude Sonnet 4 | Promise extraction, complex analysis | $3 input / $15 output |
| Claude Haiku 4.5 | Alignment scoring, classification | $0.25 input / $1.25 output |
| Titan Embeddings v2 | Vector embeddings (1024 dim) | $0.02 input |

### EventBridge Schedules

| Rule | Schedule | Target |
|------|----------|--------|
| congress-sync | rate(4 hours) | ingest-congress |
| fec-sync | cron(0 6 * * ? *) | ingest-fec |
| opensecrets-sync | cron(0 7 * * ? *) | ingest-opensecrets |
| calculate-rankings | rate(1 hour) | analytics-rankings |

## Security Architecture

### Network

- VPC with public and private subnets
- Lambda functions in private subnets
- NAT Gateway for outbound internet (API calls)
- Aurora in private subnets only

### Authentication

- **Users**: Cognito User Pools (email + password)
- **API Keys**: Stored in DynamoDB, hashed
- **Internal**: IAM roles for Lambda-to-service

### Data Protection

- Encryption at rest: KMS for Aurora, S3
- Encryption in transit: TLS 1.3
- Secrets: AWS Secrets Manager

### API Security

- WAF rules for rate limiting, SQL injection
- API Gateway throttling per API key tier
- Cognito authorizer for authenticated endpoints

## Cost Optimization

### Serverless First

- Aurora Serverless v2 scales to 0.5 ACU when idle
- Lambda pay-per-invocation
- No always-on compute for API layer

### Intelligent Tiering

- S3 Intelligent-Tiering for raw data
- ElastiCache for frequently accessed data
- CloudFront caching for static content

### Bedrock Cost Control

- Use Haiku for bulk operations (10x cheaper than Sonnet)
- Batch processing where possible
- Cache embedding results
- Intelligent Prompt Routing (saves ~30%)

## Scaling Strategy

### Phase 1 (MVP): Low Traffic

- Aurora: 0.5-2 ACU
- Lambda: Default concurrency
- No ElastiCache (use Aurora for caching)

### Phase 2 (Growth): Medium Traffic

- Aurora: 2-8 ACU
- Lambda: Reserved concurrency for API
- Add ElastiCache for hot paths
- Add read replica for analytics queries

### Phase 3 (Scale): High Traffic

- Aurora: 8-64 ACU with read replicas
- Lambda: Provisioned concurrency for API
- CloudFront caching aggressive
- Consider OpenSearch for search workloads

## Monitoring & Observability

### CloudWatch

- Lambda function metrics
- Aurora performance metrics
- Custom metrics for business KPIs

### X-Ray

- Distributed tracing for API requests
- Lambda function traces
- Bedrock call traces

### Alarms

| Metric | Threshold | Action |
|--------|-----------|--------|
| API p95 latency | > 500ms | Alert |
| Lambda errors | > 1% | Alert |
| Aurora CPU | > 80% | Scale up |
| Bedrock throttling | Any | Alert |

## Disaster Recovery

### Backup Strategy

- Aurora: Automated backups (7 days retention)
- Aurora: Point-in-time recovery enabled
- S3: Versioning enabled

### Recovery Objectives

- RPO (Recovery Point Objective): 1 hour
- RTO (Recovery Time Objective): 4 hours

### Multi-Region (Future)

- Aurora Global Database for read replicas
- S3 Cross-Region Replication
- Route 53 failover routing
