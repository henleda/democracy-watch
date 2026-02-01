# ANALYTICS Domain

## Responsibility
Calculated deviations, correlations, and rankings.

## Entities
- **Deviation**: Promise-vote mismatch (alignment_score: -1, 0, 1)
- **FundingCorrelation**: Vote-funding pattern
- **PlatformAlignment**: Vote-platform match
- **MemberRanking**: Aggregated scores

## Key Metrics
- Deviation Score (0-100): Higher = more deviations
- Party Alignment Score (0-100): Higher = more aligned with platform
- Accountability Score: Composite metric

## Refresh Schedule
Rankings refreshed hourly.
