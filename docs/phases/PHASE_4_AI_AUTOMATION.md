# PHASE_4_AI_AUTOMATION.md

## Duration: Weeks 10-14
## Goal: Automated promise discovery, House financial disclosures, and conflict-of-interest detection

> **Updated**: Extended from 4 weeks to 5 weeks. Added House PDF financial disclosure parsing (Claude Sonnet), periodic transaction report tracking, conflict-of-interest detection engine, and STOCK Act compliance monitoring. This phase brings the full "promise → vote → donor → portfolio" accountability chain online.

### Week 10: Promise Discovery Pipeline
- [ ] YouTube channel monitor for member channels
- [ ] C-SPAN API integration
- [ ] Campaign website scraper
- [ ] ECS Fargate discovery agent
- [ ] SQS queues for content pipeline

### Week 11: Promise Extraction Pipeline
- [ ] YouTube transcript integration
- [ ] Amazon Transcribe for custom audio
- [ ] Lambda: ai-extract-promises (Bedrock Claude)
  - Structured output: statement, topic, specificity, verifiable, timestamp
  - Confidence scoring
- [ ] Human review queue for low-confidence extractions

### Week 12: House Financial Disclosures & PTR Tracking
- [ ] Lambda: pf-scrape-house
  - Fetch House Clerk XML index for current year
  - Download PDF filings to S3
  - Detect electronic vs scanned PDFs
- [ ] Lambda: pf-parse-house-pdf (Claude Sonnet)
  - Text-extractable PDFs: pdfplumber first, Claude fallback
  - Scanned PDFs: Claude document understanding
  - Extract: assets, transactions, liabilities, positions, gifts, travel
  - Parse value range codes (A-J) into min/max/estimate
- [ ] Lambda: pf-parse-ptr (both chambers)
  - Periodic Transaction Report scraping
  - Real-time trade tracking
- [ ] Lambda: pf-enrich-holdings
  - Ticker symbol resolution (regex → lookup table → search API)
  - Historical stock price fetching
  - 30-day return calculation for transactions
  - Industry sector classification for holdings
- [ ] Net worth estimates for all 435 House members
- [ ] STOCK Act compliance checking
  - Flag PTRs filed > 45 days after transaction
  - Calculate days_late, track fine amounts ($200/violation)

### Week 13: Conflict Detection & Correlation Analysis
- [ ] Deploy committee-to-industry reference mapping
- [ ] Lambda: pf-detect-conflicts (5 alert types):
  - **portfolio_vote**: Voted on bill affecting held stock (>$15K holdings)
  - **suspicious_timing**: Trade within 30 days of committee action on related legislation
  - **committee_conflict**: Holds >$50K in stock overseen by their committee
  - **donor_portfolio_overlap**: Top campaign donors and personal holdings in same industry
  - **growth_anomaly**: Net worth growth exceeds 3x congressional salary
- [ ] Severity calculation: low/medium/high/critical based on holding value
- [ ] Lambda: ai-correlate-funding (campaign finance ↔ votes)
- [ ] Lambda: ai-generate-narrative (plain-language conflict summaries)
- [ ] "Latest Flagged" section on home page

### Week 14: Full Automation & Expansion
- [ ] Expand promise tracking to full House (435) + Senate (100)
- [ ] Step Functions orchestration for all pipelines
- [ ] Alerts/notifications system
  - New conflict detected → email/push notification
  - New trade by tracked member → alert
  - STOCK Act violation → alert
- [ ] Unified member profile: promises + votes + funding + portfolio + conflicts

### Data Pipeline Summary

| Pipeline | Trigger | Model | Volume |
|----------|---------|-------|--------|
| Promise discovery | EventBridge (daily) | — | ~50 sources/day |
| Promise extraction | SQS | Claude Haiku | ~$0.50/member |
| House PDF parsing | SQS | Claude Sonnet | ~$0.10-0.50/report |
| PTR parsing | EventBridge (daily) | BeautifulSoup + Claude | ~5-15/day |
| Holdings enrichment | EventBridge (daily) | — | ~500 holdings |
| Conflict detection | EventBridge (daily) | SQL + Claude | All 535 members |
| Funding correlation | EventBridge (daily) | SQL + statistics | All 535 members |

### Milestone
535 members tracked automatically with full accountability chain: promises → votes → campaign donors → personal portfolio → conflict alerts. STOCK Act compliance monitoring live.
