# Client Self-Service Portal — Design

**Date:** 2026-03-08
**Status:** Approved

## Overview

A simplified self-service portal at `/portal` for both internal employees and external customers. Clients can submit tickets, track their own ticket status and comments, and browse the knowledge base. External customers authenticate via admin-sent magic link invite.

## Architecture & Routes

```
app/
├── portal/
│   ├── layout.tsx              # Simplified layout (logo, nav, user menu)
│   ├── page.tsx                # Dashboard: open tickets + recent activity
│   ├── accept-invite/page.tsx  # Set password after clicking invite link
│   ├── tickets/
│   │   ├── page.tsx            # My tickets list
│   │   ├── new/page.tsx        # Submit new ticket
│   │   └── [id]/page.tsx       # Ticket detail + comments
│   └── kb/
│       ├── page.tsx            # KB browse
│       └── [id]/page.tsx       # KB article
```

- `/portal` has its own layout — clean, minimal, no agent tools
- Employees use their existing session to access `/portal` (no re-login)
- External customers land on `/portal` after claiming their magic link invite
- Middleware protects all `/portal/*` routes: requires auth with role `Client`, `Employee`, `Agent`, `TeamLead`, or `Admin`
- `Client` role is denied access to all `/dashboard/*` routes (redirected to `/portal`)

## Data Model

### Role change
Add `'Client'` to the `role` enum on the `users` table. External customers get a `users` row with `role='Client'`, linked to their `customers` record via a new `customerId` FK on `users`.

### New `clientInvites` table
```
clientInvites
├── id          serial PK
├── email       text NOT NULL
├── token       text NOT NULL UNIQUE   -- secure random token
├── userId      integer FK → users.id  -- created on invite, activated on claim
├── expiresAt   timestamp NOT NULL     -- 72hr expiry
├── claimedAt   timestamp              -- null until used
└── createdAt   timestamp
```

No changes to `tickets` or `serviceRequests` — existing `requesterId` FK handles ticket ownership for client-submitted tickets.

## Portal Pages

| Route | Description |
|-------|-------------|
| `/portal` | Summary cards (open/resolved counts), recent tickets, "Submit ticket" CTA |
| `/portal/tickets` | Full ticket list filtered to `requesterId = session.user.id`, filterable by status |
| `/portal/tickets/new` | Simple form: title, description, category, priority |
| `/portal/tickets/[id]` | Ticket detail, public comments only (internal notes hidden), add comment |
| `/portal/kb` | Browse published non-agent-only articles, search |
| `/portal/kb/[id]` | Article view + helpful/not helpful feedback |

**Admin addition:** "Send Portal Invite" button on `/dashboard/admin/customers/[id]` page.

## Auth Flow

1. Admin clicks "Send Portal Invite" on a customer record
2. `POST /api/clients/invite` — creates `users` row (`role=Client`, no password) + `clientInvites` row, sends email via Resend with link to `/portal/accept-invite?token=xxx`
3. Client visits link → token validated (not expired, not claimed)
4. Client sets password → account activated, session created, redirected to `/portal`
5. Token marked `claimedAt` — one-time use only, 72hr expiry

## New API Routes

```
POST /api/clients/invite                  # Admin: create invite + send email
GET  /api/clients/invite/[token]          # Validate token (public)
POST /api/clients/invite/[token]/accept   # Set password + activate account
```

## RBAC Changes

- `Client` role does NOT inherit from `Employee` — it has its own explicit permission checks
- Existing dashboard API routes reject `Client` role with 403
- Portal ticket API calls filter by `requesterId = session.user.id` — clients cannot access other users' tickets
- Middleware updated: `/portal/*` allows Client+; `/dashboard/*` denies Client (redirect to `/portal`)
