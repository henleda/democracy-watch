# Personal Finance Bounded Context

## Overview

The `personal_finance` bounded context adds congressional financial disclosure tracking to Democracy.Watch. It ingests annual financial disclosure reports and periodic transaction reports (PTRs) from the House Clerk and Senate eFD system, parses them into structured data, and enables conflict-of-interest detection by cross-referencing member portfolios against their votes, committee assignments, and campaign funding sources.

This is the 8th bounded context in the modular monolith, joining: members, voting, promises, platforms, finance (campaign), analytics, and users.

## Legal Note

Senate ethics rules (EIGA § 13107) prohibit use of financial disclosure data for commercial purposes **except by news and communications media for dissemination to the general public**. Democracy.Watch qualifies under this exemption as a civic transparency / news media platform, especially as a 501(c)(3). However:
- Do not sell raw disclosure data as a standalone product
- Frame all features as public interest journalism / civic education
- Include attribution to source (House Clerk / Senate eFD)
- Consult legal counsel before monetizing any derivative dataset

---

## Architecture

### System Context

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PERSONAL FINANCE PIPELINE                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  DATA SOURCES                                                           │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │ Senate eFD       │  │ House Clerk      │  │ Stock Price API  │      │
│  │ efdsearch.       │  │ disclosures-     │  │ (Yahoo Finance   │      │
│  │ senate.gov       │  │ clerk.house.gov  │  │  or similar)     │      │
│  │                  │  │                  │  │                  │      │
│  │ • HTML reports   │  │ • PDF reports    │  │ • Historical     │      │
│  │ • Electronic PTRs│  │ • XML index      │  │   prices for     │      │
│  │ • Scanned PDFs   │  │                  │  │   holdings       │      │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘      │
│           │                     │                      │                │
│           ▼                     ▼                      │                │
│  ┌─────────────────────────────────────────┐           │                │
│  │         INGESTION LAYER                  │           │                │
│  │  Lambda: pf-scrape-senate               │           │                │
│  │  Lambda: pf-scrape-house                │           │                │
│  │  Store raw HTML/PDF in S3               │           │                │
│  └──────────────────┬──────────────────────┘           │                │
│                     │                                   │                │
│                     ▼                                   │                │
│  ┌─────────────────────────────────────────┐           │                │
│  │         PARSING LAYER                    │           │                │
│  │  Lambda: pf-parse-senate-html           │           │                │
│  │  Lambda: pf-parse-house-pdf (Claude)    │           │                │
│  │  Lambda: pf-parse-ptr                   │           │                │
│  │  Output: Structured JSON → Aurora       │           │                │
│  └──────────────────┬──────────────────────┘           │                │
│                     │                                   │                │
│                     ▼                                   │                │
│  ┌─────────────────────────────────────────┐           │                │
│  │         ENRICHMENT LAYER                 │◄──────────┘                │
│  │  Lambda: pf-enrich-holdings             │                            │
│  │  • Resolve ticker symbols               │                            │
│  │  • Fetch current/historical prices      │                            │
│  │  • Estimate values from ranges          │                            │
│  │  • Calculate net worth estimates        │                            │
│  └──────────────────┬──────────────────────┘                            │
│                     │                                                    │
│                     ▼                                                    │
│  ┌─────────────────────────────────────────┐                            │
│  │         ANALYSIS LAYER                   │                            │
│  │  Lambda: pf-detect-conflicts            │                            │
│  │  Lambda: pf-track-net-worth             │                            │
│  │  Lambda: pf-stock-act-compliance        │                            │
│  │  Cross-references: voting, finance,     │                            │
│  │    members (committees) contexts        │                            │
│  └─────────────────────────────────────────┘                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Integration Points with Existing Contexts

```
personal_finance ──► voting
  "Did member vote on bill affecting industry they hold stock in?"
  JOIN: pf.holdings.industry_sector → voting.bills.subjects
  JOIN: pf.transactions.date → voting.roll_calls.date

personal_finance ──► finance (campaign)
  "Do their donors overlap with their personal investments?"
  JOIN: pf.holdings.ticker/company → finance.classified_contributions.industry_code

personal_finance ──► members
  "What committees do they sit on? Do holdings conflict?"
  JOIN: members.committee_assignments → pf.holdings.industry_sector

personal_finance ──► analytics
  "Feed conflict scores into overall accountability score"
  OUTPUT: conflict_score, net_worth_change, stock_act_compliance_rate
```

---

## Data Sources: Detailed Specifications

### Senate Electronic Financial Disclosures

**URL**: https://efdsearch.senate.gov/search/

**Access Method**: Web scraping (no API)

**Authentication**: Must accept terms of use checkbox (agree not to use for prohibited purposes). Automate with headless browser (Playwright/Puppeteer).

**Report Types**:
| Type | Description | Frequency |
|------|-------------|-----------|
| Annual Report | Full asset/income/liability disclosure | Yearly, due May 15 |
| Periodic Transaction Report (PTR) | Individual trades over $1,000 | Within 45 days of transaction |
| New Filer Report | Initial disclosure upon taking office | Within 30 days |
| Termination Report | Final disclosure when leaving office | Within 30 days |
| Amendment | Corrections to prior filings | As needed |

**Electronic vs Paper**: Most current senators file electronically (structured HTML). Some older filings and a few current members still submit scanned PDFs. Electronic filings are parseable with standard HTML parsing. PDFs require OCR or AI extraction.

