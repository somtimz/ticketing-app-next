# IT Help Desk MVP Design Document

**Date:** 2025-02-07
**Status:** Refined Requirements
**Target Launch:** 4-6 weeks (MVP)
**Deployment:** Single company, Vercel/Netlify
**Scale:** Medium (1,000-10,000 tickets/month)

---

## Executive Summary

A simplified IT help desk application designed to replace expensive/complex tools like ServiceNow and JIRA Service Desk. Focus on simplicity, team-level visibility, phone call logging, and essential automation features.

### Core Problems Solved

- **Cost**: Avoid expensive per-seat licensing of enterprise tools
- **Complexity**: Simple, intuitive UI for non-technical employees
- **Flexibility**: Custom workflows without vendor constraints

### Success Metrics

1. **SLA Compliance**: % of tickets resolved within SLA timeframes
2. **User Satisfaction**: Employee/agent CSAT scores
3. **Team Efficiency**: Tickets per agent, resolution time, reopen rate

---

## 1. Product Requirements

### MVP Scope (4-6 weeks)

**Must-Have Features:**

- Ticket creation and workflow (Open → In Progress → Resolved → Closed)
- Role-based access (Employee, Agent, Team Lead, Admin)
- Knowledge base with search
- SLA tracking with breach alerts
- Email notifications (Resend/SendGrid)
- File attachments (screenshots, logs, documents)
- Phone call logging for agents
- Team-level ticket visibility (department-based)
- Auto-assignment by category
- Status transition automation
- Escalation rules for overdue tickets
- Suggested solutions from similar tickets

**Post-MVP:**

- SAML SSO integration
- Advanced analytics dashboard
- Real-time updates (WebSocket/SSE)
- Mobile app

---

## 2. User Roles & Permissions

### Role Matrix

| Feature | Employee | Agent | Team Lead | Admin |
|---------|----------|-------|-----------|-------|
| Create tickets | ✅ | ✅ | ✅ | ✅ |
| View own tickets | ✅ | ✅ | ✅ | ✅ |
| View team tickets | ✅ (dept only) | ✅ (all) | ✅ (all) | ✅ (all) |
| Update own tickets | ✅ | ✅ | ✅ | ✅ |
| Assign tickets | ❌ | ✅ | ✅ | ✅ |
| Resolve tickets | ❌ | ✅ | ✅ | ✅ |
| Log phone calls | ❌ | ✅ | ✅ | ✅ |
| Create KB articles | ❌ | ✅ | ✅ | ✅ |
| View analytics | ❌ | Own stats | Team stats | All stats |
| Manage users | ❌ | ❌ | ❌ | ✅ |
| Manage categories | ❌ | ❌ | ❌ | ✅ |
| Configure SLA | ❌ | ❌ | ❌ | ✅ |

### Department-Based Visibility

- Employees see tickets from their department
- Agents see all tickets
- Team Leads see all tickets + team performance
- Admins see everything

---

## 3. Key Features Detail

### 3.1 Ticket Creation

**Employee Flow:**

1. Search knowledge base first (deflection)
2. If no solution found → create ticket
3. Select category → dynamic form loads
4. Attach files (required feature)
5. Submit → auto-assign based on category

**Agent Call Logging Flow:**

1. Click "Log Call" button
2. Select caller (employee or guest with sponsor)
3. Select or create ticket
4. Document call details (notes, outcome)
5. Call linked to ticket activity log

### 3.2 Auto-Assignment Logic

```
Priority Calculation:
Impact × Urgency = Priority

           Urgency: Low    Medium    High
Impact: Low     P4        P3        P2
       Medium   P3        P2        P1
       High     P2        P1        P1

Assignment Rules:
1. Match category → default agent
2. Check agent workload (assign to least busy)
3. Round-robin if workload equal
4. Escalate if no agent available
```

### 3.3 SLA Tracking

**Default SLA Policies:**

