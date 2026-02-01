# CLAUDE.md - Congressional Accountability Platform

## Project Overview

This is a civic tech platform that correlates congressional voting records against campaign promises and funding data to create transparency around political accountability. The platform serves citizens, researchers, and journalists who want to understand how their representatives vote relative to their stated positions and funding sources.

## Core Hypothesis

Politicians' voting patterns may deviate from their stated campaign promises, and these deviations may correlate with their funding sources. This platform makes these patterns visible and searchable.

## Architecture Decisions

### Pattern: Modular Monolith with Cloud-Native Services

We are NOT building microservices. We are building a modular monolith with clear domain boundaries:

- **Single Aurora PostgreSQL database** with separate schemas per domain
- **Lambda functions grouped by domain** (not one-per-endpoint)
- **EventBridge** for async communication between domains
- **API Gateway** as unified entry point

This provides domain isolation without distributed transaction complexity.

### Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Database | Aurora PostgreSQL Serverless v2 + pgvector | Relational + vector search in one DB |
| API | Lambda + API Gateway | Serverless, scales to zero |
| AI/LLM | Amazon Bedrock (Claude) | Native AWS integration |
| Embeddings | Bedrock (Titan Embeddings) | 1024-dim vectors |
| Frontend | Next.js 14 (App Router) | SSR for SEO, React ecosystem |
| Hosting | Amplify (frontend) | Managed deployment |
| IaC | AWS CDK (TypeScript) | Type-safe infrastructure |
| Monorepo | pnpm workspaces + Turborepo | Fast builds, shared deps |

### Database Schema Organization

```
public          - Shared reference data (states, policy_areas, zip_districts)
members         - Congressional members, committees, districts
voting          - Bills, roll calls, individual votes
platforms       - Party platforms and planks
promises        - Extracted promises with embeddings
finance         - Contributions, industries, PACs
analytics       - Deviations, correlations, rankings
users           - Accounts, subscriptions, alerts
```

## Project Structure

```
congressional-accountability-platform/
├── CLAUDE.md                       # This file
├── package.json                    # Monorepo root
├── pnpm-workspace.yaml
├── turbo.json
├── docs/                           # Detailed documentation
│   ├── ARCHITECTURE.md
│   ├── DATA_MODEL.md
│   ├── API_DESIGN.md
│   ├── AI_AGENTS.md
│   ├── FRONTEND.md
│   ├── domains/                    # Domain-specific docs
│   └── phases/                     # Implementation phases
├── infrastructure/                 # AWS CDK
├── packages/
│   ├── database/                   # Migrations & seeds
│   ├── shared/                     # Shared types & utilities
│   ├── api/                        # Lambda API handlers
│   ├── ingestion/                  # Data ingestion Lambdas
│   ├── ai/                         # Bedrock AI Lambdas
│   ├── analytics/                  # Analytics Lambdas
│   └── web/                        # Next.js frontend
└── scripts/
```

## Coding Conventions

### TypeScript

- Use strict mode
- Prefer `interface` over `type` for object shapes
- Use barrel exports (`index.ts`) for public APIs
- Name files in kebab-case: `member-service.ts`
- Name components in PascalCase: `MemberCard.tsx`

### Database

- Use UUIDs for primary keys (except reference tables)
- Use `snake_case` for all database identifiers
- Always include `created_at TIMESTAMPTZ DEFAULT NOW()`
- Use foreign keys with explicit `ON DELETE` behavior
- Prefix indexes with `idx_`

### Lambda Functions

- One handler file per Lambda function
- Use dependency injection for testability
- Return consistent response shapes
- Log with structured JSON

### API Design

- RESTful endpoints under `/api/v1`
- Use plural nouns: `/members`, `/votes`
- Pagination via `limit` and `offset`
- Filter via query params: `?state=TX&party=Republican`
- Return `{ data, meta }` wrapper for lists

### Frontend (Next.js)

- Use App Router (not Pages Router)
- Server Components by default
- Client Components only when needed (`'use client'`)
- Colocate components with their routes when specific
- Shared components in `/components`

## Key Domain Concepts

### Member
A current or former member of Congress (House or Senate). Identified primarily by `bioguide_id`.

### Promise
A statement extracted from speeches, interviews, or campaign materials that represents a policy position or commitment. Has an embedding for semantic search.

### Vote
A member's position (Yea/Nay/Present/Not Voting) on a specific roll call.

### Deviation
A calculated mismatch between a promise and a vote. Score: -1 (contradicts), 0 (unrelated), 1 (aligns).

### Platform Alignment
How closely a member's votes align with their party's official platform planks.

### Funding Correlation
A flagged pattern where votes appear to align with major funding sources.

## External APIs

| API | Purpose | Rate Limits | Auth |
|-----|---------|-------------|------|
| Congress.gov | Members, bills, votes | 5000/hr | API key |
| FEC OpenFEC | Campaign contributions | 1000/hr | API key |
| OpenSecrets | Industry categorization | 200/day | API key |
| Vote Smart | Policy positions | Varies | API key |

## Current Phase

**Phase 1: Foundation** - Setting up infrastructure, database, and basic data ingestion.

See `/docs/phases/PHASE_1_FOUNDATION.md` for detailed tasks.

## Commands

```bash
# Install dependencies
pnpm install

# Run database migrations
pnpm --filter database migrate

# Deploy infrastructure
cd infrastructure && cdk deploy

# Start frontend dev server
pnpm --filter web dev

# Run all tests
pnpm test

# Build all packages
pnpm build
```

## Environment Variables

Required in `.env` or AWS Secrets Manager:

```
# Database
DATABASE_URL=postgresql://...
DATABASE_SECRET_ARN=arn:aws:secretsmanager:...

# External APIs
CONGRESS_API_KEY=...
FEC_API_KEY=...
OPENSECRETS_API_KEY=...

# AWS
AWS_REGION=us-east-1
```

## Getting Help

- Architecture questions: See `/docs/ARCHITECTURE.md`
- Data model questions: See `/docs/DATA_MODEL.md`
- API questions: See `/docs/API_DESIGN.md`
- Domain-specific questions: See `/docs/domains/`
- Phase-specific tasks: See `/docs/phases/`