**Scraping Strategy**:
```python
# Pseudocode for Senate eFD scraping
# 1. Accept terms (Playwright click)
# 2. Search by last name or date range
# 3. Parse search results table for report links
# 4. For each report:
#    - Check if electronic (HTML) or paper (PDF)
#    - Download and store in S3
#    - Queue for parsing

SENATE_EFD_SEARCH_URL = "https://efdsearch.senate.gov/search/"
SENATE_EFD_REPORT_BASE = "https://efdsearch.senate.gov/search/view/"

# Search parameters
params = {
    "first_name": "",
    "last_name": "",        # Or leave blank for all
    "report_type": "annual",  # annual, ptr, new_filer, termination
    "date_start": "01/01/2023",
    "date_end": "12/31/2023",
    "senator_or_candidate": "senator"
}
```

**Rate Limiting**: No official rate limit, but be respectful. Max 1 request/second. Cache aggressively — reports don't change after filing.

### House Financial Disclosures

**URL**: https://disclosures-clerk.house.gov/FinancialDisclosure

**Access Method**: Web scraping + direct PDF download

**Format**: ALL House disclosures are PDFs. Some are electronically generated (text-extractable), others are scanned paper forms.

**Index**: The House Clerk provides XML indexes of all filings:
```
https://disclosures-clerk.house.gov/public_disc/financial-pdfs/{YEAR}/{YEAR}FD.xml
```

Each XML entry contains:
```xml
<Member>
  <Prefix>Hon.</Prefix>
  <Last>Smith</Last>
  <First>John</First>
  <Suffix></Suffix>
  <FilingType>FD Original</FilingType>
  <StateDst>TX03</StateDst>
  <Year>2023</Year>
  <FilingDate>05/15/2024</FilingDate>
  <DocID>20012345</DocID>
</Member>
```

**PDF URL Pattern**:
```
https://disclosures-clerk.house.gov/public_disc/financial-pdfs/{YEAR}/{DOCID}.pdf
```

**Scraping Strategy**:
```python
# 1. Fetch yearly XML index
# 2. Parse for all member filings
# 3. Download PDFs to S3
# 4. Queue for AI parsing (Claude)

HOUSE_INDEX_URL = "https://disclosures-clerk.house.gov/public_disc/financial-pdfs/{year}/{year}FD.xml"
HOUSE_PDF_URL = "https://disclosures-clerk.house.gov/public_disc/financial-pdfs/{year}/{doc_id}.pdf"
```

### Periodic Transaction Reports (Both Chambers)

PTRs are the most time-sensitive data — they reveal trades within 45 days.

**Senate PTRs**: Available on efdsearch.senate.gov, usually electronic HTML.

**House PTRs**: Available as PDFs via the clerk's PTR-specific search or XML index.

**PTR Structure** (per transaction):
- Asset name / description
- Transaction type: Purchase, Sale (Full), Sale (Partial), Exchange
- Transaction date
- Amount range (e.g., $15,001 - $50,000)
- Owner: Self, Spouse, Joint, Dependent Child
- Capital gains over $200: Yes/No

---

## Database Schema

### Core Tables