| Priority | First Response | Resolution |
|----------|---------------|------------|
| P1       | 15 minutes    | 4 hours    |
| P2       | 1 hour        | 24 hours   |
| P3       | 4 hours       | 3 days     |
| P4       | 24 hours      | 7 days     |

**Escalation Rules:**

- 80% of SLA elapsed → Yellow warning to agent
- SLA breached → Red alert to Team Lead
- 2x SLA time → Escalate to admin

### 3.4 Email Integration

**Outbound Notifications:**

- Ticket created → confirmation to employee
- Ticket assigned → notification to agent
- Ticket resolved → notification to employee
- SLA warning → notification to agent
- SLA breached → notification to Team Lead
- New comment on owned ticket → notification

**Inbound Email:**

- Create ticket from email
- Reply to ticket updates comments
- Parse attachments

### 3.5 Knowledge Base

**Features:**

- Full-text search with auto-suggest
- Category-based organization
- Helpful/not helpful feedback
- "Convert to KB" from resolved tickets
- View count and popularity
- Suggested articles during ticket creation

**Search Integration:**

- Prominent search on employee dashboard
- "Did this help?" feedback
- "No? Create ticket" → pre-fills category

---

## 4. Data Model Updates

### New Tables

**Calls**

```typescript
{
  id: number
  ticketId: number
  agentId: number
  callerId: number | null  // null for guest
  guestSponsorId: number | null
  callDirection: 'inbound' | 'outbound'
  duration: number  // seconds
  notes: string
  callOutcome: 'resolved' | 'escalated' | 'follow-up'
  createdAt: Date
}
```

**Attachments**

```typescript
{
  id: number
  ticketId: number
  commentId: number | null
  filename: string
  fileUrl: string
  fileSize: number
  mimeType: string
  uploadedBy: number
  createdAt: Date
}
```

**TicketVisibility** (for department access)

```typescript
{
  ticketId: number
  departmentId: number
  visibility: 'private' | 'team' | 'department'
}
```

**GuestUsers**

```typescript
{
  id: number
  name: string
  email: string
  company: string
  sponsorId: number  // employee reference
  isActive: boolean
  createdAt: Date
}
```

### Updated Tickets Table

```typescript
{
  // ... existing fields ...
  departmentId: number | null
  guestUserId: number | null
  lastActivityAt: Date  // for auto-status transitions
  suggestedTicketId: number | null  // linked to similar resolved ticket
}
```

---

## 5. Infrastructure & Integrations

### Deployment Strategy

- **Platform**: Vercel or Netlify (managed Next.js hosting)
- **Database**: PostgreSQL (Vercel Postgres or Neon)
- **File Storage**: Vercel Blob Storage or AWS S3
- **Email**: Resend (recommended) or SendGrid

### v1 Integrations

**SSO/SAML (Post-MVP)**

- Provider: Azure AD Entra or Okta
- Flow: Redirect corporate domain to SSO
- Fallback: Local auth for contractors

**Employee Directory**

- Source: Active Directory or custom HR system
- Sync: Nightly batch import
- Fields: name, email, department, manager, location

### File Upload Limits

- Max file size: 25MB
- Allowed types: Images, PDFs, text files, logs
- Storage: Encrypted at rest
- Retention: Keep until ticket closed + 90 days

---

## 6. Automation Features

### 6.1 Auto-Assignment

```javascript
// Pseudocode
function assignTicket(ticket) {
  const categoryAgents = getAgentsForCategory(ticket.categoryId);
  const workloads = categoryAgents.map(a => getOpenTicketCount(a.id));
  const leastBusy = minBy(workloads);
  return leastBusy.id;
}
```

### 6.2 Status Transitions

```javascript
// Auto-transition rules
onTicketCreated → status = 'Open'
onAgentAssigned → status = 'In Progress'
onAgentView → status = 'In Progress', startFirstResponseTimer
onResolved → status = 'Resolved', startResolutionTimer
onCustomerReply → status = 'In Progress'
onPending > 3 days → auto-escalate to Team Lead
onResolved > 7 days no response → auto-close
```

