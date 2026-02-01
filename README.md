# Democracy.Watch

**Congressional Accountability Platform**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-pre--alpha-orange.svg)]()

> Making political accountability transparent and accessible by connecting campaign promises to voting records and funding sources.

---

## 🎯 Mission

Democracy.Watch is a civic technology platform that empowers citizens to hold their elected representatives accountable. We track what politicians promise, how they vote, and who funds them—then surface the patterns that matter.

## 💡 Core Hypothesis

Politicians' voting patterns deviate from their campaign promises, and these deviations correlate with funding sources. By making these connections visible and searchable, we can create meaningful accountability pressure.

## ✨ Key Features

- **Zip Code Lookup** — Find your representatives instantly
- **Promise Tracking** — AI-extracted commitments from speeches, interviews, and campaign materials
- **Deviation Scoring** — Quantified measure of promise-to-vote alignment
- **Funding Correlations** — Industry contribution patterns mapped to voting behavior
- **Party Rebel Rankings** — Members who deviate most from party platform
- **Real-time Alerts** — Notifications when your reps vote against their promises

---

## 🏗️ Architecture

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, React, Tailwind CSS |
| **API** | AWS API Gateway, Lambda (Node.js) |
| **Database** | Aurora PostgreSQL Serverless v2 + pgvector |
| **AI/ML** | Amazon Bedrock (Claude, Titan Embeddings) |
| **Orchestration** | AWS Step Functions |
| **Scheduling** | Amazon EventBridge |
| **Auth** | Amazon Cognito |
| **Payments** | Stripe |
| **Hosting** | Vercel (frontend), AWS (backend) |

### Domain Architecture

We use a modular monolith pattern with 7 bounded contexts:

```
┌─────────────────────────────────────────────────────────────────┐
│                         democracy.watch                          │
├──────────┬──────────┬──────────┬──────────┬──────────┬──────────┤
│ members  │  voting  │ promises │ platforms│ finance  │ analytics│
│          │          │          │          │          │          │
│ • Reps   │ • Bills  │ • State- │ • Party  │ • Contri-│ • Scores │
│ • Terms  │ • Votes  │   ments  │   planks │   butions│ • Rankings│
│ • Dist.  │ • Roll   │ • Sources│ • Embed- │ • PACs   │ • Trends │
│          │   calls  │ • Tags   │   dings  │ • Donors │          │
├──────────┴──────────┴──────────┴──────────┴──────────┴──────────┤
│                             users                                │
│              • Auth • Preferences • Alerts • Subscriptions       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Pipelines

### 1. Congress.gov Ingestion
- **Schedule**: Members daily, bills/votes every 4 hours
- **Data**: 535 members, ~15K bills/Congress, ~500 roll calls/year
- **Process**: EventBridge → Lambda → Congress.gov API → Aurora

### 2. Campaign Finance Pipeline
- **Sources**: FEC OpenFEC API + OpenSecrets API
- **Output**: Industry-aggregated contributions, top donors, PAC relationships
- **Schedule**: Weekly bulk + daily incremental

### 3. Embedding Generation
- **Model**: Amazon Titan Embed v2 (1536 dimensions)
- **Indexed**: Bills, promises, party platform planks
- **Search**: pgvector with HNSW indexes (cosine similarity)

### 4. AI Promise Extraction
Four-stage Step Functions pipeline:
```
DISCOVER → EXTRACT → CLASSIFY → ANALYZE
   │          │          │          │
YouTube    Transcribe   Claude    Vector
C-SPAN     Parse HTML   Extract   Match
Websites   PDF→Text    Promises   Score
```

### 5. Deviation Scoring Algorithm
```sql
-- Simplified scoring logic
deviation_score = 100 - (aligned_votes / total_matched_votes * 100)