```sql
-- Schema namespace
CREATE SCHEMA IF NOT EXISTS personal_finance;

-- Annual disclosure reports (one per member per year)
CREATE TABLE personal_finance.disclosure_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES members.members(id),
    bioguide_id VARCHAR(10) NOT NULL,
    chamber VARCHAR(6) NOT NULL CHECK (chamber IN ('senate', 'house')),
    report_type VARCHAR(20) NOT NULL, -- annual, ptr, new_filer, termination, amendment
    filing_year SMALLINT NOT NULL,
    filing_date DATE,
    report_url TEXT NOT NULL,
    source_format VARCHAR(10) NOT NULL, -- html, pdf_electronic, pdf_scanned
    s3_key TEXT, -- Raw file storage location
    parse_status VARCHAR(20) DEFAULT 'pending', -- pending, parsed, failed, needs_review
    parse_confidence DECIMAL(3,2), -- Overall parse confidence
    parsed_at TIMESTAMP,
    ingested_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (bioguide_id, report_type, filing_year, filing_date)
);

CREATE INDEX idx_reports_member ON personal_finance.disclosure_reports (member_id);
CREATE INDEX idx_reports_status ON personal_finance.disclosure_reports (parse_status);
CREATE INDEX idx_reports_year ON personal_finance.disclosure_reports (filing_year);

-- Asset holdings (from Part 3 of annual reports)
CREATE TABLE personal_finance.holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES personal_finance.disclosure_reports(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members.members(id),
    bioguide_id VARCHAR(10) NOT NULL,
    filing_year SMALLINT NOT NULL,
    
    -- Asset identification
    asset_name TEXT NOT NULL,
    asset_type VARCHAR(50), -- stock, bond, mutual_fund, real_estate, bank_account, retirement, business, other
    ticker_symbol VARCHAR(10), -- Resolved ticker if publicly traded
    company_name VARCHAR(200), -- Normalized company name
    
    -- Value (reported in ranges)
    value_range_code VARCHAR(2), -- A through J
    value_range_min DECIMAL(14,2),
    value_range_max DECIMAL(14,2),
    value_estimate DECIMAL(14,2), -- Midpoint or market-informed estimate
    
    -- Income from asset
    income_type VARCHAR(50), -- dividends, interest, capital_gains, rent, royalties, none
    income_range_code VARCHAR(2),
    income_range_min DECIMAL(14,2),
    income_range_max DECIMAL(14,2),
    
    -- Classification
    industry_sector VARCHAR(10), -- Maps to our industry taxonomy
    owner VARCHAR(20), -- self, spouse, joint, dependent
    
    -- Metadata
    parse_confidence DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_holdings_member_year ON personal_finance.holdings (bioguide_id, filing_year);
CREATE INDEX idx_holdings_ticker ON personal_finance.holdings (ticker_symbol) WHERE ticker_symbol IS NOT NULL;
CREATE INDEX idx_holdings_sector ON personal_finance.holdings (industry_sector);

-- Transactions (from PTRs and Part 4a/4b of annual reports)
CREATE TABLE personal_finance.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES personal_finance.disclosure_reports(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members.members(id),
    bioguide_id VARCHAR(10) NOT NULL,
    
    -- Transaction details
    transaction_date DATE,
    notification_date DATE, -- When the PTR was filed
    days_to_report INT, -- transaction_date to notification_date
    
    -- Asset identification
    asset_name TEXT NOT NULL,
    asset_type VARCHAR(50),
    ticker_symbol VARCHAR(10),
    company_name VARCHAR(200),
    
    -- Transaction type and amount
    transaction_type VARCHAR(20) NOT NULL, -- purchase, sale_full, sale_partial, exchange
    amount_range_code VARCHAR(2),
    amount_range_min DECIMAL(14,2),
    amount_range_max DECIMAL(14,2),
    amount_estimate DECIMAL(14,2),
    
    -- Additional details
    owner VARCHAR(20), -- self, spouse, joint, dependent
    capital_gains_over_200 BOOLEAN,
    
    -- Price context (enriched from market data)
    price_at_transaction DECIMAL(10,2),
    price_30d_later DECIMAL(10,2),
    return_30d DECIMAL(5,2), -- Percentage return 30 days after trade
    
    -- Classification
    industry_sector VARCHAR(10),
    
    -- Metadata
    parse_confidence DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transactions_member ON personal_finance.transactions (bioguide_id);
CREATE INDEX idx_transactions_date ON personal_finance.transactions (transaction_date);
CREATE INDEX idx_transactions_ticker ON personal_finance.transactions (ticker_symbol) WHERE ticker_symbol IS NOT NULL;

-- Liabilities (from Part 7 of annual reports)
CREATE TABLE personal_finance.liabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES personal_finance.disclosure_reports(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members.members(id),
    bioguide_id VARCHAR(10) NOT NULL,
    filing_year SMALLINT NOT NULL,
    
    creditor_name TEXT NOT NULL,
    liability_type VARCHAR(50), -- mortgage, student_loan, personal_loan, credit_card, business_loan, other
    amount_range_code VARCHAR(2),
    amount_range_min DECIMAL(14,2),
    amount_range_max DECIMAL(14,2),
    interest_rate VARCHAR(20),
    owner VARCHAR(20),
    
    parse_confidence DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Positions held outside Congress (from Part 8)
CREATE TABLE personal_finance.outside_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES personal_finance.disclosure_reports(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members.members(id),
    bioguide_id VARCHAR(10) NOT NULL,
    filing_year SMALLINT NOT NULL,
    
    organization_name TEXT NOT NULL,
    position_title VARCHAR(100),
    position_type VARCHAR(50), -- board_member, officer, partner, advisor, trustee, other
    start_date DATE,
    end_date DATE,
    compensation BOOLEAN,
    
    -- Potential conflict tracking
    organization_industry VARCHAR(10), -- Our taxonomy code
    
    parse_confidence DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Gifts and travel reimbursements (Parts 5-6)
CREATE TABLE personal_finance.gifts_and_travel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES personal_finance.disclosure_reports(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members.members(id),
    bioguide_id VARCHAR(10) NOT NULL,
    filing_year SMALLINT NOT NULL,
    
    entry_type VARCHAR(10) NOT NULL, -- gift, travel
    source_name TEXT NOT NULL,
    description TEXT,
    value DECIMAL(10,2),
    travel_dates TEXT,
    travel_destination TEXT,
    travel_purpose TEXT,
    
    source_industry VARCHAR(10),
    
    parse_confidence DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Computed / Analysis Tables

```sql
-- Estimated net worth per member per year
CREATE TABLE personal_finance.net_worth_estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES members.members(id),
    bioguide_id VARCHAR(10) NOT NULL,
    filing_year SMALLINT NOT NULL,
    
    -- Asset totals (using midpoint estimates)
    total_assets_min DECIMAL(14,2),
    total_assets_max DECIMAL(14,2),
    total_assets_estimate DECIMAL(14,2),
    
    -- Liability totals
    total_liabilities_min DECIMAL(14,2),
    total_liabilities_max DECIMAL(14,2),
    total_liabilities_estimate DECIMAL(14,2),
    
    -- Net worth
    net_worth_min DECIMAL(14,2),
    net_worth_max DECIMAL(14,2),
    net_worth_estimate DECIMAL(14,2),
    
    -- Year-over-year change
    yoy_change_estimate DECIMAL(14,2),
    yoy_change_pct DECIMAL(5,2),
    
    -- Context
    years_in_office INT,
    cumulative_salary DECIMAL(14,2), -- Congressional salary * years
    growth_above_salary DECIMAL(14,2), -- Net worth growth minus salary
    
    -- Rankings
    chamber_percentile SMALLINT, -- 0-100
    
    calculated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (bioguide_id, filing_year)
);