### 6.3 Escalation Rules

```javascript
// Check every 5 minutes
if (now > ticket.slaFirstResponseDue) {
  notifyAgent(ticket);
  if (now > ticket.slaFirstResponseDue + 30min) {
    notifyTeamLead(ticket);
  }
}
if (now > ticket.slaResolutionDue) {
  escalateToManager(ticket);
}
```

### 6.4 Suggested Solutions

```javascript
// Find similar resolved tickets
function findSimilarTickets(ticket) {
  const similar = db.tickets.find({
    where: {
      categoryId: ticket.categoryId,
      status: 'Resolved',
      OR: [
        { title: { contains: ticket.title } },
        { description: { contains: ticket.description } }
      ]
    },
    orderBy: { resolvedAt: 'desc' },
    limit: 3
  });
  return similar;
}
```

---

## 7. User Interface Design

### Employee Dashboard (`/tickets`)

**Layout:**

- Header: Search KB, Create Ticket button, User menu
- Sidebar: My Tickets, Department Tickets, Knowledge Base
- Main: Ticket list with filters

**Ticket Cards:**

- Ticket number (INC-0001)
- Title
- Status badge (color-coded)
- Priority badge
- Assigned agent (if any)
- SLA countdown (if applicable)
- Last activity

### Agent Workspace (`/agent`)

**Layout:**

- Header: Unassigned count, My assignments, SLA warnings
- Sidebar: Filters (My Tickets, Unassigned, All, SLA Breaching)
- Main: Ticket table or detail view

**Ticket Detail:**

- Header: Ticket info, SLA progress bar
- Tabs: Activity, Comments, Calls, Similar Tickets
- Actions: Assign, Resolve, Close, Log Call, Convert to KB

### Knowledge Base (`/kb`)

**Layout:**

- Hero: Large search input
- Categories: Card grid with icons
- Popular: Most viewed articles
- Recent: Latest articles

**Article View:**

- Title, category, last updated
- Content (markdown rendered)
- "Was this helpful?" buttons
- "Still need help? Create ticket" → pre-filled form

### Admin Panel (`/admin`)

**Tabs:**

- Users: CRUD, promote/demote, deactivate
- Categories: Manage, form builder
- SLA Policies: Configure per priority
- Departments: Manage, assign agents
- Analytics: Dashboard with metrics

---

## 8. API Routes

### MVP Endpoints

```
# Tickets
POST   /api/tickets                    - Create ticket (with attachments)
GET    /api/tickets                    - List (with filters)
GET    /api/tickets/[id]               - Get detail
PATCH  /api/tickets/[id]               - Update (assign, status)
DELETE /api/tickets/[id]               - Delete (admin only)

# Comments
POST   /api/tickets/[id]/comments      - Add comment
GET    /api/tickets/[id]/comments      - List comments

# Calls
POST   /api/calls                      - Log phone call
GET    /api/tickets/[id]/calls         - Get ticket calls

# Attachments
POST   /api/tickets/[id]/attachments   - Upload file
GET    /api/attachments/[id]           - Download file
DELETE /api/attachments/[id]           - Delete file

# Knowledge Base
GET    /api/kb/search?q=term           - Search articles
GET    /api/kb/articles                - List articles
GET    /api/kb/articles/[id]           - Get article
POST   /api/kb/articles                - Create article
PATCH  /api/kb/articles/[id]           - Update article
POST   /api/kb/articles/[id]/feedback  - Helpful/not helpful

# Analytics
GET    /api/analytics/my-stats          - Agent stats
GET    /api/analytics/team-stats        - Team stats (Team Lead)
GET    /api/analytics/organization      - Org stats (Admin)
GET    /api/analytics/sla-compliance    - SLA metrics

# Admin
GET    /api/admin/users                - List users
POST   /api/admin/users                - Create user
PATCH  /api/admin/users/[id]           - Update user
GET    /api/admin/categories           - List categories
POST   /api/admin/categories           - Create category
GET    /api/admin/sla-policies         - List SLA policies
PATCH  /api/admin/sla-policies/[id]    - Update SLA
```

