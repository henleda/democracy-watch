# PHASE_3_PROMISES_MVP.md

## Duration: Weeks 7-9
## Goal: Promise tracking with manual curation

> **Updated**: Shifted from weeks 6-8 to weeks 7-9 due to Phase 2 extension.

### Week 7: Promise Infrastructure
- [ ] Run migrations: promises schema
- [ ] Build admin interface for manual promise entry
- [ ] Create policy_areas taxonomy
- [ ] Manually curate promises for 50 target members
  - Focus: TX, FL, PA, MI, AZ House Republicans
- [ ] Generate embeddings for promises (Bedrock Titan)

### Week 8: Deviation Analysis
- [ ] Run migrations: analytics schema
- [ ] Build semantic matching (promise ↔ bill via cosine similarity)
- [ ] Lambda: ai-analyze-alignment (Bedrock Claude)
  - Input: promise text + bill text
  - Output: SUPPORTS | CONTRADICTS | NEUTRAL | UNCLEAR + confidence
- [ ] Calculate initial deviation scores
- [ ] Weighting: High specificity 1.5x, signature issues 2.0x, procedural 0.5x

### Week 9: Rankings & Launch
- [ ] Build member_rankings calculation
- [ ] Top deviators ranking page
- [ ] Party rebels ranking page
- [ ] Home page ranking cards
- [ ] Soft launch to beta users

### Milestone
MVP live with deviation scores for 50 members, top deviators, party rebels.