-- Detected conflicts of interest
CREATE TABLE personal_finance.conflict_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES members.members(id),
    bioguide_id VARCHAR(10) NOT NULL,
    
    alert_type VARCHAR(30) NOT NULL,
    -- Types:
    -- 'portfolio_vote': Voted on bill affecting held stock
    -- 'suspicious_timing': Trade within 30 days of committee action
    -- 'committee_conflict': Holds stock in industry overseen by committee
    -- 'donor_portfolio_overlap': Holds stock in top donor's industry
    -- 'stock_act_late': PTR filed after 45-day deadline
    -- 'growth_anomaly': Net worth growth significantly exceeds salary
    
    severity VARCHAR(10) NOT NULL, -- low, medium, high, critical
    
    -- References (nullable depending on alert_type)
    holding_id UUID REFERENCES personal_finance.holdings(id),
    transaction_id UUID REFERENCES personal_finance.transactions(id),
    vote_id UUID, -- References voting.member_votes
    bill_id UUID, -- References voting.bills
    committee_id VARCHAR(20),
    
    -- Details
    description TEXT NOT NULL,
    evidence JSONB, -- Structured evidence supporting the alert
    
    -- Status
    reviewed BOOLEAN DEFAULT FALSE,
    valid BOOLEAN, -- NULL = not reviewed, TRUE = confirmed, FALSE = false positive
    
    detected_at TIMESTAMP DEFAULT NOW(),
    reviewed_at TIMESTAMP
);

CREATE INDEX idx_conflicts_member ON personal_finance.conflict_alerts (bioguide_id);
CREATE INDEX idx_conflicts_type ON personal_finance.conflict_alerts (alert_type);
CREATE INDEX idx_conflicts_severity ON personal_finance.conflict_alerts (severity);

-- STOCK Act compliance tracking
CREATE TABLE personal_finance.stock_act_compliance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES members.members(id),
    bioguide_id VARCHAR(10) NOT NULL,
    transaction_id UUID REFERENCES personal_finance.transactions(id),
    
    transaction_date DATE NOT NULL,
    filing_date DATE NOT NULL,
    days_elapsed INT NOT NULL,
    deadline_date DATE NOT NULL, -- transaction_date + 45
    compliant BOOLEAN NOT NULL, -- Filed within 45 days?
    days_late INT, -- NULL if compliant
    
    -- Penalties
    fine_amount DECIMAL(8,2), -- $200 per late filing
    
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Lambda Functions

### 1. pf-scrape-senate

**Purpose**: Scrape Senate eFD search results and download reports

**Runtime**: Python 3.11 + Playwright

**Memory**: 1024 MB (headless browser)

**Timeout**: 10 minutes

**Trigger**: EventBridge schedule — daily at 3am ET

**Logic**:
```python
# Pseudocode
def handler(event, context):
    # 1. Launch headless browser
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    
    # 2. Navigate to eFD search, accept terms
    page.goto("https://efdsearch.senate.gov/search/")
    page.click("#agree_statement")  # Accept checkbox
    
    # 3. Search for recent filings (last 7 days for incremental)
    page.fill("#date_start", seven_days_ago)
    page.fill("#date_end", today)
    page.select_option("#report_type", "all")
    page.click("#search_btn")
    
    # 4. Parse results table
    results = parse_search_results(page)
    
    # 5. For each new report:
    for report in results:
        if not already_ingested(report.url):
            # Download HTML or PDF
            content = download_report(report.url)
            # Store in S3
            s3_key = f"senate/{report.bioguide_id}/{report.year}/{report.type}_{report.date}.{'html' if report.is_electronic else 'pdf'}"
            s3.put_object(Bucket=BUCKET, Key=s3_key, Body=content)
            # Insert record
            insert_disclosure_report(report, s3_key)
    
    browser.close()
```

**Playwright Layer**: Package Playwright as a Lambda Layer or use a container image.

**Alternative**: If Playwright is too heavy for Lambda, use Fargate with a scheduled ECS task.

### 2. pf-scrape-house

**Purpose**: Fetch House XML index and download new PDF filings

**Runtime**: Python 3.11

**Memory**: 512 MB

**Timeout**: 5 minutes

**Trigger**: EventBridge schedule — daily at 3:30am ET

**Logic**:
```python
def handler(event, context):
    current_year = datetime.now().year
    
    # 1. Fetch XML index for current year
    index_url = f"https://disclosures-clerk.house.gov/public_disc/financial-pdfs/{current_year}/{current_year}FD.xml"
    xml_data = requests.get(index_url).text
    filings = parse_xml_index(xml_data)
    
    # 2. For each filing not yet ingested
    for filing in filings:
        if not already_ingested(filing.doc_id):
            # Download PDF
            pdf_url = f"https://disclosures-clerk.house.gov/public_disc/financial-pdfs/{current_year}/{filing.doc_id}.pdf"
            pdf_bytes = requests.get(pdf_url).content
            
            # Detect if electronic or scanned
            source_format = detect_pdf_type(pdf_bytes)  # text-extractable vs scanned
            
            # Store in S3
            s3_key = f"house/{filing.bioguide_id}/{current_year}/{filing.filing_type}_{filing.doc_id}.pdf"
            s3.put_object(Bucket=BUCKET, Key=s3_key, Body=pdf_bytes)
            
            # Insert record
            insert_disclosure_report(filing, s3_key, source_format)
```

### 3. pf-parse-senate-html

**Purpose**: Parse electronic Senate disclosures (structured HTML) into database records

**Runtime**: Python 3.11

**Memory**: 512 MB

**Timeout**: 5 minutes

**Trigger**: SQS queue (reports with parse_status='pending' AND source_format='html')

