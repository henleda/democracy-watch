# Industry Taxonomy Structure

## Overview

This document defines the standardized industry taxonomy used by Democracy.Watch to classify campaign contribution donors. The taxonomy is designed to:

1. **Be comprehensive** - Cover all plausible donor employment scenarios
2. **Be politically relevant** - Group industries by policy impact areas
3. **Be transparent** - Published methodology for public scrutiny
4. **Be maintainable** - Simple enough to update as industries evolve

## Taxonomy Design Principles

### Two-Level Hierarchy

```
SECTOR (Parent)
  └── INDUSTRY (Child)
```

- **Sectors**: 16 broad categories (3-4 character codes)
- **Industries**: 52 specific classifications (parent code + 2 digits)

### Code Format

| Level | Format | Example |
|-------|--------|---------|
| Sector | `[A-Z]{3,4}` | `TECH`, `HLTH`, `FNCE` |
| Industry | `[A-Z]{3,4}[0-9]{2}` | `TECH01`, `HLTH03`, `FNCE02` |

---

## Complete Taxonomy

### AGRI - Agriculture & Food

| Code | Name | Description |
|------|------|-------------|
| AGRI01 | Crop Production | Farms, orchards, vineyards, agricultural cooperatives |
| AGRI02 | Livestock & Dairy | Ranches, dairy farms, poultry, meat processing |
| AGRI03 | Food & Beverage Manufacturing | Food processors, beverage companies, packaged goods |
| AGRI04 | Agricultural Services | Farm equipment, seeds, fertilizers, agricultural tech |

**Policy Relevance**: Farm subsidies, trade policy, environmental regulations, water rights

---

### ENGY - Energy

| Code | Name | Description |
|------|------|-------------|
| ENGY01 | Oil & Gas | Exploration, production, refining, pipelines |
| ENGY02 | Coal & Mining | Coal mining, mineral extraction |
| ENGY03 | Electric Utilities | Power generation, transmission, distribution |
| ENGY04 | Renewable Energy | Solar, wind, hydroelectric, geothermal |
| ENGY05 | Nuclear | Nuclear power generation, uranium mining |

**Policy Relevance**: Climate policy, drilling permits, renewable mandates, carbon pricing

---

### FNCE - Finance & Insurance

| Code | Name | Description |
|------|------|-------------|
| FNCE01 | Commercial Banks | Retail and commercial banking |
| FNCE02 | Investment & Securities | Investment banks, brokerages, asset management |
| FNCE03 | Insurance | Life, health, property, casualty insurance |
| FNCE04 | Real Estate | REITs, property development, real estate services |
| FNCE05 | Private Equity & Hedge Funds | Alternative investments, venture capital |
| FNCE06 | Fintech & Payments | Payment processors, digital banking, cryptocurrency |

**Policy Relevance**: Banking regulations, consumer protection, tax policy, housing policy

---

### HLTH - Healthcare

| Code | Name | Description |
|------|------|-------------|
| HLTH01 | Hospitals & Health Systems | Hospitals, clinics, health networks |
| HLTH02 | Pharmaceuticals | Drug manufacturers, biotech |
| HLTH03 | Medical Devices | Device manufacturers, diagnostics |
| HLTH04 | Health Insurance | Health insurers, managed care |
| HLTH05 | Healthcare Services | Nursing homes, home health, labs |
| HLTH06 | Physicians & Clinicians | Doctors, dentists, nurses (individual practitioners) |

**Policy Relevance**: Drug pricing, ACA/healthcare reform, Medicare/Medicaid, FDA regulation

---

### TECH - Technology

| Code | Name | Description |
|------|------|-------------|
| TECH01 | Software & Internet | Software companies, internet platforms, SaaS |
| TECH02 | Hardware & Electronics | Computer hardware, consumer electronics, chips |
| TECH03 | Telecommunications | Phone carriers, cable, ISPs, 5G |
| TECH04 | IT Services | Consulting, system integrators, managed services |
| TECH05 | Artificial Intelligence | AI/ML companies, robotics, automation |

