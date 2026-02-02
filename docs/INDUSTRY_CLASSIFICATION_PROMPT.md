# Industry Classification Prompt

## Overview

This document contains the prompt template used by the `finance-classify-donors` Lambda function to classify campaign contribution donors by industry.

## Model Selection

**Primary Model**: Claude 3 Haiku (`claude-3-haiku-20240307`)
- Cost-optimized for high-volume classification
- ~$0.25 per 1M input tokens, $1.25 per 1M output tokens
- Sufficient accuracy for employer/occupation classification

**Fallback Model**: Claude 3.5 Sonnet (for low-confidence batches requiring higher accuracy)

---

## Prompt Template

```xml
<system>
You are a campaign finance analyst specializing in classifying political donors by industry sector. Your task is to analyze donor employment information and assign the most appropriate industry classification from our standardized taxonomy.

You must return valid JSON only. Do not include any explanation or commentary outside the JSON structure.
</system>

<taxonomy>
{{INDUSTRY_TAXONOMY}}
</taxonomy>

<instructions>
For each donor, analyze their employer and occupation to determine:
1. The most specific industry_code that matches their work
2. The parent sector_code
3. A confidence score (0.0-1.0) based on how certain you are

Classification Guidelines:
- Use the MOST SPECIFIC industry code that applies
- If employer is clearly a company, prioritize the company's primary business
- If occupation is more informative than employer, weight occupation higher
- For ambiguous cases (e.g., "CONSULTANT"), use occupation context or default to MISC/MISC01
- Government employees: Use GOVT sector codes based on level/function
- Self-employed: Classify by their stated occupation/business type
- Retired: Use RETD/RETD01 regardless of former occupation
- Not employed/Homemaker: Use NOTW/NOTW01
- Students: Use NOTW/NOTW02

Confidence Scoring:
- 0.95-1.00: Exact match (e.g., "GOOGLE INC" → TECH/TECH01)
- 0.85-0.94: High confidence, clear industry (e.g., "SOFTWARE ENGINEER" at unknown company → TECH/TECH01)
- 0.70-0.84: Moderate confidence, some ambiguity (e.g., "MANAGER" at "ABC CORP")
- 0.50-0.69: Low confidence, significant ambiguity (e.g., "CONSULTANT", "SELF-EMPLOYED")
- Below 0.50: Very uncertain, may need manual review
</instructions>

<donors>
{{DONOR_LIST}}
</donors>

<output_format>
Return a JSON array with one object per donor in the same order as the input:

{
  "classifications": [
    {
      "donor_index": 0,
      "industry_code": "TECH01",
      "industry_name": "Software & Internet",
      "sector_code": "TECH",
      "sector_name": "Technology",
      "confidence": 0.92,
      "reasoning": "Google is a major software/internet company"
    },
    {
      "donor_index": 1,
      "industry_code": "RETD01",
      "industry_name": "Retired",
      "sector_code": "RETD",
      "sector_name": "Retired",
      "confidence": 0.99,
      "reasoning": "Explicitly stated as retired"
    }
  ]
}
</output_format>
```

---

## Input Format

The `{{DONOR_LIST}}` placeholder is replaced with a JSON array of donors:

```json
[
  {
    "index": 0,
    "employer": "GOOGLE INC",
    "occupation": "SOFTWARE ENGINEER",
    "city": "MOUNTAIN VIEW",
    "state": "CA"
  },
  {
    "index": 1,
    "employer": "RETIRED",
    "occupation": "RETIRED",
    "city": "PHOENIX",
    "state": "AZ"
  },
  {
    "index": 2,
    "employer": "SELF-EMPLOYED",
    "occupation": "ATTORNEY",
    "city": "HOUSTON",
    "state": "TX"
  }
]
```

---

## Pre-Classification Rules

Before sending to Claude, apply these deterministic rules to reduce API costs:

```python
PRE_CLASSIFICATION_RULES = {
    # Retired variations
    ("RETIRED", "*"): ("RETD", "RETD01", "Retired", 0.99),
    ("*", "RETIRED"): ("RETD", "RETD01", "Retired", 0.99),
    ("RET", "*"): ("RETD", "RETD01", "Retired", 0.95),
    ("RET.", "*"): ("RETD", "RETD01", "Retired", 0.95),
    
    # Not employed variations  
    ("NOT EMPLOYED", "*"): ("NOTW", "NOTW01", "Not Employed", 0.99),
    ("NONE", "*"): ("NOTW", "NOTW01", "Not Employed", 0.95),
    ("N/A", "*"): ("NOTW", "NOTW01", "Not Employed", 0.90),
    ("HOMEMAKER", "*"): ("NOTW", "NOTW01", "Not Employed", 0.99),
    ("*", "HOMEMAKER"): ("NOTW", "NOTW01", "Not Employed", 0.99),
    
    # Students
    ("*", "STUDENT"): ("NOTW", "NOTW02", "Student", 0.95),
    
    # Unemployed
    ("UNEMPLOYED", "*"): ("NOTW", "NOTW01", "Not Employed", 0.99),
    ("*", "UNEMPLOYED"): ("NOTW", "NOTW01", "Not Employed", 0.99),
}

def apply_pre_rules(employer: str, occupation: str) -> tuple | None:
    """Apply deterministic rules before sending to Claude."""
    emp_upper = (employer or "").upper().strip()
    occ_upper = (occupation or "").upper().strip()
    
    for (emp_pattern, occ_pattern), result in PRE_CLASSIFICATION_RULES.items():
        emp_match = emp_pattern == "*" or emp_pattern in emp_upper
        occ_match = occ_pattern == "*" or occ_pattern in occ_upper
        if emp_match and occ_match:
            return result
    
    return None  # Send to Claude
```