-- Where alignment is determined by:
-- 1. Semantic matching (promise embedding <=> bill embedding > 0.75)
-- 2. AI classification (SUPPORTS | CONTRADICTS | NEUTRAL)
-- 3. Weighted by specificity and issue importance
```

### 6. Funding Correlation Analysis
- Industry-vote correlation coefficients
- Promise-funding conflict detection
- Statistical significance testing (Bonferroni-corrected)

---

## 🗓️ Development Roadmap

### Phase 1: Foundation (Weeks 1-3)
- [ ] AWS CDK infrastructure
- [ ] Aurora PostgreSQL + pgvector setup
- [ ] Congress.gov data ingestion
- [ ] Basic API endpoints
- [ ] Next.js frontend shell
- **Milestone**: Zip code lookup working

### Phase 2: Platforms & Finance (Weeks 4-5)
- [ ] Party platform parsing and embeddings
- [ ] FEC/OpenSecrets integration
- [ ] Funding breakdown UI
- **Milestone**: Party rebel rankings live

### Phase 3: Promises MVP (Weeks 6-8)
- [ ] Promise database schema
- [ ] Admin curation interface
- [ ] Manual entry for 50 target members
- [ ] Deviation scoring engine
- **Milestone**: Core value proposition live

### Phase 4: AI Automation (Weeks 9-12)
- [ ] YouTube/C-SPAN monitoring
- [ ] Automated promise extraction
- [ ] Funding correlation analysis
- [ ] Expand to full Congress (535 members)
- **Milestone**: Full automation operational

### Phase 5: Monetization & Launch (Weeks 13-16)
- [ ] Cognito authentication
- [ ] Stripe subscription billing
- [ ] API tier with rate limiting
- [ ] Content/SEO strategy
- [ ] Security audit
- **Milestone**: Public launch

**Launch Targets (Month 6)**:
- 50K monthly active users
- 500 paid subscribers
- 50 API customers
- 10K+ promises tracked

---

## 💰 Business Model

### Revenue Streams

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0 | Zip lookup, basic profiles, top 10 rankings, 100 req/day |
| **Citizen** | $5/mo | Full details, funding correlations, alerts, ad-free, 1K req/day |
| **Researcher** | $25/mo | API access, bulk export, historical data, 100K req/mo |
| **Organization** | $100/mo | 1M req/mo, webhooks, priority support, SLA |

### Corporate Structure

We're incorporating as a **Public Benefit Corporation** to balance commercial sustainability with mission protection. This structure:
- Legally enshrines political accountability in our charter
- Allows commercial revenue without non-profit restrictions
- Protects the mission from being diluted by profit pressure
- Enables future investment while maintaining credibility

---

## 🚀 Future Extensions

### Near-Term (6-12 months)
- State legislature expansion (7,383 legislators via OpenStates)
- Native iOS/Android app with push notifications
- Election mode for candidate comparison
- Committee deep dives (attendance, amendments)
- Embeddable widgets for media partners

### Medium-Term (1-2 years)
- Lobbying connection mapping (LDA data)
- Judicial accountability (federal courts)
- Executive branch tracking
- Predictive vote modeling (ML)
- International expansion (UK, EU, Canada)

### Moonshots (2+ years)
- AI constituent assistant (voice-enabled)
- Real-time fact-check browser extension
- Blockchain commitment registry
- "Democracy.Watch Certified" accountability badge
- Decentralized governance R&D

---

## 🤝 Contributing

We welcome contributors who share our mission of making democracy more accountable!

### Getting Started

```bash
# Clone the repository
git clone https://github.com/[org]/democracy-watch.git
cd democracy-watch

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Run development server
npm run dev
```

### Areas We Need Help

- **Frontend**: React components, data visualization, accessibility
- **Backend**: Lambda functions, API design, database optimization
- **Data Engineering**: Pipeline reliability, new data sources
- **AI/ML**: Prompt engineering, embedding strategies, model evaluation
- **DevOps**: CDK infrastructure, CI/CD, monitoring
- **Research**: Political science expertise, methodology validation
- **Design**: UX research, visual design, information architecture

### Code of Conduct

This is a non-partisan project. We track accountability across all parties equally. Contributors must commit to:
- Political neutrality in code and data presentation
- Methodological transparency
- Respectful discourse
- Data accuracy over sensationalism

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 📬 Contact

- **Website**: [democracy.watch](https://democracy.watch) (coming soon)
- **Email**: hello@democracy.watch
- **Twitter**: [@democracywatch](https://twitter.com/democracywatch)

---

<p align="center">
  <strong>Built with 🗳️ for a more accountable democracy</strong>
</p>