---

## 9. Security Considerations

### Authentication

- MVP: Email/password with bcrypt
- Post-MVP: SAML SSO with corporate directory

### Authorization

- Role-based access control (RBAC)
- Department-level visibility for employees
- API route middleware for permission checks

### File Upload Security

- Validate file types (magic bytes, not extension)
- Scan for malware (ClamAV or cloud service)
- Size limits (25MB max)
- Encrypt at rest
- Generate unique filenames (prevent path traversal)

### Rate Limiting

- Ticket creation: 10 per hour per user
- API requests: 100 per minute per user
- File upload: 5 per minute per user

### Data Privacy

- PII encryption at rest
- Audit logs for sensitive actions
- Data retention policy (tickets kept for 3 years)

---

## 10. MVP Timeline (4-6 weeks)

### Week 1-2: Foundation

- [ ] Database schema with all tables
- [ ] Authentication (local only)
- [ ] Basic ticket CRUD
- [ ] Role-based access control
- [ ] File upload infrastructure

### Week 3: Core Features

- [ ] Ticket creation with attachments
- [ ] Priority calculation (Impact × Urgency)
- [ ] Auto-assignment logic
- [ ] SLA tracking and breach detection
- [ ] Status transition automation

### Week 4: Collaboration

- [ ] Comments system with @mentions
- [ ] Phone call logging
- [ ] Email notifications (Resend)
- [ ] Knowledge base search
- [ ] Suggested solutions

### Week 5-6: Polish & Testing

- [ ] Employee dashboard
- [ ] Agent workspace
- [ ] Admin panel
- [ ] Department-based visibility
- [ ] Escalation rules
- [ ] E2E testing
- [ ] Bug fixes

---

## 11. Success Criteria

### Launch Checklist

- [ ] All 4 roles can login and perform permitted actions
- [ ] Employees can create tickets with attachments
- [ ] Agents can log phone calls and resolve tickets
- [ ] Auto-assignment works correctly
- [ ] SLA breaches trigger escalations
- [ ] Email notifications are sent for key events
- [ ] Knowledge base search returns relevant results
- [ ] Department visibility rules are enforced

### Post-Launch Metrics (Track for 30 days)

- **Adoption**: % of employees using the system
- **Deflection**: % of KB searches that prevent ticket creation
- **SLA Compliance**: % of tickets resolved within SLA
- **CSAT**: Average satisfaction score (1-5)
- **Response Time**: Average first response time

---

## 12. Open Questions

1. **Employee Directory Integration**: Which system? AD, LDAP, or custom?
2. **SSO Provider**: Azure AD Entra or Okta?
3. **Email Provider**: Resend or SendGrid?
4. **Department Structure**: Flat list or hierarchical?
5. **Guest User Workflow**: How to validate sponsor relationship?

---

## 13. Dependencies & Risks

### Technical Risks

- **File storage costs**: Monitor usage, set quotas
- **Email deliverability**: Set up SPF/DKIM records
- **Database performance**: Index optimization needed
- **SLA accuracy**: Background job reliability

### Mitigation

- Start with generous storage limits, monitor usage
- Use reputable email provider with good deliverability
- Add database indexes before launch
- Use cron job with fallback alerting

---

## 14. Next Steps

1. **Confirm integrations**: Employee directory, SSO, email provider
2. **Finalize database schema**: Include all new tables
3. **Set up staging environment**: Vercel/Netlify project
4. **Create wireframes**: UI mockups for key screens
5. **Begin Phase 1 implementation**: Foundation
