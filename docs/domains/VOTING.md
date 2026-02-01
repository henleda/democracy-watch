# VOTING Domain

## Responsibility
Bills, roll calls, and individual vote records.

## Entities
- **Bill**: Legislation (hr, s, hjres, sjres, etc.)
- **RollCall**: A specific vote event
- **Vote**: Individual member's position on a roll call
- **BillEmbedding**: Vector embedding of bill summary

## External Data Sources
- Congress.gov API

## Update Frequency
Every 4 hours from Congress.gov API.