**Policy Relevance**: Antitrust, data privacy, Section 230, AI regulation, net neutrality

---

### DEFN - Defense & Aerospace

| Code | Name | Description |
|------|------|-------------|
| DEFN01 | Defense Contractors | Weapons systems, military equipment |
| DEFN02 | Aerospace | Aircraft manufacturers, space companies |
| DEFN03 | Defense Services | Military support services, security contractors |

**Policy Relevance**: Defense budget, procurement, foreign arms sales, veterans affairs

---

### CNST - Construction & Real Estate

| Code | Name | Description |
|------|------|-------------|
| CNST01 | Construction | General contractors, homebuilders, infrastructure |
| CNST02 | Building Materials | Lumber, cement, steel, building products |
| CNST03 | Architecture & Engineering | Design firms, engineering services |

**Policy Relevance**: Infrastructure spending, housing policy, building codes, zoning

---

### TRAN - Transportation

| Code | Name | Description |
|------|------|-------------|
| TRAN01 | Airlines | Passenger and cargo airlines |
| TRAN02 | Automotive | Car manufacturers, dealers, parts suppliers |
| TRAN03 | Trucking & Logistics | Freight, shipping, warehousing |
| TRAN04 | Railroads | Freight and passenger rail |
| TRAN05 | Ride-sharing & Delivery | Uber, Lyft, DoorDash, gig economy transportation |

**Policy Relevance**: Infrastructure, fuel standards, EV policy, labor classification

---

### RETL - Retail & Consumer

| Code | Name | Description |
|------|------|-------------|
| RETL01 | General Retail | Department stores, big box, e-commerce |
| RETL02 | Restaurants & Hospitality | Restaurants, hotels, entertainment venues |
| RETL03 | Consumer Products | CPG, apparel, household goods manufacturers |

**Policy Relevance**: Minimum wage, trade policy, consumer protection, labor law

---

### MEDA - Media & Entertainment

| Code | Name | Description |
|------|------|-------------|
| MEDA01 | Broadcasting & Cable | TV networks, cable channels, streaming |
| MEDA02 | Publishing & Print | Newspapers, magazines, book publishers |
| MEDA03 | Film & Music | Studios, record labels, production companies |
| MEDA04 | Advertising & Marketing | Ad agencies, PR firms, digital marketing |
| MEDA05 | Gaming & Sports | Video games, professional sports, gambling |

**Policy Relevance**: FCC regulation, copyright, media consolidation, sports betting

---

### LAW - Legal

| Code | Name | Description |
|------|------|-------------|
| LAW01 | Law Firms | Attorneys, law practices |
| LAW02 | Lobbying | Registered lobbyists, government relations |

**Policy Relevance**: Tort reform, judicial appointments, lobbying disclosure

---

### EDUC - Education

| Code | Name | Description |
|------|------|-------------|
| EDUC01 | Higher Education | Universities, colleges, community colleges |
| EDUC02 | K-12 Education | Public schools, private schools, school districts |
| EDUC03 | For-Profit Education | For-profit colleges, vocational training, EdTech |

**Policy Relevance**: Student loans, Title IX, school choice, research funding

---

### LABR - Labor & Unions

| Code | Name | Description |
|------|------|-------------|
| LABR01 | Labor Unions | AFL-CIO, SEIU, trade unions, teachers unions |
| LABR02 | Professional Associations | Industry groups, professional societies |

**Policy Relevance**: Labor law, right-to-work, minimum wage, collective bargaining

---

### GOVT - Government

| Code | Name | Description |
|------|------|-------------|
| GOVT01 | Federal Government | Federal employees (civilian) |
| GOVT02 | State & Local Government | State, county, city employees |
| GOVT03 | Military | Active duty, reserves, National Guard |
| GOVT04 | Postal Service | USPS employees |

**Policy Relevance**: Federal workforce, government reform, military policy

---

### MISC - Miscellaneous

