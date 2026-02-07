# PHASE_5_MONETIZATION.md

## Duration: Weeks 15-18
## Goal: Revenue, premium features, historical backfill, and public launch

> **Updated**: Extended from 4 weeks to 4 weeks (shifted to 15-18). Added personal finance premium features, conflict explorer UI, historical financial disclosure backfill, and expanded revenue model including newsroom licensing, institutional sales, and grant applications.

### Week 15: Auth & Subscriptions
- [ ] Run migrations: users schema
- [ ] Cognito user pool
- [ ] Authentication flow (email + social)
- [ ] Stripe integration
- [ ] Subscription tiers:
  - Free: Basic voting records, current year net worth summary, top 3 holdings
  - Citizen ($5/mo): Full holdings, transactions, deviation scores, conflict alerts, net worth history
  - Researcher ($25/mo): API access, bulk exports, historical data
  - Organization ($100/mo): Embeddable widgets, custom reports, white-label options

### Week 16: API Tier & Premium Features
- [ ] API key management
- [ ] Rate limiting per tier
- [ ] Bulk endpoints for researchers
- [ ] Webhook system (new conflicts, new trades, new votes)
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Premium UI features:
  - Conflict Explorer: filterable by alert type, severity, industry
  - Timeline view: trade → vote → disclosure sequence
  - Side-by-side: "What they promised" vs "What they hold" vs "How they voted"
  - Net worth history chart with year-over-year comparison
  - STOCK Act compliance scorecard

### Week 17: Historical Backfill & Content
- [ ] Senate financial disclosure backfill (2012-present, ~600 reports)
  - Process in batches of 50 reports/day
  - Prioritize current members, then former
- [ ] House financial disclosure backfill (2016-present, ~4,000+ PDFs)
  - Claude Sonnet parsing at scale
  - Estimated cost: $400-2,000
- [ ] Historical net worth timelines for all members
- [ ] Growth anomaly detection across historical data
- [ ] Deploy blog (Hugo/Ghost)
- [ ] Methodology page (transparent scoring, taxonomy, data sources)
- [ ] First analysis posts:
  - "How Congress Got Richer: Net Worth Trends 2016-Present"
  - "The Most Conflicted Members of Congress"
  - "STOCK Act Violations: Who's Late and How Late?"
- [ ] SEO optimization

### Week 18: Launch
- [ ] Security audit
- [ ] Load testing (target: 10K concurrent users)
- [ ] CloudWatch alarms and monitoring dashboards
- [ ] Newsroom licensing pilot (approach 5-10 local papers)
- [ ] Foundation grant applications (Knight, Democracy Fund, Mozilla)
- [ ] Institutional outreach (universities, libraries, civic orgs)
- [ ] Public launch

### Revenue Model at Launch
| Stream | Month 1 Target | Notes |
|--------|---------------|-------|
| Consumer ($5/mo) | $2,500 (500 subs) | Accessible price, conflict alerts are sticky |
| Researcher ($25/mo) | $1,250 (50 subs) | Academics, journalists |
| Organization ($100/mo) | $500 (5 orgs) | Newsrooms, advocacy groups |
| Foundation grants | $10K+ pipeline | Apply during Week 18 |
| Advertising | $500 | Civic-only advertisers |
| **Monthly total** | **~$15K** | Excluding grants |

### Milestone
Revenue-generating platform live with full accountability chain. Historical data back to 2012-2016. Grant pipeline active. Newsroom licensing pilot launched.
