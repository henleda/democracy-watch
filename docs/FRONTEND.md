# FRONTEND.md - Frontend Architecture

## Overview

Next.js 14 with App Router, React Server Components, and Tailwind CSS.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 14 | Framework (App Router) |
| React 18 | UI library |
| Tailwind CSS | Styling |
| shadcn/ui | Component library |
| TanStack Query | Data fetching |
| Zustand | Client state |
| Recharts | Charts/visualizations |

## Project Structure

```
packages/web/src/
├── app/                    # App Router pages
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page
│   ├── members/
│   │   ├── page.tsx        # Member list
│   │   └── [memberId]/page.tsx
│   ├── zip/[zipCode]/page.tsx
│   └── rankings/page.tsx
├── components/
│   ├── ui/                 # shadcn/ui
│   ├── layout/             # Header, Footer, Nav
│   ├── home/               # Home page components
│   ├── member/             # Member detail components
│   └── shared/             # Reusable components
├── hooks/                  # React hooks
├── lib/                    # Utilities
└── types/                  # TypeScript types
```

## Key Pages

### Home Page
- Hero with zip code search
- Top 10 Deviators card
- Funding Alignment card  
- Party Platform Rebels card
- Quick stats bar

### Member Detail Page
- Header with photo, name, party badge
- Score cards (deviation, alignment, rank)
- Tabbed content: Promises, Votes, Deviations, Funding, Platform

### Zip Code Results
- List of representatives (1 House + 2 Senate)
- Score summaries for each
- CTA to create account for alerts

## Key Components

### ScoreBar
Progress bar visualization for scores. Color-coded by context (green=good, red=bad).

### PartyBadge
Colored badge showing R/D/I with party colors.

### AlignmentIndicator
Visual indicator: ✓ (aligned), ⚠️ (unclear), ✗ (contradicts)

## Data Fetching

- Server Components for initial data
- TanStack Query for client-side updates
- API client wrapper in `/lib/api-client.ts`

## Design Principles

- Mobile-first responsive design
- Minimal formatting, clean typography
- Party colors: Red (R), Blue (D), Purple (I)
- Score colors: Green (good), Yellow (warning), Red (bad)
