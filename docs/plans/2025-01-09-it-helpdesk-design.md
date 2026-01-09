# IT Help Desk Application Design

**Date:** 2025-01-09
**Status:** Draft
**Inspired by:** ServiceNow, JIRA Service Desk

## Overview

A corporate IT help desk application supporting multiple agents with ticket workflow, SLA tracking, knowledge base, and analytics. Four user roles: Employees, Agents, Team Leads, and Admins.

---

## 1. Architecture & Data Model

### Tech Stack
- **Frontend:** Next.js 15 with App Router, React 19
- **Backend:** Next.js API routes
- **Database:** Drizzle ORM + SQLite (dev), PostgreSQL (prod)
- **Authentication:** NextAuth v5 with hybrid SAML/Credentials
- **Styling:** Tailwind CSS
- **Validation:** Zod

### Database Schema

**Users**
- `id`, `email`, `passwordHash` (local accounts only)
- `samlIdentityId` (SSO accounts)
- `fullName`, `department`, `location`
- `role`: enum(Employee, Agent, TeamLead, Admin)
- `isActive`: boolean

**Tickets**
- `ticketNumber`: auto-generated (INC-0001 format)
- `title`, `description`
- `status`: enum(New, Assigned, InProgress, Pending, Resolved, Closed)
- `priority`: enum(P1, P2, P3, P4)
- `impact`, `urgency`: enum(Low, Medium, High)
- `categoryId`, `assignedAgentId`, `createdBy`
- `slaFirstResponseDue`, `slaResolutionDue`: timestamps
- `resolvedAt`, `closedAt`: nullable timestamps

**Categories** (hierarchical)
- `id`, `name`, `parentCategoryId`
- `defaultAgentId` for auto-assignment
- `formSchema`: JSON defining dynamic fields

**Comments**
- `ticketId`, `body`, `authorId`
- `isInternal`: boolean (agent-only visibility)
- `mentions`: JSON array of userIds

**KnowledgeBaseArticles**
- `title`, `content` (markdown)
- `categoryId`, `createdBy`
- `viewCount`, `helpfulCount`, `notHelpfulCount`
- `isPublished`: boolean

**SLAPolicies**
- `priority`: enum(P1, P2, P3, P4)
- `firstResponseMinutes`, `resolutionMinutes`

---

## 2. User Interface & Experience

### Employee Portal (`/tickets`)
- **Knowledge Base Search:** Prominent type-ahead search before ticket submission
- **Create Ticket Wizard:** 3-step modal (Category → Dynamic Form → Review)
- **Category Selection:** Icons + friendly names (non-technical)
- **Ticket View:** Status, expected response time, comment thread

### Agent Dashboard (`/agent`)
- **Sidebar Filters:** My Tickets, Unassigned, Team's Tickets, SLA Breaching
- **Ticket Table:** Sortable columns, SLA countdown progress bars, color-coded priorities
- **KPI Cards:** Open Tickets, Overdue, Avg Response Time, Today's Resolved

### Team Lead View
- **Team Performance Tab:** Workload distribution, SLA compliance
- **Bulk Actions:** Reassign multiple, update category
- **Trending Issues:** Recurring problem detection

### Admin Panel (`/admin`)
- **User Management:** Create, promote, deactivate
- **Category Builder:** Visual form designer with live preview
- **SLA Configuration:** Set response/resolution times per priority

### Knowledge Base (`/kb`)
- Public search with helpful/not helpful feedback
- "Create ticket about this" pre-fills category from search

### Design Language
- Modern, friendly like JIRA Service Desk
- Blue/green palette for trust, warm accents for priorities
- Clean sans-serif typography (Inter)
- Subtle hover states and transitions

---

## 3. Workflows & Key Features

### Ticket Creation Flow
1. Employee selects category → dynamic form loads
2. Priority auto-calculates from Impact × Urgency matrix
3. Ticket created as "New"
4. Auto-assignment runs (find category agent, check workload, assign)
5. Status becomes "Assigned", agent notified

### Priority Matrix
```
           Urgency: Low    Medium    High
Impact: Low     P4        P3        P2
       Medium   P3        P2        P1
       High     P2        P1        P1
```