---

## Response Parsing

```python
import json
from typing import List, Dict, Any

def parse_classification_response(response_text: str) -> List[Dict[str, Any]]:
    """Parse Claude's classification response."""
    try:
        # Handle potential markdown code blocks
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0]
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0]
        
        data = json.loads(response_text.strip())
        
        if "classifications" in data:
            return data["classifications"]
        elif isinstance(data, list):
            return data
        else:
            raise ValueError("Unexpected response structure")
            
    except json.JSONDecodeError as e:
        # Log the raw response for debugging
        logger.error(f"Failed to parse response: {response_text[:500]}")
        raise

def validate_classification(cls: Dict[str, Any]) -> bool:
    """Validate a single classification object."""
    required_fields = ["donor_index", "industry_code", "sector_code", "confidence"]
    
    for field in required_fields:
        if field not in cls:
            return False
    
    # Validate industry_code exists in taxonomy
    if cls["industry_code"] not in VALID_INDUSTRY_CODES:
        return False
    
    # Validate confidence range
    if not (0.0 <= cls["confidence"] <= 1.0):
        return False
    
    return True
```

---

## Error Recovery

### Malformed JSON Response

If Claude returns invalid JSON:
1. Log the raw response
2. Retry once with a simplified prompt
3. If still failing, mark batch for manual review

### Missing Classifications

If response has fewer items than input:
1. Match by `donor_index` field
2. Queue missing donors for re-classification
3. Log discrepancy for investigation

### Invalid Industry Codes

If Claude returns an industry code not in our taxonomy:
1. Check for close matches (typos, case sensitivity)
2. If found, use the correct code with reduced confidence
3. Otherwise, flag for manual review

---

## Batch Processing Code

```python
import boto3
import json
from typing import List, Dict

bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')

def classify_donor_batch(donors: List[Dict]) -> List[Dict]:
    """Classify a batch of donors using Claude."""
    
    # Apply pre-classification rules first
    results = []
    to_classify = []
    
    for i, donor in enumerate(donors):
        pre_result = apply_pre_rules(donor.get("employer"), donor.get("occupation"))
        if pre_result:
            sector_code, industry_code, industry_name, confidence = pre_result
            results.append({
                "donor_index": i,
                "industry_code": industry_code,
                "industry_name": industry_name,
                "sector_code": sector_code,
                "confidence": confidence,
                "source": "pre_rule"
            })
        else:
            to_classify.append({**donor, "original_index": i})
    
    # Check cache for remaining donors
    cached, uncached = check_classification_cache(to_classify)
    results.extend(cached)
    
    if not uncached:
        return sorted(results, key=lambda x: x["donor_index"])
    
    # Build prompt for uncached donors
    donor_list = json.dumps([
        {
            "index": d["original_index"],
            "employer": d.get("employer", ""),
            "occupation": d.get("occupation", ""),
            "city": d.get("city", ""),
            "state": d.get("state", "")
        }
        for d in uncached
    ], indent=2)
    
    prompt = CLASSIFICATION_PROMPT_TEMPLATE.replace(
        "{{INDUSTRY_TAXONOMY}}", 
        INDUSTRY_TAXONOMY_XML
    ).replace(
        "{{DONOR_LIST}}", 
        donor_list
    )
    
    # Call Claude
    response = bedrock.invoke_model(
        modelId="anthropic.claude-3-haiku-20240307-v1:0",
        body=json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 4096,
            "messages": [{"role": "user", "content": prompt}]
        })
    )
    
    response_body = json.loads(response["body"].read())
    response_text = response_body["content"][0]["text"]
    
    # Parse and validate
    classifications = parse_classification_response(response_text)
    for cls in classifications:
        if validate_classification(cls):
            cls["source"] = "claude"
            results.append(cls)
            # Update cache
            donor = next(d for d in uncached if d["original_index"] == cls["donor_index"])
            update_classification_cache(donor, cls)
    
    return sorted(results, key=lambda x: x["donor_index"])
```

---

## Testing

### Unit Tests

```python
def test_retired_pre_classification():
    result = apply_pre_rules("RETIRED", "RETIRED")
    assert result == ("RETD", "RETD01", "Retired", 0.99)

def test_homemaker_pre_classification():
    result = apply_pre_rules("SELF", "HOMEMAKER")
    assert result == ("NOTW", "NOTW01", "Not Employed", 0.99)

def test_normal_employer_needs_claude():
    result = apply_pre_rules("GOOGLE INC", "SOFTWARE ENGINEER")
    assert result is None  # Should go to Claude
```

### Integration Tests

Test with known employer/occupation pairs:

| Employer | Occupation | Expected Sector | Expected Industry |
|----------|------------|-----------------|-------------------|
| GOOGLE INC | SOFTWARE ENGINEER | TECH | TECH01 |
| WALMART | CASHIER | RETL | RETL01 |
| SELF-EMPLOYED | ATTORNEY | LAW | LAW01 |
| MAYO CLINIC | PHYSICIAN | HLTH | HLTH01 |
| US ARMY | SOLDIER | GOVT | GOVT03 |
| RETIRED | RETIRED | RETD | RETD01 |

---

## Versioning

Track classifier version in output for reproducibility:

- **v1.0**: Initial release with 52 industry codes
- **v1.1**: Added CRYP (Cryptocurrency) industry
- **v1.2**: Improved tech company disambiguation

Store version in `finance.classified_contributions.classifier_version`.