**Logic**:
```python
from bs4 import BeautifulSoup

def parse_annual_report(html_content: str, report_id: str):
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Part 3: Assets
    assets_section = soup.find('section', {'id': 'assets'})  # Actual selector TBD
    for row in assets_section.find_all('tr'):
        cols = row.find_all('td')
        holding = {
            'report_id': report_id,
            'asset_name': cols[0].text.strip(),
            'owner': cols[1].text.strip(),
            'value_range_code': extract_range_code(cols[2].text),
            'income_type': cols[3].text.strip(),
            'income_range_code': extract_range_code(cols[4].text),
        }
        # Resolve ticker if stock
        holding['ticker_symbol'] = resolve_ticker(holding['asset_name'])
        holding['asset_type'] = classify_asset_type(holding['asset_name'])
        holding['industry_sector'] = classify_industry(holding['asset_name'], holding['ticker_symbol'])
        
        # Calculate range values
        holding['value_range_min'], holding['value_range_max'] = RANGE_VALUES[holding['value_range_code']]
        holding['value_estimate'] = (holding['value_range_min'] + holding['value_range_max']) / 2
        
        insert_holding(holding)
    
    # Part 4: Transactions (similar parsing)
    # Part 7: Liabilities (similar parsing)
    # Part 8: Positions (similar parsing)
    # Parts 5-6: Gifts and Travel (similar parsing)
    
    # Update report status
    update_report_status(report_id, 'parsed', confidence=0.95)
```

### 4. pf-parse-house-pdf

**Purpose**: Extract structured data from House PDF disclosures using Claude

**Runtime**: Python 3.11

**Memory**: 1024 MB

**Timeout**: 10 minutes

**Trigger**: SQS queue (reports with parse_status='pending' AND source_format LIKE 'pdf%')

**This is the most complex Lambda** — House PDFs vary enormously in format and quality.

**Strategy**:
1. For text-extractable PDFs: Use pdfplumber first, fall back to Claude if parsing fails
2. For scanned PDFs: Send directly to Claude with document understanding

**Claude Prompt for PDF Extraction**:
```
You are a financial disclosure report parser. Extract all structured data from this congressional financial disclosure report.

Return valid JSON only with the following structure:

{
  "assets": [
    {
      "asset_name": "Apple Inc. (AAPL)",
      "asset_type": "stock",
      "ticker": "AAPL",
      "value_range": "D",
      "income_type": "dividends",
      "income_range": "A",
      "owner": "self"
    }
  ],
  "transactions": [
    {
      "date": "2023-03-15",
      "asset_name": "Microsoft Corp (MSFT)",
      "ticker": "MSFT",
      "transaction_type": "purchase",
      "amount_range": "C",
      "owner": "joint",
      "capital_gains_over_200": false
    }
  ],
  "liabilities": [
    {
      "creditor": "Bank of America",
      "type": "mortgage",
      "amount_range": "G",
      "interest_rate": "3.25%",
      "owner": "joint"
    }
  ],
  "positions": [
    {
      "organization": "Acme Corp",
      "title": "Board Member",
      "start_date": "2020-01",
      "compensation": true
    }
  ],
  "gifts": [],
  "travel": []
}

Value range codes:
A = $1,001 - $15,000
B = $15,001 - $50,000
C = $50,001 - $100,000
D = $100,001 - $250,000
E = $250,001 - $500,000
F = $500,001 - $1,000,000
G = $1,000,001 - $5,000,000
H = $5,000,001 - $25,000,000
I = $25,000,001 - $50,000,000
J = Over $50,000,000

If you cannot determine a value with confidence, use null.
Include a "parse_confidence" field (0-1) for each item.
```

**Model Selection**: Use Claude Sonnet for PDF parsing (better at document understanding than Haiku). Cost is higher but volume is low (~535 reports/year for annual filings).

**Cost Estimate**: ~535 annual reports × ~$0.10-0.50 per report = $50-$270/year for annual parsing.

### 5. pf-enrich-holdings

**Purpose**: Resolve ticker symbols, fetch market prices, classify industries

**Runtime**: Python 3.11

**Memory**: 512 MB

**Timeout**: 5 minutes

**Trigger**: EventBridge schedule — daily at 5am ET (after parsing completes)

**Logic**:
```python
def handler(event, context):
    # 1. Get holdings without ticker symbols
    unresolved = query("SELECT * FROM personal_finance.holdings WHERE ticker_symbol IS NULL AND asset_type IN ('stock', 'mutual_fund')")
    
    for holding in unresolved:
        # Try to resolve ticker from asset name
        ticker = resolve_ticker_symbol(holding.asset_name)
        if ticker:
            # Fetch current price
            price = get_stock_price(ticker)
            # Update holding with refined estimate
            update_holding(holding.id, ticker=ticker, value_estimate=refine_estimate(holding, price))
    
    # 2. Calculate net worth estimates for all members with new data
    members_with_updates = get_members_with_recent_parses()
    for member in members_with_updates:
        calculate_net_worth(member.bioguide_id)
```

**Ticker Resolution Strategy**:
```python
def resolve_ticker_symbol(asset_name: str) -> str | None:
    """Resolve asset name to ticker symbol."""
    
    # 1. Direct match from known patterns
    # "Apple Inc. (AAPL)" → "AAPL"
    ticker_match = re.search(r'\(([A-Z]{1,5})\)', asset_name)
    if ticker_match:
        return ticker_match.group(1)
    
    # 2. Company name lookup table (maintained)
    normalized = normalize_company_name(asset_name)
    if normalized in COMPANY_TICKER_MAP:
        return COMPANY_TICKER_MAP[normalized]
    
    # 3. Search API fallback (Yahoo Finance, etc.)
    results = search_ticker(normalized)
    if results and results[0].confidence > 0.8:
        return results[0].symbol
    
    return None
```

