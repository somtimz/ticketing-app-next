# Assets & Service Requests — Design

**Date:** 2026-02-27

## Overview

Add two new first-class modules to the IT help desk:

1. **Asset Inventory** — track hardware and software assets assigned to users, with full lifecycle management and linking to incidents/requests.
2. **Service Requests (`REQ-XXXX`)** — a fully distinct request type with its own form, status workflow, and routing, separate from incidents (`INC-XXXX`).

A new **User Profile** page ties everything together: one view of a user's assets, open incidents, and open service requests.

---

## Data Model

### `assets`

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `assetTag` | text unique | `AST-0001` format, sequential |
| `name` | text | e.g. "MacBook Pro 14" |
| `type` | enum | `Hardware` \| `Software` |
| `make` | text | e.g. "Apple" |
| `model` | text | e.g. "MacBook Pro 14-inch M3" |
| `serialNumber` | text nullable | Hardware serial or software license key |
| `status` | enum | `Active` \| `In Repair` \| `Retired` |
| `location` | text nullable | Office, desk, or remote |
| `purchaseDate` | date nullable | |
| `warrantyExpiry` | date nullable | |
| `cost` | numeric nullable | Purchase cost |
| `assignedUserId` | FK → users | Nullable (unassigned) |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

### `assetHistory`

Tracks every reassignment event.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `assetId` | FK → assets | |
| `assignedToUserId` | FK → users nullable | |
| `assignedByUserId` | FK → users nullable | Agent who performed the action |
| `assignedAt` | timestamp | |
| `returnedAt` | timestamp nullable | |
| `notes` | text nullable | |

### `serviceRequests`

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `requestNumber` | text unique | `REQ-0001` format, sequential |
| `title` | text | |
| `description` | text | |
| `category` | enum | `New Equipment` \| `Software Access` \| `Account Setup` \| `Hardware Repair` \| `Other` |
| `status` | enum | `Submitted` \| `Approved` \| `In Progress` \| `Fulfilled` \| `Rejected` |
| `priority` | enum | `P1` \| `P2` \| `P3` \| `P4` |
| `requesterId` | FK → users | |
| `assignedAgentId` | FK → users nullable | |
| `approvedById` | FK → users nullable | |
| `approvedAt` | timestamp nullable | |
| `fulfilledAt` | timestamp nullable | |
| `rejectionReason` | text nullable | Required when status = `Rejected` |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

### `serviceRequestComments`

Same shape as ticket `comments` table.

| Column | Type |
|---|---|
| `id` | serial PK |
| `serviceRequestId` | FK → serviceRequests |
| `userId` | FK → users |
| `content` | text |
| `createdAt` | timestamp |

### `assetLinks`

Links an asset to an incident or service request (at most one of `ticketId` / `serviceRequestId` is set).

| Column | Type |
|---|---|
| `id` | serial PK |
| `assetId` | FK → assets |
| `ticketId` | FK → tickets nullable |
| `serviceRequestId` | FK → serviceRequests nullable |
| `linkedAt` | timestamp |
| `linkedByUserId` | FK → users |

---

## Status Flows

**Service Request:**
```
Submitted → Approved → In Progress → Fulfilled
     ↓
  Rejected  (terminal)
```

Fulfilled is terminal. Rejected is terminal. Only Agent+ can approve/reject/fulfill. Requester can cancel while still `Submitted`.

**Asset:**
```
Active ↔ In Repair → Retired  (terminal)
```

---

## API Routes

### Assets

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/assets` | Any | List; Employee sees own only; Agent+ sees all |
| POST | `/api/assets` | Any | Register new asset |
| GET | `/api/assets/[id]` | Any | Detail + history |
| PATCH | `/api/assets/[id]` | Owner or Agent+ | Update fields |
| POST | `/api/assets/[id]/assign` | Agent+ | Assign/reassign to user |
| POST | `/api/assets/[id]/retire` | Agent+ | Mark as Retired |

### Service Requests

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/service-requests` | Any | List; Employee sees own; Agent+ sees all |
| POST | `/api/service-requests` | Any | Create |
| GET | `/api/service-requests/[id]` | Any | Detail |
| PATCH | `/api/service-requests/[id]` | Requester or Agent+ | Update fields |
| POST | `/api/service-requests/[id]/status` | Agent+ (or requester to cancel) | Transition status |
| POST | `/api/service-requests/[id]/assign` | TeamLead+ | Assign agent |
| POST | `/api/service-requests/[id]/comments` | Any | Add comment |

### User Profile

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/users/[id]/summary` | Self or Agent+ | Assets + open incidents + open service requests |

---

## UI Pages

### `/dashboard/assets`
- Asset inventory table with filters: type, status, assigned user
- Employees see only their assigned assets
- "Register Asset" button (all roles)

### `/dashboard/assets/new`
- Form: name, type, make, model, serial/license key, location, purchase date, warranty expiry, cost
- Submits to `POST /api/assets`

### `/dashboard/assets/[id]`
- Full field display + edit (owner or Agent+)
- Assignment history timeline
- Linked tickets and service requests panel
- Agent+ actions: Reassign, Mark In Repair, Retire

### `/dashboard/service-requests`
- List with `REQ-XXXX` numbers, status badges, category, priority
- Employees see own; Agent+ see all
- Filters: status, category, priority

### `/dashboard/service-requests/new`
- Distinct form: title, description, category, priority
- No impact/urgency matrix — priority selected directly (default P3)

### `/dashboard/service-requests/[id]`
- Fields display, status badge, comments thread
- Actions panel (Agent+): Approve, Reject (reason required), Assign, Mark In Progress, Fulfill
- Linked assets panel

### `/dashboard/users/[id]`
- Profile summary: assigned assets, open incidents (`INC-XXXX`), open service requests (`REQ-XXXX`)
- Visible to the user themselves and Agent+
- Linked from Admin user list

### Navigation
- "Assets" sidebar entry (all roles, below KB)
- "Service Requests" sidebar entry (all roles, separate from "My Tickets")

---

## Permission Summary

| Action | Employee | Agent | TeamLead | Admin |
|---|---|---|---|---|
| Register asset | ✓ | ✓ | ✓ | ✓ |
| View own assets | ✓ | ✓ | ✓ | ✓ |
| View all assets | — | ✓ | ✓ | ✓ |
| Assign/retire asset | — | ✓ | ✓ | ✓ |
| Create service request | ✓ | ✓ | ✓ | ✓ |
| View own requests | ✓ | ✓ | ✓ | ✓ |
| View all requests | — | ✓ | ✓ | ✓ |
| Approve/reject/fulfill | — | ✓ | ✓ | ✓ |
| Assign request to agent | — | — | ✓ | ✓ |