| Code | Name | Description |
|------|------|-------------|
| MISC01 | Unknown/Unclassifiable | Cannot determine from available information |
| MISC02 | Religious Organizations | Churches, religious nonprofits, clergy |
| MISC03 | Nonprofits & NGOs | Charities, foundations, advocacy groups |
| MISC04 | Other | Doesn't fit other categories |

**Note**: High volume in MISC01 indicates classification quality issues.

---

### RETD - Retired

| Code | Name | Description |
|------|------|-------------|
| RETD01 | Retired | No longer employed, living on retirement income |

**Note**: Retired donors are a significant portion of political contributions.

---

### NOTW - Not Working

| Code | Name | Description |
|------|------|-------------|
| NOTW01 | Not Employed | Unemployed, homemaker, not in workforce |
| NOTW02 | Student | Full-time students |

---

## XML Format for Prompts

This XML is injected into the classification prompt:

```xml
<taxonomy>
  <sector code="AGRI" name="Agriculture &amp; Food">
    <industry code="AGRI01" name="Crop Production">Farms, orchards, vineyards</industry>
    <industry code="AGRI02" name="Livestock &amp; Dairy">Ranches, dairy, meat processing</industry>
    <industry code="AGRI03" name="Food &amp; Beverage Manufacturing">Food processors, beverage companies</industry>
    <industry code="AGRI04" name="Agricultural Services">Farm equipment, seeds, ag-tech</industry>
  </sector>
  
  <sector code="ENGY" name="Energy">
    <industry code="ENGY01" name="Oil &amp; Gas">Exploration, production, refining</industry>
    <industry code="ENGY02" name="Coal &amp; Mining">Coal mining, mineral extraction</industry>
    <industry code="ENGY03" name="Electric Utilities">Power generation, transmission</industry>
    <industry code="ENGY04" name="Renewable Energy">Solar, wind, hydro, geothermal</industry>
    <industry code="ENGY05" name="Nuclear">Nuclear power, uranium</industry>
  </sector>
  
  <sector code="FNCE" name="Finance &amp; Insurance">
    <industry code="FNCE01" name="Commercial Banks">Retail and commercial banking</industry>
    <industry code="FNCE02" name="Investment &amp; Securities">Investment banks, brokerages</industry>
    <industry code="FNCE03" name="Insurance">Life, health, property insurance</industry>
    <industry code="FNCE04" name="Real Estate">REITs, property development</industry>
    <industry code="FNCE05" name="Private Equity &amp; Hedge Funds">Alternative investments, VC</industry>
    <industry code="FNCE06" name="Fintech &amp; Payments">Payment processors, crypto</industry>
  </sector>
  
  <sector code="HLTH" name="Healthcare">
    <industry code="HLTH01" name="Hospitals &amp; Health Systems">Hospitals, clinics</industry>
    <industry code="HLTH02" name="Pharmaceuticals">Drug manufacturers, biotech</industry>
    <industry code="HLTH03" name="Medical Devices">Device manufacturers</industry>
    <industry code="HLTH04" name="Health Insurance">Health insurers, managed care</industry>
    <industry code="HLTH05" name="Healthcare Services">Nursing homes, labs</industry>
    <industry code="HLTH06" name="Physicians &amp; Clinicians">Doctors, nurses</industry>
  </sector>
  
  <sector code="TECH" name="Technology">
    <industry code="TECH01" name="Software &amp; Internet">Software, internet platforms</industry>
    <industry code="TECH02" name="Hardware &amp; Electronics">Hardware, chips</industry>
    <industry code="TECH03" name="Telecommunications">Phone, cable, ISPs</industry>
    <industry code="TECH04" name="IT Services">Consulting, integrators</industry>
    <industry code="TECH05" name="Artificial Intelligence">AI/ML, robotics</industry>
  </sector>
  
  <sector code="DEFN" name="Defense &amp; Aerospace">
    <industry code="DEFN01" name="Defense Contractors">Weapons, military equipment</industry>
    <industry code="DEFN02" name="Aerospace">Aircraft, space</industry>
    <industry code="DEFN03" name="Defense Services">Military support, security</industry>
  </sector>
  
  <sector code="CNST" name="Construction &amp; Real Estate">
    <industry code="CNST01" name="Construction">Contractors, homebuilders</industry>
    <industry code="CNST02" name="Building Materials">Lumber, cement, steel</industry>
    <industry code="CNST03" name="Architecture &amp; Engineering">Design, engineering</industry>
  </sector>
  
  <sector code="TRAN" name="Transportation">
    <industry code="TRAN01" name="Airlines">Passenger and cargo</industry>
    <industry code="TRAN02" name="Automotive">Cars, dealers, parts</industry>
    <industry code="TRAN03" name="Trucking &amp; Logistics">Freight, shipping</industry>
    <industry code="TRAN04" name="Railroads">Freight and passenger rail</industry>
    <industry code="TRAN05" name="Ride-sharing &amp; Delivery">Gig transportation</industry>
  </sector>
  
  <sector code="RETL" name="Retail &amp; Consumer">
    <industry code="RETL01" name="General Retail">Stores, e-commerce</industry>
    <industry code="RETL02" name="Restaurants &amp; Hospitality">Food service, hotels</industry>
    <industry code="RETL03" name="Consumer Products">CPG, apparel</industry>
  </sector>
  
  <sector code="MEDA" name="Media &amp; Entertainment">
    <industry code="MEDA01" name="Broadcasting &amp; Cable">TV, streaming</industry>
    <industry code="MEDA02" name="Publishing &amp; Print">News, magazines, books</industry>
    <industry code="MEDA03" name="Film &amp; Music">Studios, labels</industry>
    <industry code="MEDA04" name="Advertising &amp; Marketing">Ads, PR</industry>
    <industry code="MEDA05" name="Gaming &amp; Sports">Video games, sports, gambling</industry>
  </sector>
  
  <sector code="LAW" name="Legal">
    <industry code="LAW01" name="Law Firms">Attorneys, law practices</industry>
    <industry code="LAW02" name="Lobbying">Lobbyists, government relations</industry>
  </sector>
  
  <sector code="EDUC" name="Education">
    <industry code="EDUC01" name="Higher Education">Universities, colleges</industry>
    <industry code="EDUC02" name="K-12 Education">Schools, districts</industry>
    <industry code="EDUC03" name="For-Profit Education">For-profit, EdTech</industry>
  </sector>
  
  <sector code="LABR" name="Labor &amp; Unions">
    <industry code="LABR01" name="Labor Unions">AFL-CIO, trade unions</industry>
    <industry code="LABR02" name="Professional Associations">Industry groups</industry>
  </sector>
  
  <sector code="GOVT" name="Government">
    <industry code="GOVT01" name="Federal Government">Federal civilian employees</industry>
    <industry code="GOVT02" name="State &amp; Local Government">State, county, city</industry>
    <industry code="GOVT03" name="Military">Active duty, reserves</industry>
    <industry code="GOVT04" name="Postal Service">USPS</industry>
  </sector>
  
  <sector code="MISC" name="Miscellaneous">
    <industry code="MISC01" name="Unknown/Unclassifiable">Cannot determine</industry>
    <industry code="MISC02" name="Religious Organizations">Churches, clergy</industry>
    <industry code="MISC03" name="Nonprofits &amp; NGOs">Charities, foundations</industry>
    <industry code="MISC04" name="Other">Doesn't fit elsewhere</industry>
  </sector>
  
  <sector code="RETD" name="Retired">
    <industry code="RETD01" name="Retired">No longer employed</industry>
  </sector>
  
  <sector code="NOTW" name="Not Working">
    <industry code="NOTW01" name="Not Employed">Unemployed, homemaker</industry>
    <industry code="NOTW02" name="Student">Full-time students</industry>
  </sector>
</taxonomy>
```