### 6. pf-detect-conflicts

**Purpose**: Cross-reference holdings/transactions against votes, committees, and campaign donors to detect potential conflicts of interest

**Runtime**: Python 3.11

**Memory**: 512 MB

**Timeout**: 5 minutes

**Trigger**: EventBridge schedule — daily at 6am ET

**Conflict Detection Algorithms**:

```python
def detect_portfolio_vote_conflicts(member_id: str):
    """
    Alert type: portfolio_vote
    Detect: Member voted on bill affecting an industry in which they hold stock.
    """
    query = """
        SELECT 
            h.id as holding_id,
            h.ticker_symbol,
            h.industry_sector,
            h.value_estimate,
            mv.vote_position,
            b.bill_id,
            b.title,
            rc.vote_date
        FROM personal_finance.holdings h
        JOIN voting.bills b ON b.subjects @> ARRAY[h.industry_sector]
        JOIN voting.roll_calls rc ON rc.bill_id = b.id
        JOIN voting.member_votes mv ON mv.roll_call_id = rc.id 
            AND mv.member_id = h.member_id
        WHERE h.member_id = %s
            AND h.filing_year = (SELECT MAX(filing_year) FROM personal_finance.holdings WHERE member_id = %s)
            AND h.value_estimate > 15000  -- Only flag substantial holdings
            AND NOT EXISTS (
                SELECT 1 FROM personal_finance.conflict_alerts ca 
                WHERE ca.holding_id = h.id AND ca.vote_id = mv.id
            )
    """
    # For each match, create a conflict alert
    for row in execute(query, [member_id, member_id]):
        create_alert(
            alert_type='portfolio_vote',
            severity=calculate_severity(row.value_estimate),
            description=f"Voted {row.vote_position} on {row.title} while holding ${row.value_estimate:,.0f} in {row.ticker_symbol}",
            evidence={
                'ticker': row.ticker_symbol,
                'holding_value': str(row.value_estimate),
                'vote': row.vote_position,
                'bill': row.title,
                'vote_date': str(row.vote_date)
            }
        )


def detect_suspicious_timing(member_id: str):
    """
    Alert type: suspicious_timing
    Detect: Member traded stock within 30 days of a committee action on related legislation.
    """
    query = """
        SELECT 
            t.id as transaction_id,
            t.ticker_symbol,
            t.transaction_type,
            t.transaction_date,
            t.amount_estimate,
            b.title as bill_title,
            rc.vote_date as action_date,
            ABS(t.transaction_date - rc.vote_date) as days_apart,
            t.return_30d
        FROM personal_finance.transactions t
        JOIN members.committee_assignments ca ON ca.member_id = t.member_id
        JOIN voting.bills b ON b.committee_id = ca.committee_id
        JOIN voting.roll_calls rc ON rc.bill_id = b.id
        WHERE t.member_id = %s
            AND t.ticker_symbol IS NOT NULL
            AND ABS(t.transaction_date - rc.vote_date) <= 30
            AND b.subjects @> ARRAY[t.industry_sector]
    """
    # Flag trades with high return as higher severity
    

def detect_committee_conflicts(member_id: str):
    """
    Alert type: committee_conflict
    Detect: Member sits on committee overseeing industry in which they hold significant stock.
    """
    query = """
        SELECT 
            h.ticker_symbol,
            h.industry_sector,
            h.value_estimate,
            ca.committee_name,
            ca.committee_id
        FROM personal_finance.holdings h
        JOIN members.committee_assignments ca ON ca.member_id = h.member_id
        JOIN ref_committee_industries ci ON ci.committee_id = ca.committee_id
            AND ci.industry_sector = h.industry_sector
        WHERE h.member_id = %s
            AND h.value_estimate > 50000
            AND h.filing_year = EXTRACT(YEAR FROM NOW()) - 1
    """


def detect_stock_act_violations(member_id: str):
    """
    Alert type: stock_act_late
    Detect: PTR filed more than 45 days after transaction.
    """
    query = """
        SELECT 
            t.id,
            t.transaction_date,
            dr.filing_date,
            (dr.filing_date - t.transaction_date) as days_elapsed
        FROM personal_finance.transactions t
        JOIN personal_finance.disclosure_reports dr ON dr.id = t.report_id
        WHERE t.member_id = %s
            AND dr.report_type = 'ptr'
            AND (dr.filing_date - t.transaction_date) > 45
    """


def detect_net_worth_anomalies(member_id: str):
    """
    Alert type: growth_anomaly
    Detect: Net worth growth significantly exceeds congressional salary.
    """
    CONGRESSIONAL_SALARY = 174_000  # As of 2024
    
    query = """
        SELECT 
            n1.filing_year as year,
            n1.net_worth_estimate as current,
            n2.net_worth_estimate as prior,
            n1.net_worth_estimate - n2.net_worth_estimate as growth,
            n1.years_in_office
        FROM personal_finance.net_worth_estimates n1
        JOIN personal_finance.net_worth_estimates n2 
            ON n1.bioguide_id = n2.bioguide_id 
            AND n1.filing_year = n2.filing_year + 1
        WHERE n1.member_id = %s
            AND (n1.net_worth_estimate - n2.net_worth_estimate) > CONGRESSIONAL_SALARY * 3
    """
```

