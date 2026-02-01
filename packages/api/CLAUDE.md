# API Package

Lambda handlers for REST API.

## Handlers
- members.ts: /members endpoints
- voting.ts: /bills, /votes endpoints
- rankings.ts: /rankings endpoint
- search.ts: /search endpoint

## Response format
```json
{ "data": {...}, "meta": { "total", "limit", "offset" } }
```