---

## Database Tables

```sql
-- Reference table for sectors
CREATE TABLE finance.ref_sectors (
    code VARCHAR(4) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    policy_areas TEXT[], -- Related policy topics
    display_order SMALLINT
);

-- Reference table for industries
CREATE TABLE finance.ref_industries (
    code VARCHAR(6) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    sector_code VARCHAR(4) REFERENCES finance.ref_sectors(code),
    description TEXT,
    keywords TEXT[], -- Common employer/occupation keywords
    display_order SMALLINT
);

-- Seed data
INSERT INTO finance.ref_sectors (code, name, display_order) VALUES
('AGRI', 'Agriculture & Food', 1),
('ENGY', 'Energy', 2),
('FNCE', 'Finance & Insurance', 3),
('HLTH', 'Healthcare', 4),
('TECH', 'Technology', 5),
('DEFN', 'Defense & Aerospace', 6),
('CNST', 'Construction & Real Estate', 7),
('TRAN', 'Transportation', 8),
('RETL', 'Retail & Consumer', 9),
('MEDA', 'Media & Entertainment', 10),
('LAW', 'Legal', 11),
('EDUC', 'Education', 12),
('LABR', 'Labor & Unions', 13),
('GOVT', 'Government', 14),
('MISC', 'Miscellaneous', 15),
('RETD', 'Retired', 16),
('NOTW', 'Not Working', 17);

INSERT INTO finance.ref_industries (code, name, sector_code, display_order) VALUES
-- Agriculture
('AGRI01', 'Crop Production', 'AGRI', 1),
('AGRI02', 'Livestock & Dairy', 'AGRI', 2),
('AGRI03', 'Food & Beverage Manufacturing', 'AGRI', 3),
('AGRI04', 'Agricultural Services', 'AGRI', 4),
-- Energy
('ENGY01', 'Oil & Gas', 'ENGY', 1),
('ENGY02', 'Coal & Mining', 'ENGY', 2),
('ENGY03', 'Electric Utilities', 'ENGY', 3),
('ENGY04', 'Renewable Energy', 'ENGY', 4),
('ENGY05', 'Nuclear', 'ENGY', 5),
-- Finance
('FNCE01', 'Commercial Banks', 'FNCE', 1),
('FNCE02', 'Investment & Securities', 'FNCE', 2),
('FNCE03', 'Insurance', 'FNCE', 3),
('FNCE04', 'Real Estate', 'FNCE', 4),
('FNCE05', 'Private Equity & Hedge Funds', 'FNCE', 5),
('FNCE06', 'Fintech & Payments', 'FNCE', 6),
-- Healthcare
('HLTH01', 'Hospitals & Health Systems', 'HLTH', 1),
('HLTH02', 'Pharmaceuticals', 'HLTH', 2),
('HLTH03', 'Medical Devices', 'HLTH', 3),
('HLTH04', 'Health Insurance', 'HLTH', 4),
('HLTH05', 'Healthcare Services', 'HLTH', 5),
('HLTH06', 'Physicians & Clinicians', 'HLTH', 6),
-- Technology
('TECH01', 'Software & Internet', 'TECH', 1),
('TECH02', 'Hardware & Electronics', 'TECH', 2),
('TECH03', 'Telecommunications', 'TECH', 3),
('TECH04', 'IT Services', 'TECH', 4),
('TECH05', 'Artificial Intelligence', 'TECH', 5),
-- Defense
('DEFN01', 'Defense Contractors', 'DEFN', 1),
('DEFN02', 'Aerospace', 'DEFN', 2),
('DEFN03', 'Defense Services', 'DEFN', 3),
-- Construction
('CNST01', 'Construction', 'CNST', 1),
('CNST02', 'Building Materials', 'CNST', 2),
('CNST03', 'Architecture & Engineering', 'CNST', 3),
-- Transportation
('TRAN01', 'Airlines', 'TRAN', 1),
('TRAN02', 'Automotive', 'TRAN', 2),
('TRAN03', 'Trucking & Logistics', 'TRAN', 3),
('TRAN04', 'Railroads', 'TRAN', 4),
('TRAN05', 'Ride-sharing & Delivery', 'TRAN', 5),
-- Retail
('RETL01', 'General Retail', 'RETL', 1),
('RETL02', 'Restaurants & Hospitality', 'RETL', 2),
('RETL03', 'Consumer Products', 'RETL', 3),
-- Media
('MEDA01', 'Broadcasting & Cable', 'MEDA', 1),
('MEDA02', 'Publishing & Print', 'MEDA', 2),
('MEDA03', 'Film & Music', 'MEDA', 3),
('MEDA04', 'Advertising & Marketing', 'MEDA', 4),
('MEDA05', 'Gaming & Sports', 'MEDA', 5),
-- Legal
('LAW01', 'Law Firms', 'LAW', 1),
('LAW02', 'Lobbying', 'LAW', 2),
-- Education
('EDUC01', 'Higher Education', 'EDUC', 1),
('EDUC02', 'K-12 Education', 'EDUC', 2),
('EDUC03', 'For-Profit Education', 'EDUC', 3),
-- Labor
('LABR01', 'Labor Unions', 'LABR', 1),
('LABR02', 'Professional Associations', 'LABR', 2),
-- Government
('GOVT01', 'Federal Government', 'GOVT', 1),
('GOVT02', 'State & Local Government', 'GOVT', 2),
('GOVT03', 'Military', 'GOVT', 3),
('GOVT04', 'Postal Service', 'GOVT', 4),
-- Misc
('MISC01', 'Unknown/Unclassifiable', 'MISC', 1),
('MISC02', 'Religious Organizations', 'MISC', 2),
('MISC03', 'Nonprofits & NGOs', 'MISC', 3),
('MISC04', 'Other', 'MISC', 4),
-- Retired
('RETD01', 'Retired', 'RETD', 1),
-- Not Working
('NOTW01', 'Not Employed', 'NOTW', 1),
('NOTW02', 'Student', 'NOTW', 2);
```