### Agent Work Flow
- Click ticket → status changes to "In Progress" → SLA first-response stops
- Add comments (toggle "Internal" for agent-only)
- @mention other agents/Team Leads
- Need input? → Change to "Pending"
- Resolved? → Change to "Resolved" → employee notified
- Employee can reopen or auto-close after X days

### SLA Tracking
- `firstResponseDue` = createdAt + SLA policy
- `resolutionDue` = createdAt + SLA policy
- Background job checks every minute
- 80% elapsed → yellow warning flag
- Breached → red flag, notify Team Lead
- Track % resolved within SLA per agent

### Knowledge Base Integration
- "Convert to KB Article" from resolved tickets
- Links to category for intelligent suggestions
- Search pre-fills ticket title if no article helped

---

## 4. API Design

### RESTful Routes
```
POST   /api/tickets              - Create ticket
GET    /api/tickets              - List with filters (?status=Open&agent=123)
GET    /api/tickets/[id]         - Fetch single with relations
PATCH  /api/tickets/[id]         - Update status, assignment, priority
POST   /api/tickets/[id]/comments - Add comment
GET    /api/tickets/[id]/activity - Audit trail
GET    /api/categories           - List categories
GET    /api/categories/[id]/form-schema - Dynamic form fields
GET    /api/agents               - Search for assignment
GET    /api/analytics/summary    - Dashboard stats
GET    /api/analytics/sla        - SLA compliance
GET    /api/analytics/recurring  - Recurring issues
GET    /api/kb/search?q=         - Search knowledge base
POST   /api/kb/articles          - Create article (agents)
```

### Role-Based Access Control
- **Employees:** CRUD own tickets, read KB
- **Agents:** CRUD assigned tickets, read all, create KB articles
- **Team Leads:** All agent permissions + reassign any ticket, team analytics
- **Admins:** All permissions + manage users, categories, SLA policies

### Real-Time Updates
- Polling (30-second interval) for ticket list refresh
- Future: SSE or Pusher for instant updates

---

## 5. Authentication

### Hybrid Flow
1. Login attempt → check email domain
2. Corporate domain (`@company.com`) → redirect to SAML SSO
3. Non-corporate → show local login form
4. First login → create user record, determine role from SAML attributes or default to Employee

### Providers
- **CredentialsProvider:** Email/password for contractors
- **SAMLProvider:** Corporate SSO (Okta, Azure AD, Entra)

### Session
- JWT strategy for stateless API auth
- Token contains: `userId`, `email`, `role`
- Server-side: `auth()` validates session
- Client-side: session cookie included automatically

---

## 6. Error Handling

| Status | Response | Client Behavior |
|--------|----------|-----------------|
| 400 | `{ error: "field_name", message: "Friendly message" }` | Inline error |
| 404 | `{ error: "not_found" }` | Friendly "Resource not found" |
| 401 | NextAuth handles | Redirect to login |
| 403 | `{ error: "forbidden" }` | "You don't have permission" |
| 500 | Log to Sentry, return generic message | Friendly error page |

- React Error Boundary wraps each route
- Zod schemas validate all API inputs

---

## 7. Security

- Rate limiting on ticket creation
- SQL injection prevention via Drizzle parameterized queries
- XSS prevention via React escaping
- CSRF protection via sameSite cookies
- Content Security Policy headers
- Input sanitization with Zod

---

## 8. Testing Strategy

### Unit Tests (Vitest)
- Priority matrix calculation
- SLA breach detection
- Business logic utilities

### Integration Tests
- API routes with test user auth
- CRUD operations per role

### E2E Tests (Playwright)
- Create ticket flow
- Agent assignment flow
- Resolution flow

### Manual Testing
- Test users for each role
- Walk through each workflow
- SLA breach scenarios

---

## 9. Implementation Phases

### Phase 1: Foundation
- Database schema + migrations
- Authentication setup (local only initially)
- Basic CRUD for tickets
- Role-based access control

### Phase 2: Core Features
- Category-based auto-assignment
- Dynamic forms per category
- Priority matrix calculation
- SLA tracking and breach detection

### Phase 3: Collaboration
- Comments with @mentions
- Email notifications
- Knowledge base with search

### Phase 4: Analytics & Admin
- Analytics dashboard
- SLA reporting
- Admin panels
- Recurring issue detection

### Phase 5: Polish
- SAML SSO integration
- Real-time updates
- E2E test coverage
- Performance optimization