**Severity Calculation**:
```python
def calculate_severity(value_estimate: float, additional_factors: dict = None) -> str:
    """Determine alert severity based on holding value and context."""
    if value_estimate > 1_000_000:
        return 'critical'
    elif value_estimate > 250_000:
        return 'high'
    elif value_estimate > 50_000:
        return 'medium'
    else:
        return 'low'
```

---

## Value Range Constants

```python
# Congressional financial disclosure value ranges
VALUE_RANGES = {
    'A': (1_001, 15_000),
    'B': (15_001, 50_000),
    'C': (50_001, 100_000),
    'D': (100_001, 250_000),
    'E': (250_001, 500_000),
    'F': (500_001, 1_000_000),
    'G': (1_000_001, 5_000_000),
    'H': (5_000_001, 25_000_000),
    'I': (25_000_001, 50_000_000),
    'J': (50_000_001, 100_000_000),  # Cap at $100M for estimate purposes
}

def range_to_values(code: str) -> tuple[float, float, float]:
    """Return (min, max, midpoint) for a range code."""
    if code not in VALUE_RANGES:
        return (0, 0, 0)
    min_val, max_val = VALUE_RANGES[code]
    return (min_val, max_val, (min_val + max_val) / 2)
```

---

## Reference Data

### Committee-to-Industry Mapping

This reference table maps congressional committees to the industries they oversee, enabling committee conflict detection.

```sql
CREATE TABLE personal_finance.ref_committee_industries (
    committee_id VARCHAR(20) NOT NULL,
    committee_name VARCHAR(100) NOT NULL,
    industry_sector VARCHAR(10) NOT NULL,
    relevance VARCHAR(10) DEFAULT 'primary', -- primary, secondary
    PRIMARY KEY (committee_id, industry_sector)
);

-- Seed data (partial — expand for all committees)
INSERT INTO personal_finance.ref_committee_industries VALUES
-- Senate committees
('SSAF', 'Armed Services', 'DEFN', 'primary'),
('SSAS', 'Agriculture', 'AGRI', 'primary'),
('SSBK', 'Banking', 'FNCE', 'primary'),
('SSBK', 'Banking', 'FNCE', 'primary'),
('SSCM', 'Commerce, Science', 'TECH', 'primary'),
('SSCM', 'Commerce, Science', 'TRAN', 'secondary'),
('SSEG', 'Energy', 'ENGY', 'primary'),
('SSEV', 'Environment', 'ENGY', 'secondary'),
('SSFI', 'Finance', 'FNCE', 'primary'),
('SSFI', 'Finance', 'HLTH', 'secondary'),
('SSHR', 'HELP', 'HLTH', 'primary'),
('SSHR', 'HELP', 'EDUC', 'primary'),
('SSHR', 'HELP', 'LABR', 'secondary'),
('SSJU', 'Judiciary', 'LAW', 'primary'),
('SSJU', 'Judiciary', 'TECH', 'secondary'),
-- House committees
('HSAG', 'Agriculture', 'AGRI', 'primary'),
('HSAP', 'Appropriations', 'DEFN', 'secondary'),
('HSAS', 'Armed Services', 'DEFN', 'primary'),
('HSBA', 'Financial Services', 'FNCE', 'primary'),
('HSIF', 'Energy & Commerce', 'ENGY', 'primary'),
('HSIF', 'Energy & Commerce', 'HLTH', 'primary'),
('HSIF', 'Energy & Commerce', 'TECH', 'secondary'),
('HSJU', 'Judiciary', 'LAW', 'primary'),
('HSPW', 'Transportation', 'TRAN', 'primary'),
('HSPW', 'Transportation', 'CNST', 'secondary'),
('HSSM', 'Science, Space', 'TECH', 'primary'),
('HSSM', 'Science, Space', 'DEFN', 'secondary');
```

---

## Ingestion Schedule

| Lambda | Schedule | Source | Volume |
|--------|----------|-------|--------|
| pf-scrape-senate | Daily 3:00am | efdsearch.senate.gov | ~2-10 reports/day |
| pf-scrape-house | Daily 3:30am | disclosures-clerk.house.gov | ~2-10 reports/day |
| pf-parse-senate-html | SQS-triggered | S3 HTML files | As ingested |
| pf-parse-house-pdf | SQS-triggered | S3 PDF files | As ingested |
| pf-enrich-holdings | Daily 5:00am | Internal | All unresolved |
| pf-detect-conflicts | Daily 6:00am | Internal cross-context | All members |

### Bulk Historical Backfill

For initial launch, backfill historical data:
- Senate: eFD has electronic records since 2012
- House: PDF archives available for 8+ years

Backfill strategy:
1. Scrape all available years (2012-present for Senate, 2016-present for House)
2. Process in batches of 50 reports per day
3. Prioritize current members first, then historical
4. Estimated backfill time: 2-4 weeks at conservative pace

---

## API Endpoints

### Public Endpoints (Free Tier)

```
GET /api/v1/members/{bioguide_id}/net-worth
  → Net worth estimate (current year only)
  → Response: { estimate_min, estimate_max, chamber_percentile }

GET /api/v1/members/{bioguide_id}/top-holdings
  → Top 10 holdings by estimated value (current year)
  → Response: [{ asset_name, ticker, value_range, asset_type }]
```

### Premium Endpoints (Citizen $5/mo)