---

## Python Constants

```python
# taxonomy.py

SECTORS = {
    "AGRI": "Agriculture & Food",
    "ENGY": "Energy",
    "FNCE": "Finance & Insurance",
    "HLTH": "Healthcare",
    "TECH": "Technology",
    "DEFN": "Defense & Aerospace",
    "CNST": "Construction & Real Estate",
    "TRAN": "Transportation",
    "RETL": "Retail & Consumer",
    "MEDA": "Media & Entertainment",
    "LAW": "Legal",
    "EDUC": "Education",
    "LABR": "Labor & Unions",
    "GOVT": "Government",
    "MISC": "Miscellaneous",
    "RETD": "Retired",
    "NOTW": "Not Working",
}

INDUSTRIES = {
    "AGRI01": ("Crop Production", "AGRI"),
    "AGRI02": ("Livestock & Dairy", "AGRI"),
    "AGRI03": ("Food & Beverage Manufacturing", "AGRI"),
    "AGRI04": ("Agricultural Services", "AGRI"),
    "ENGY01": ("Oil & Gas", "ENGY"),
    "ENGY02": ("Coal & Mining", "ENGY"),
    "ENGY03": ("Electric Utilities", "ENGY"),
    "ENGY04": ("Renewable Energy", "ENGY"),
    "ENGY05": ("Nuclear", "ENGY"),
    "FNCE01": ("Commercial Banks", "FNCE"),
    "FNCE02": ("Investment & Securities", "FNCE"),
    "FNCE03": ("Insurance", "FNCE"),
    "FNCE04": ("Real Estate", "FNCE"),
    "FNCE05": ("Private Equity & Hedge Funds", "FNCE"),
    "FNCE06": ("Fintech & Payments", "FNCE"),
    "HLTH01": ("Hospitals & Health Systems", "HLTH"),
    "HLTH02": ("Pharmaceuticals", "HLTH"),
    "HLTH03": ("Medical Devices", "HLTH"),
    "HLTH04": ("Health Insurance", "HLTH"),
    "HLTH05": ("Healthcare Services", "HLTH"),
    "HLTH06": ("Physicians & Clinicians", "HLTH"),
    "TECH01": ("Software & Internet", "TECH"),
    "TECH02": ("Hardware & Electronics", "TECH"),
    "TECH03": ("Telecommunications", "TECH"),
    "TECH04": ("IT Services", "TECH"),
    "TECH05": ("Artificial Intelligence", "TECH"),
    "DEFN01": ("Defense Contractors", "DEFN"),
    "DEFN02": ("Aerospace", "DEFN"),
    "DEFN03": ("Defense Services", "DEFN"),
    "CNST01": ("Construction", "CNST"),
    "CNST02": ("Building Materials", "CNST"),
    "CNST03": ("Architecture & Engineering", "CNST"),
    "TRAN01": ("Airlines", "TRAN"),
    "TRAN02": ("Automotive", "TRAN"),
    "TRAN03": ("Trucking & Logistics", "TRAN"),
    "TRAN04": ("Railroads", "TRAN"),
    "TRAN05": ("Ride-sharing & Delivery", "TRAN"),
    "RETL01": ("General Retail", "RETL"),
    "RETL02": ("Restaurants & Hospitality", "RETL"),
    "RETL03": ("Consumer Products", "RETL"),
    "MEDA01": ("Broadcasting & Cable", "MEDA"),
    "MEDA02": ("Publishing & Print", "MEDA"),
    "MEDA03": ("Film & Music", "MEDA"),
    "MEDA04": ("Advertising & Marketing", "MEDA"),
    "MEDA05": ("Gaming & Sports", "MEDA"),
    "LAW01": ("Law Firms", "LAW"),
    "LAW02": ("Lobbying", "LAW"),
    "EDUC01": ("Higher Education", "EDUC"),
    "EDUC02": ("K-12 Education", "EDUC"),
    "EDUC03": ("For-Profit Education", "EDUC"),
    "LABR01": ("Labor Unions", "LABR"),
    "LABR02": ("Professional Associations", "LABR"),
    "GOVT01": ("Federal Government", "GOVT"),
    "GOVT02": ("State & Local Government", "GOVT"),
    "GOVT03": ("Military", "GOVT"),
    "GOVT04": ("Postal Service", "GOVT"),
    "MISC01": ("Unknown/Unclassifiable", "MISC"),
    "MISC02": ("Religious Organizations", "MISC"),
    "MISC03": ("Nonprofits & NGOs", "MISC"),
    "MISC04": ("Other", "MISC"),
    "RETD01": ("Retired", "RETD"),
    "NOTW01": ("Not Employed", "NOTW"),
    "NOTW02": ("Student", "NOTW"),
}

VALID_INDUSTRY_CODES = set(INDUSTRIES.keys())
VALID_SECTOR_CODES = set(SECTORS.keys())

def get_industry_name(code: str) -> str:
    """Get industry name from code."""
    return INDUSTRIES.get(code, ("Unknown", "MISC"))[0]

def get_sector_for_industry(industry_code: str) -> str:
    """Get sector code for an industry code."""
    return INDUSTRIES.get(industry_code, ("Unknown", "MISC"))[1]

def get_sector_name(code: str) -> str:
    """Get sector name from code."""
    return SECTORS.get(code, "Unknown")
```

---

## Comparison to OpenSecrets

Our taxonomy is simpler than OpenSecrets' 400+ industry codes but maps reasonably well to their major categories:

| OpenSecrets Category | Our Sector | Notes |
|---------------------|------------|-------|
| Agribusiness | AGRI | Direct mapping |
| Communications/Electronics | TECH, MEDA | Split by function |
| Construction | CNST | Direct mapping |
| Defense | DEFN | Direct mapping |
| Energy/Natural Resources | ENGY | Direct mapping |
| Finance/Insurance/Real Estate | FNCE | Combined |
| Health | HLTH | Direct mapping |
| Lawyers & Lobbyists | LAW | Direct mapping |
| Transportation | TRAN | Direct mapping |
| Labor | LABR | Direct mapping |
| Ideology/Single-Issue | MISC03 | Mapped to nonprofits |

---

## Versioning

Track taxonomy version for reproducibility:

- **v1.0** (2025-01): Initial 17 sectors, 52 industries
- Future versions will be documented here

Store version in database: `finance.classified_contributions.taxonomy_version`
