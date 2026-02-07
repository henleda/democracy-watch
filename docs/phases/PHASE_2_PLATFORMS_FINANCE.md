# PHASE_2_PLATFORMS_FINANCE.md

## Duration: Weeks 4-6
## Goal: Party platforms, campaign finance data, and Senate financial disclosures

> **Updated**: Extended from 2 weeks to 3 weeks. Added AI-powered industry classification (replacing OpenSecrets API, which is no longer available). Added Senate electronic financial disclosure scraping for net worth estimates.

### Week 4: Party Platforms
- [ ] Run migrations: platforms schema
- [ ] Load 2024 Republican platform document
- [ ] Load 2024 Democratic platform document
- [ ] Parse platforms into planks
- [ ] Generate embeddings for planks (Bedrock Titan)
- [ ] Build platform alignment calculation

### Week 5: Campaign Finance
- [ ] Run migrations: finance schema (raw_contributions, classified_contributions, classification_cache, member_industry_totals, member_top_donors, member_funding_summary)
- [ ] FEC OpenFEC API client
- [ ] Lambda: ingest-fec (daily contributions, weekly bulk)
- [ ] Senate LDA Database client (lobbying data, replaces OpenSecrets lobbying)
- [ ] Lambda: ingest-lobbying
- [ ] Deploy industry taxonomy reference tables (17 sectors, 52 industries)
- [ ] Lambda: finance-classify-donors (Claude Haiku AI classification)
  - Pre-classification rules for RETIRED, HOMEMAKER, etc.
  - Classification cache with 70% hit rate target
  - Batch processing: 50 donors per Claude request
  - Confidence thresholds: ≥0.85 accept, 0.60-0.84 flag, <0.60 manual review
- [ ] Calculate member_industry_totals aggregations
- [ ] Add funding breakdown to member detail page

### Week 6: Senate Financial Disclosures
- [ ] Run migrations: personal_finance schema (disclosure_reports, holdings, transactions, liabilities, net_worth_estimates)
- [ ] Lambda: pf-scrape-senate (Playwright headless browser)
  - Navigate efdsearch.senate.gov, accept terms
  - Search by date range for recent filings
  - Download HTML reports to S3
- [ ] Lambda: pf-parse-senate-html (BeautifulSoup parsing)
  - Parse Part 3: Assets (name, type, value range, income)
  - Parse Part 4: Transactions
  - Parse Part 7: Liabilities
  - Parse Part 8: Outside positions
  - Resolve ticker symbols from asset names
- [ ] Calculate net worth estimates for all 100 senators
  - Midpoint estimates from value ranges
  - Year-over-year change calculation
- [ ] Add net worth summary to senator profile pages

### Data Sources Summary
| Source | Data | Status |
|--------|------|--------|
| FEC OpenFEC API | Raw contributions | ✅ Primary |
| Senate LDA Database | Lobbying data | ✅ Replaces OpenSecrets |
| Claude Haiku | Industry classification | ✅ Replaces OpenSecrets |
| Senate eFD | Financial disclosures | ✅ New |
| ~~OpenSecrets API~~ | ~~Industry codes~~ | ❌ Discontinued |

### Milestone
Party rebel rankings visible. Top funding sources on member profiles (AI-classified). Net worth estimates for all 100 senators with year-over-year tracking.
