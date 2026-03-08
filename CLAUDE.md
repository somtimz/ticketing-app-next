# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**IT Help Desk Application** — a simplified, self-hosted support ticketing system designed to replace expensive enterprise tools (ServiceNow, JIRA Service Desk). Focuses on simplicity, team-level visibility, phone call logging, and intelligent automation.

### Key Goals
- Role-based access: Employee, Agent, Team Lead, Admin
- Auto-assignment, SLA tracking, escalation rules
- Knowledge base with search and deflection
- Phone call logging for agents
- File attachments (up to 25MB)
- Email notifications (Resend/SendGrid)
- Asset inventory (hardware + software) with assignment history
- Service requests (`REQ-XXXX`) with distinct workflow from incidents (`INC-XXXX`)
- User profile page aggregating assets, incidents, and service requests

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| UI | React 19 + Tailwind CSS + TypeScript |
| Database | Drizzle ORM + SQLite (dev) / PostgreSQL (prod) |
| Auth | NextAuth v5 (CredentialsProvider; SAML post-MVP) |
| Storage | Vercel Blob (prod) / local filesystem (dev) |
| Email | Resend (primary) or SendGrid |
| Validation | Zod |
| Testing | Vitest (unit) + Playwright (E2E) |
| Hosting | Vercel or Netlify |

## Development Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run start        # Run production build locally
npm run lint         # ESLint

npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Run migrations
npm run db:push      # Push schema changes (dev)
npm run db:studio    # Open Drizzle Studio (http://localhost:4983)
npm run db:seed      # Seed database with test data

npm test             # Run Vitest unit tests
```

## Key File Paths

```
lib/
├── auth.ts              # NextAuth configuration
├── sla.ts               # Priority matrix + SLA calculation utilities
├── rbac.ts              # Role hierarchy and permission checks
├── api-error.ts         # API error handling helpers
├── assignment.ts        # Auto-assignment logic
├── suggestions.ts       # Similar ticket algorithms
├── storage.ts           # File upload abstraction (Vercel Blob)
└── db/
    ├── schema.ts        # Drizzle schema (all tables)
    ├── seed.ts          # Database seeding script
    └── migrations/      # Generated migrations

app/
├── api/                 # Next.js API routes
│   ├── auth/            # NextAuth endpoints
│   ├── tickets/         # Ticket CRUD + actions (assign, resolve, status, comments, attachments)
│   ├── calls/           # Phone call logging
│   ├── agents/          # List assignable agents (Agent+)
│   ├── categories/      # Category list
│   ├── users/           # User management (Admin) + /[id]/summary profile endpoint
│   ├── assets/          # Asset CRUD + /[id]/assign + /[id]/retire
│   ├── service-requests/ # Service request CRUD + /[id]/status + /[id]/assign + /[id]/comments
│   ├── customers/       # Customer CRUD (Admin)
│   ├── kb/
│   │   ├── articles/    # KB CRUD (list, create, get, edit, delete, feedback)
│   │   ├── search/      # Full-text KB search
│   │   └── tags/        # KB tag list + create
│   └── analytics/       # Reporting endpoints
└── dashboard/
    ├── issue-logging/   # Ticket list, detail, new ticket
    ├── my-tickets/      # Employee's own tickets
    ├── all-tickets/     # All tickets (Agent+)
    ├── assets/          # Asset inventory + detail + new
    ├── service-requests/ # Service request list, detail, new
    ├── kb/              # Knowledge base (browse, view, new, edit)
    ├── agents/          # Agent management (Admin)
    └── admin/
        └── customers/   # Customer management (Admin)
```

## Docs Structure

```
docs/
├── requirements/
│   ├── PRD.md                           # Product requirements document
│   └── ticket-requirements-interview.json  # Requirements interview output
├── design/
│   └── mvp-design.md                    # MVP feature design
├── plans/
│   ├── mvp-implementation.md                        # MVP plan (complete)
│   ├── 2026-02-20-kb-inline-ticket-suggestions.md  # KB suggestions + isAgentOnly (complete)
│   ├── 2026-02-20-kb-tags-publication.md           # KB tags + publishedAt (complete)
│   ├── 2026-02-27-assets-service-requests.md       # Assets + service requests (complete)
│   └── 2026-02-27-assets-service-requests-design.md  # Assets + service requests design
├── guides/
│   └── manual-testing.md               # Manual testing scenarios
└── archive/                             # Superseded early drafts (Jan 2025)
    ├── 2025-01-09-foundation.md
    └── 2025-01-09-it-helpdesk-design.md
```

## Important Patterns

- **Priority calculation:** `Impact × Urgency` matrix → P1–P4 (see `lib/sla.ts`)
- **SLA defaults:** P1=15min/4hr, P2=1hr/24hr, P3=4hr/3d, P4=24hr/7d
- **Role hierarchy:** Employee < Agent < TeamLead < Admin (use `hasRole()` for inheritance)
- **API errors:** Use `requireAuth()` / `requireRole()` from `lib/api-error.ts`
- **Incident status flow:** Open → In Progress → Resolved → Closed (Closed is terminal)
- **Service request status flow:** Submitted → Approved → In Progress → Fulfilled (or Rejected; terminal)
- **Ticket numbers:** INC-0001 format, sequential
- **Service request numbers:** REQ-0001 format, sequential
- **Asset tags:** AST-0001 format, sequential
- **Asset types:** Hardware | Software
- **Asset statuses:** Active | In Repair | Retired
- **Service request categories:** New Equipment | Software Access | Account Setup | Hardware Repair | Other
- **KB isAgentOnly:** Articles flagged `isAgentOnly=true` are filtered from Employee-visible KB list, search, and detail routes
- **KB tags:** Many-to-many via `kbTags` + `articleTags` tables; `GET /api/kb/tags` returns all tags; create/edit forms support tag autocomplete + create-on-the-fly
- **KB publishedAt:** Auto-set on first publish; shown as publication badge on browse list
- **Customers:** External contacts linked to tickets + service requests; CRUD at `/api/customers/`; Admin manages via `/dashboard/admin/customers/`

## Test Accounts (after `npm run db:seed`)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@company.com | admin123 |
| Team Lead | teamlead1@company.com | teamlead123 |
| Agent | agent1@company.com | agent123 |
| Employee | employee1@company.com | employee123 |
| Client | client@acme.example | client123 |

## Default Settings

User settings and memory files are at `C:\Users\cpiss\.claude` (see `settings.json`, `keybindings.json`, `memory/MEMORY.md`).
