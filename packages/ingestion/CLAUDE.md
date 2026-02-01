# Ingestion Package

External API data ingestion.

## Sources
- congress/: Congress.gov API (4hr schedule)
- fec/: FEC OpenFEC API (daily)
- opensecrets/: OpenSecrets API (daily)

## Error handling
Retry with exponential backoff, DLQ for failures.
