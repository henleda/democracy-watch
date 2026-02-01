# AI_AGENTS.md - AI/ML Pipeline

## Overview

Amazon Bedrock powers all AI capabilities:
- **Claude Sonnet**: Promise extraction, narrative generation
- **Claude Haiku**: Alignment analysis (bulk, cost-efficient)  
- **Titan Embeddings**: Vector embeddings (1024 dimensions)

## Pipeline Flow

```
Discovery → Extraction → Classification → Embedding → Alignment → Correlation → Narrative
```

## Agent 1: Discovery

Finds new content sources for promise extraction.

| Source | Method | Interval |
|--------|--------|----------|
| YouTube | Channel monitor + search | 6 hours |
| C-SPAN | Archives API | 1 hour |
| Campaign sites | Sitemap crawl | Daily |

## Agent 2: Extraction

Converts media to text.

- YouTube: Use `youtube-transcript` package (free, includes auto-captions)
- Fallback: Amazon Transcribe (~$0.024/min)
- Web: Mozilla Readability for article extraction

## Agent 3: Classification (Promise Extraction)

Uses Claude Sonnet to extract structured promises.

**Model**: `anthropic.claude-3-5-sonnet-20241022-v2:0`
**Temperature**: 0.3 (consistency)
**Max tokens**: 4096

**Output schema**:
```typescript
interface ExtractedPromise {
  statement: string;
  policyArea: string;  // From taxonomy
  positionType: 'promise' | 'commitment' | 'opposition' | 'value_statement';
  positionStance: 'support' | 'oppose';
  specificity: 1 | 2 | 3 | 4 | 5;
  confidence: number;  // 0-1
}
```

**Policy areas**: abortion_reproductive_rights, agriculture, budget_deficit, civil_rights, crime_justice, defense_military, economy_jobs, education, energy_environment, firearms, foreign_policy, healthcare, immigration, infrastructure, social_security_medicare, taxes, technology_privacy, trade, veterans, voting_elections

## Agent 4: Embedding

Generates vectors for semantic search.

**Model**: `amazon.titan-embed-text-v2:0`
**Dimensions**: 1024
**Normalize**: true

```typescript
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const bedrock = new BedrockRuntimeClient({ region: 'us-east-1' });

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await bedrock.send(new InvokeModelCommand({
    modelId: 'amazon.titan-embed-text-v2:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      inputText: text.substring(0, 8000),
      dimensions: 1024,
      normalize: true,
    }),
  }));
  
  const result = JSON.parse(new TextDecoder().decode(response.body));
  return result.embedding;
}
```

## Agent 5: Alignment Analysis

Determines if votes match promises.

**Model**: `anthropic.claude-3-5-haiku-20241022-v1:0` (cost-efficient for bulk)
**Temperature**: 0.2

**Output**:
```typescript
interface AlignmentResult {
  alignmentScore: -1 | 0 | 1;  // -1 contradicts, 0 unclear, 1 aligns
  confidence: number;
  explanation: string;
  isSignificant: boolean;
}
```

## Agent 6: Correlation Analysis

Finds patterns between votes and funding.

1. Identify industries affected by bill
2. Check member's funding from those industries
3. Analyze if vote favors industry interests
4. Calculate statistical significance (p-value)
5. Flag if p < 0.05 and funding > $50K

## Agent 7: Narrative Generation

Creates human-readable stories for flagged items.

**Model**: `anthropic.claude-3-5-sonnet-20241022-v2:0`
**Temperature**: 0.7
**Tone**: Neutral, factual, investigative journalism style

## Cost Estimate

| Component | Monthly Volume | Cost |
|-----------|---------------|------|
| Promise Extraction (Sonnet) | 10M tokens | $45 |
| Alignment (Haiku) | 20M tokens | $10 |
| Narrative (Sonnet) | 2M tokens | $15 |
| Embeddings (Titan) | 5M tokens | $100 |
| **Total** | | **~$170/month** |

## Lambda Configuration

| Function | Memory | Timeout |
|----------|--------|---------|
| extract-promises | 1024MB | 5min |
| analyze-alignment | 512MB | 2min |
| generate-embedding | 512MB | 1min |
| generate-narrative | 512MB | 2min |

## IAM Permissions

