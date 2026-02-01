# PHASE_1_FOUNDATION.md

## Duration: Weeks 1-3
## Goal: Core infrastructure with basic data flowing

### Week 1: Infrastructure
- [ ] CDK project setup
- [ ] VPC, Aurora PostgreSQL Serverless v2
- [ ] Enable pgvector extension
- [ ] Run migrations: public, members, voting schemas
- [ ] Secrets Manager for API keys

### Week 2: Data Ingestion
- [ ] Congress.gov API client
- [ ] Lambda: ingest-congress (members, bills, votes)
- [ ] EventBridge schedule (every 4 hours)
- [ ] Load 535 members + 118th Congress data

### Week 3: API & Frontend Shell
- [ ] API Gateway + Lambda handlers
- [ ] Endpoints: /members, /members/{id}, /members/by-zip/{zip}
- [ ] Next.js project with home page
- [ ] Zip code search functionality
- [ ] Deploy to Amplify

### Milestone
Users can search by zip, see their reps, view basic voting records.
