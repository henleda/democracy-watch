# MEMBERS Domain

## Responsibility
Congressional member data management.

## Entities
- **Member**: Congressional representative (bioguide_id is primary identifier)
- **Committee**: Congressional committee
- **CommitteeMembership**: Member's committee assignments

## External Data Sources
- Congress.gov API (primary)
- Identifiers: bioguide_id, thomas_id, govtrack_id, opensecrets_id, votesmart_id, fec_id

## Update Frequency
Every 4 hours from Congress.gov API.
