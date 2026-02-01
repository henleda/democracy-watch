# Database Package

PostgreSQL migrations and seeds.

## Migrations (run in order)
1. public_schema (states, policy_areas, zip_districts)
2. members_schema
3. voting_schema
4. platforms_schema
5. promises_schema
6. finance_schema
7. analytics_schema
8. users_schema

## Key: pgvector for embeddings
```sql
CREATE INDEX USING hnsw (embedding vector_cosine_ops);
```