```
GET /api/v1/members/{bioguide_id}/holdings?year={year}
  → Full holdings list for a given year
  → Includes industry classification

GET /api/v1/members/{bioguide_id}/transactions?start={date}&end={date}
  → All trades within date range
  → Includes 30-day return data

GET /api/v1/members/{bioguide_id}/net-worth/history
  → Year-over-year net worth with change calculations

GET /api/v1/members/{bioguide_id}/conflicts
  → All detected conflict-of-interest alerts
  → Includes evidence and severity

GET /api/v1/members/{bioguide_id}/stock-act-compliance
  → STOCK Act filing compliance record
  → Late filings with days elapsed

GET /api/v1/rankings/net-worth-growth
  → Chamber-wide ranking by net worth growth rate

GET /api/v1/rankings/conflicts
  → Members with most conflict alerts
```

### Researcher Endpoints ($25/mo)

```
GET /api/v1/disclosures/bulk?year={year}&chamber={chamber}
  → Bulk export of all parsed disclosures

GET /api/v1/conflicts/search?industry={sector}&type={alert_type}
  → Search conflicts by industry and type

GET /api/v1/transactions/sector/{sector}
  → All congressional trades in a given sector
```

---

## Cost Estimates

### Monthly Costs (Steady State)

| Component | Estimate |
|-----------|----------|
| Lambda (scraping + parsing) | $10-20 |
| Claude Sonnet (PDF parsing, ~50 PDFs/mo) | $5-25 |
| Claude Haiku (industry classification) | $5-10 |
| S3 (PDF/HTML storage) | $2-5 |
| Aurora (additional tables) | $10-20 (marginal) |
| Stock price API | $0-30 (Yahoo Finance free, or paid API) |
| **Total incremental** | **$32-110/mo** |

### One-Time Backfill Costs

| Activity | Estimate |
|----------|----------|
| Senate backfill (2012-present, ~600 reports) | $60-150 (Claude parsing) |
| House backfill (2016-present, ~4,000+ PDFs) | $400-2,000 (Claude parsing) |
| **Total backfill** | **$460-2,150** |

---

## Development Phasing

### Phase 1: Senate Electronic Filings (Week 1-2)
- [ ] Build pf-scrape-senate Lambda
- [ ] Build pf-parse-senate-html Lambda
- [ ] Create database schema
- [ ] Parse current year annual reports
- [ ] Basic net worth calculation
- **Output**: Net worth estimates for all 100 senators

### Phase 2: House PDF Parsing (Week 3-4)
- [ ] Build pf-scrape-house Lambda
- [ ] Build pf-parse-house-pdf Lambda (Claude)
- [ ] Test against sample PDFs (electronic + scanned)
- [ ] Parse current year annual reports
- **Output**: Net worth estimates for all 435 reps

### Phase 3: Transaction Tracking (Week 5-6)
- [ ] PTR scraping for both chambers
- [ ] pf-enrich-holdings Lambda (ticker resolution, prices)
- [ ] 30-day return calculation
- [ ] STOCK Act compliance checking
- **Output**: Real-time trade tracking with compliance monitoring

### Phase 4: Conflict Detection (Week 7-8)
- [ ] Committee-industry reference data
- [ ] pf-detect-conflicts Lambda (all 5 alert types)
- [ ] Cross-context joins (voting, finance, members)
- [ ] API endpoints
- [ ] Frontend integration
- **Output**: Full conflict-of-interest detection system

### Phase 5: Historical Backfill (Weeks 9-12)
- [ ] Backfill Senate (2012-present)
- [ ] Backfill House (2016-present)
- [ ] Year-over-year net worth history
- [ ] Growth anomaly detection
- [ ] Rankings and analytics
- **Output**: Complete historical accountability data

---

## Frontend Components

### Member Profile: Finance Tab
- Net worth range estimate with year-over-year chart
- Top 10 holdings (sortable by value, industry)
- Recent trades with 30-day return
- Conflict alerts (severity-colored badges)
- STOCK Act compliance score

### Rankings Page: Financial Section
- Wealthiest members of Congress
- Biggest net worth gainers (absolute and %)
- Most STOCK Act violations
- Most conflict-of-interest alerts
- Most active traders

### Conflict Explorer
- Filterable by alert type, severity, industry
- Timeline view showing trade → vote → disclosure sequence
- Side-by-side: "What they promised" vs "What they hold" vs "How they voted"

---

## Testing

### Unit Tests
```python
def test_value_range_parsing():
    assert range_to_values('A') == (1001, 15000, 8000.5)
    assert range_to_values('J') == (50000001, 100000000, 75000000.5)

def test_ticker_resolution():
    assert resolve_ticker("Apple Inc. (AAPL)") == "AAPL"
    assert resolve_ticker("MICROSOFT CORP") == "MSFT"
    assert resolve_ticker("Bank deposit") is None

def test_stock_act_compliance():
    assert is_compliant(transaction_date="2024-01-15", filing_date="2024-02-28") == True  # 44 days
    assert is_compliant(transaction_date="2024-01-15", filing_date="2024-03-05") == False  # 50 days

def test_conflict_severity():
    assert calculate_severity(2_000_000) == 'critical'
    assert calculate_severity(300_000) == 'high'
    assert calculate_severity(75_000) == 'medium'
    assert calculate_severity(10_000) == 'low'
```

### Integration Tests
- Scrape 5 known Senate electronic filings, verify parsing accuracy
- Scrape 5 known House PDFs, verify Claude extraction accuracy
- Cross-reference 3 known conflict cases (e.g., widely reported suspicious trades)
- Verify net worth calculation against published estimates (e.g., OpenSecrets historical data)