```json
{
  "Effect": "Allow",
  "Action": [
    "bedrock:InvokeModel",
    "bedrock:InvokeModelWithResponseStream"
  ],
  "Resource": [
    "arn:aws:bedrock:*::foundation-model/anthropic.claude-*",
    "arn:aws:bedrock:*::foundation-model/amazon.titan-embed-*"
  ]
}
```
      normalize: true,
    }),
  }));
  
  const result = JSON.parse(new TextDecoder().decode(response.body));
  return result.embedding;
}

export async function generateBatchEmbeddings(
  texts: string[]
): Promise<number[][]> {
  // Process in parallel with rate limiting
  const BATCH_SIZE = 10;
  const results: number[][] = [];
  
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const embeddings = await Promise.all(
      batch.map(text => generateEmbedding(text))
    );
    results.push(...embeddings);
  }
  
  return results;
}
```

---

## Agent 5: Alignment Analysis

Analyzes whether votes align with promises.

```typescript
// packages/ai/src/alignment/analyze.ts

const ALIGNMENT_PROMPT = `Analyze whether this congressional vote aligns with the stated position:

STATED POSITION (from {promiseDate}):
"{promiseStatement}"
Policy area: {policyArea}

VOTE (on {voteDate}):
Bill: {billTitle}
Summary: {billSummary}
Vote cast: {votePosition}
Bill result: {billResult}

Determine:
1. alignment_score: -1 (clearly contradicts), 0 (unrelated/unclear), 1 (aligns with position)
2. confidence: 0.0-1.0 
3. explanation: 2-3 sentence reasoning
4. is_significant: true if this is a meaningful test of the stated position

Consider:
- Does the bill directly address the policy area?
- Would a reasonable observer see this as matching or contradicting?
- Are there procedural reasons (amendments, poison pills) that might explain seeming contradictions?

Return JSON only.`;

export async function analyzeAlignment(
  promise: { statement: string; policyArea: string; sourceDate: string },
  vote: { position: string; date: string },
  bill: { title: string; summary: string; result: string }
): Promise<{
  alignmentScore: -1 | 0 | 1;
  confidence: number;
  explanation: string;
  isSignificant: boolean;
}> {
  // Use Haiku for cost efficiency on bulk analysis
  const response = await bedrock.send(new InvokeModelCommand({
    modelId: 'anthropic.claude-3-5-haiku-20241022-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 1024,
      temperature: 0.2,
      messages: [
        { role: 'user', content: formatPrompt(promise, vote, bill) }
      ],
    }),
  }));
  
  return parseAlignmentResponse(response);
}
```

---

## Agent 6: Narrative Generation

Generates human-readable narratives for flagged deviations.

```typescript
// packages/ai/src/narrative/generate.ts

const NARRATIVE_PROMPT = `Write a factual, neutral news-style paragraph about this voting deviation:

Member: {memberName} ({party}-{state})

Promise made on {promiseDate}:
"{promiseStatement}"

Vote on {voteDate}:
Voted {votePosition} on {billTitle}
{billSummary}

Funding context (if relevant):
{fundingContext}

Write a 2-3 paragraph factual summary that:
1. States the promise and when it was made
2. Describes the vote and its outcome
3. Notes any relevant funding connections (if provided)
4. Does NOT editorialize or make judgments
5. Uses neutral, journalistic language

The goal is transparency, not advocacy.`;

export async function generateNarrative(
  deviation: DeviationWithContext
): Promise<string> {
  const response = await bedrock.send(new InvokeModelCommand({
    modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    // ... Sonnet for quality narrative generation
  }));
  
  return parseNarrativeResponse(response);
}
```

---

## Cost Estimation

| Operation | Model | Est. Tokens | Cost per 1K ops |
|-----------|-------|-------------|-----------------|
| Promise extraction | Claude Sonnet | 10K in, 2K out | $33 |
| Alignment analysis | Claude Haiku | 2K in, 500 out | $0.60 |
| Narrative generation | Claude Sonnet | 3K in, 1K out | $18 |
| Embeddings | Titan v2 | 500 in | $0.01 |

**Monthly estimates (full Congress):**
- Initial corpus: ~$500-1,000 (one-time)
- Ongoing operations: ~$100-200/month
