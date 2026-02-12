# IT Help Desk Application - Product Requirements Document (PRD)

**Version:** 1.0
**Date:** 2025-02-07
**Status:** MVP Definition
**Target Launch:** 4-6 weeks

---

## Executive Summary

The IT Help Desk Application is a simplified, cost-effective internal support ticketing system designed to replace expensive enterprise tools like ServiceNow and JIRA Service Desk. The application focuses on simplicity, team-level visibility, phone call logging, and intelligent automation to improve support team efficiency.

**Key Differentiators:**
- **Simplicity:** Intuitive UI for non-technical employees
- **Cost:** No per-seat licensing, self-hosted on Vercel/Netlify
- **Flexibility:** Custom workflows without vendor constraints
- **Team Visibility:** Department-based ticket visibility for better collaboration
- **Phone Support:** Built-in call logging for phone interactions

**Target Scale:** Medium (1,000-10,000 tickets/month)

---

## Problem Statement

### Current Challenges
1. **High Cost:** Enterprise tools like ServiceNext and JIRA Service Desk require expensive per-seat licensing
2. **Complexity:** Existing tools are over-engineered for basic help desk needs
3. **Poor UX:** Non-technical employees struggle with complex interfaces
4. **Lack of Flexibility:** Vendor tools don't allow custom workflows without expensive enterprise tiers

### Solution Objectives
- Reduce total cost of ownership through open-source, self-hosted solution
- Simplify the ticket creation and tracking experience
- Provide team-level visibility for better collaboration
- Support phone-based support workflows
- Enable intelligent automation to reduce manual work

---

## Goals & Success Metrics

### Primary Goals
1. Launch functional MVP within 4-6 weeks
2. Achieve 80% SLA compliance rate within first 30 days
3. Reduce average first response time by 50% compared to current system
4. Enable 90% of tickets to be resolved without external escalation

### Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **SLA Compliance** | 80%+ | % of tickets resolved within SLA timeframes |
| **User Satisfaction** | 4.0/5.0 | CSAT surveys after ticket resolution |
| **Team Efficiency** | <2hr avg first response | Average time from ticket creation to agent response |
| **Deflection Rate** | 30%+ | % of issues resolved via KB search without ticket creation |
| **Adoption** | 90% employee usage | % of employees using system within 30 days |

---

## User Personas

### Primary Personas

#### 1. Employee (Ticket Submitter)
- **Role:** Non-technical staff member
- **Goals:** Get IT help quickly, track ticket status, find self-help solutions
- **Pain Points:** Complex enterprise tools, unclear ticket status, lack of self-service options
- **Technical Comfort:** Low-Medium
- **Key Needs:** Simple ticket creation, status visibility, knowledge base search

#### 2. Agent (IT Support Staff)
- **Role:** IT support specialist handling tickets
- **Goals:** Efficiently resolve tickets, manage workload, log phone interactions
- **Pain Points:** Manual assignment, lack of call documentation, repetitive similar issues
- **Technical Comfort:** High
- **Key Needs:** Auto-assignment, call logging, similar ticket suggestions, KB article creation

#### 3. Team Lead (Support Manager)
- **Role:** IT support team manager
- **Goals:** Monitor team performance, manage escalations, identify recurring issues
- **Pain Points:** Limited visibility into team workload, reactive escalation management
- **Technical Comfort:** High
- **Key Needs:** Team dashboards, SLA breach alerts, recurring issue detection

#### 4. Admin (System Administrator)
- **Role:** Platform administrator
- **Goals:** Manage users, configure categories, set up SLA policies
- **Pain Points:** Complex configuration, lack of granular permissions
- **Technical Comfort:** High
- **Key Needs:** User management, category configuration, SLA policy setup

### Secondary Personas

#### 5. Guest User (External Caller)
- **Role:** Contractor, vendor, or external partner
- **Goals:** Get support through employee sponsor
- **Key Needs:** Simple ticket submission via sponsor, status tracking

---

## User Stories

### Employee (Ticket Submitter)
- As an employee, I can search the knowledge base before creating a ticket, so I don't waste time for known issues
- As an employee, I can create a ticket with file attachments, so I can provide screenshots and logs
- As an employee, I can view tickets from my department, so I can see if others have similar issues
- As an employee, I receive email updates on my ticket status, so I stay informed without checking the app
- As an employee, I can see my ticket's expected response time, so I know when to expect a resolution

### Agent (IT Support Staff)
- As an agent, tickets are auto-assigned to me based on category and workload, so I don't have to manually pick tickets
- As an agent, I can log phone calls with notes and outcomes, so I can document all interactions
- As an agent, I can see similar resolved tickets when working on a new issue, so I can leverage past solutions
- As an agent, I can create knowledge base articles from resolved tickets, so I can help others self-serve
- As an agent, I receive SLA breach alerts, so I can prioritize overdue tickets
- As an agent, I can see my workload and SLA compliance metrics, so I can track my performance

### Team Lead (Support Manager)
- As a team lead, I can view all team tickets and workloads, so I can balance assignments
- As a team lead, I receive alerts when tickets breach SLA, so I can intervene when needed
- As a team lead, I can see recurring issue patterns, so I can identify systemic problems
- As a team lead, I can reassign tickets between agents, so I can manage workload distribution
- As a team lead, I can view team SLA compliance metrics, so I can track team performance

### Admin (System Administrator)
- As an admin, I can create and manage user accounts, so I can control access
- As an admin, I can configure ticket categories and forms, so I can match our support structure
- As an admin, I can set SLA policies per priority, so I can define our service levels
- As an admin, I can manage guest user accounts, so I can support external callers
- As an admin, I can view all system metrics, so I can monitor system health

---

## Functional Requirements

### FR1: Ticket Management
| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR1.1 | Employees can create tickets with title, description, impact, urgency | P0 | New |
| FR1.2 | Employees can attach files (max 25MB) when creating tickets | P0 | New |
| FR1.3 | Tickets are auto-assigned to agents based on category and workload | P0 | New |
| FR1.4 | Tickets display SLA countdown timers for response and resolution | P0 | New |
| FR1.5 | Employees can view their own tickets and tickets from their department | P0 | New |
| FR1.6 | Employees can add comments to their tickets | P0 | Existing |
| FR1.7 | Agents can update ticket status (New → In Progress → Resolved → Closed) | P0 | Existing |
| FR1.8 | Agents can reassign tickets to other agents | P0 | Existing |
| FR1.9 | System auto-transitions tickets based on time and actions | P1 | New |
| FR1.10 | System auto-escalates overdue tickets to team leads | P1 | New |
| FR1.11 | Agents can resolve tickets with resolution text | P0 | Existing |

### FR2: Phone Call Logging
| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR2.1 | Agents can log inbound/outbound calls with duration and notes | P0 | New |
| FR2.2 | Agents can link calls to existing tickets by ticket number | P0 | New |
| FR2.3 | Agents can create guest users during call logging | P0 | New |
| FR2.4 | System records call outcome (resolved, escalated, follow-up) | P0 | New |
| FR2.5 | Call history is displayed on ticket timeline | P1 | New |

### FR3: Knowledge Base
| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR3.1 | Employees can search knowledge base before creating tickets | P0 | New |
| FR3.2 | KB search returns articles with relevance scoring | P0 | New |
| FR3.3 | Employees can provide helpful/not helpful feedback on articles | P1 | New |
| FR3.4 | Agents can create KB articles from scratch | P0 | New |
| FR3.5 | Agents can convert resolved tickets to KB articles | P1 | New |
| FR3.6 | KB articles are categorized and support markdown content | P0 | New |
| FR3.7 | KB search suggests "create ticket" if no helpful article found | P1 | New |

### FR4: Similar Ticket Suggestions
| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR4.1 | System suggests similar resolved tickets when creating new tickets | P1 | New |
| FR4.2 | Similarity is based on title, description, and category | P1 | New |
| FR4.3 | Suggestions include resolution text from similar tickets | P1 | New |
| FR4.4 | Minimum similarity threshold of 20% to show suggestions | P2 | New |

### FR5: SLA Tracking
| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR5.1 | System calculates first response and resolution SLA based on priority | P0 | Existing |
| FR5.2 | SLA countdown is displayed on tickets | P0 | New |
| FR5.3 | Visual warnings at 80% of SLA elapsed (yellow) | P0 | New |
| FR5.4 | SLA breach triggers red flag and notifies team lead | P0 | New |
| FR5.5 | SLA compliance is tracked per agent and displayed in dashboard | P1 | New |
| FR5.6 | Default SLA policies: P1 (15min/4hr), P2 (1hr/24hr), P3 (4hr/3d), P4 (24hr/7d) | P0 | Configurable |

### FR6: Email Notifications
| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR6.1 | Email confirmation sent to employee when ticket is created | P0 | New |
| FR6.2 | Agent notified when assigned to a ticket | P0 | New |
| FR6.3 | Employee notified when ticket status changes (resolved, closed) | P0 | New |
| FR6.4 | Agent notified at 80% SLA elapsed (yellow warning) | P0 | New |
| FR6.5 | Team lead notified when SLA is breached | P0 | New |
| FR6.6 | New comment notification for ticket owner | P1 | New |

### FR7: Analytics & Reporting
| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR7.1 | Team lead dashboard shows all team workloads | P0 | New |
| FR7.2 | Agents can view their own SLA compliance metrics | P1 | New |
| FR7.3 | Recurring issue detection identifies patterns | P2 | New |
| FR7.4 | Dashboard shows KPIs: open tickets, overdue, avg response time, today's resolved | P1 | New |

### FR8: User Management
| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR8.1 | Admins can create, edit, deactivate user accounts | P0 | Existing |
| FR8.2 | Users have roles: Employee, Agent, Team Lead, Admin | P0 | Existing |
| FR8.3 | Department-based access control (employees see department tickets) | P0 | New |
| FR8.4 | Guest user accounts for external callers (require employee sponsor) | P0 | New |
| FR8.5 | Users can be linked to departments | P0 | New |

---

## Non-Functional Requirements

### Performance
| ID | Requirement | Target | Priority |
|----|-------------|--------|----------|
| NFR1 | Page load time | <2 seconds | P0 |
| NFR2 | API response time (typical) | <200ms | P0 |
| NFR3 | Database query time | <100ms (95th percentile) | P1 |
| NFR4 | Support concurrent users | 50+ simultaneous | P0 |

### Scalability
| ID | Requirement | Target | Priority |
|----|-------------|--------|----------|
| NFR5 | Ticket volume | 1,000-10,000 tickets/month | P0 |
| NFR6 | Database growth | Handle 3 years of ticket data | P1 |
| NFR7 | File storage | 100GB+ attachments | P1 |

### Security
| ID | Requirement | Implementation | Priority |
|----|-------------|----------------|----------|
| NFR8 | Authentication | Email/password + SAML SSO (post-MVP) | P0 |
| NFR9 | Authorization | Role-based access control (RBAC) | P0 |
| NFR10 | Data encryption | Encrypted at rest (file storage) | P0 |
| NFR11 | Input validation | Zod schema validation on all API inputs | P0 |
| NFR12 | SQL injection prevention | Parameterized queries via Drizzle ORM | P0 |
| NFR13 | XSS prevention | React escaping, Content Security Policy | P0 |
| NFR14 | CSRF protection | SameSite cookies | P0 |
| NFR15 | Rate limiting | 10 tickets/hour per user, 100 requests/min per user API | P1 |

### Availability
| ID | Requirement | Target | Priority |
|----|-------------|--------|----------|
| NFR16 | Uptime | 99.5% (scheduled downtime excluded) | P1 |
| NFR17 | Backup | Daily database backups | P0 |

### Maintainability
| ID | Requirement | Implementation | Priority |
|----|-------------|----------------|----------|
| NFR18 | Code quality | ESLint, Prettier, TypeScript strict mode | P0 |
| NFR19 | Testing | Unit tests (Vitest), integration tests, E2E (Playwright) | P1 |
| NFR20 | Documentation | API docs, component docs, deployment guide | P1 |
| NFR21 | Database migrations | DrizzleKit version-controlled migrations | P0 |

### Compliance
| ID | Requirement | Target | Priority |
|----|-------------|--------|----------|
| NFR22 | Data retention | Tickets kept for 3 years, attachments 90 days after close | P2 |
| NFR23 | Audit logging | All sensitive actions logged | P2 |

---

## Technical Architecture

### Technology Stack
```
Frontend:
- Next.js 15 with App Router
- React 19
- Tailwind CSS
- TypeScript

Backend:
- Next.js API Routes
- Server Actions (where applicable)

Database & ORM:
- Drizzle ORM
- SQLite (development)
- PostgreSQL (production via Vercel Postgres or Neon)

Authentication:
- NextAuth v5
- CredentialsProvider (MVP)
- SAMLProvider (post-MVP)

Storage:
- Vercel Blob Storage (production)
- Local filesystem (development fallback)

Email:
- Resend (primary) or SendGrid (alternative)

Hosting:
- Vercel or Netlify (managed Next.js hosting)

Validation:
- Zod schemas
```

### Architecture Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Employee │  │   Agent  │  │Team Lead │  │  Admin   │  │
│  │  Portal  │  │Workspace │  │ Dashboard│  │  Panel   │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
│       │            │            │            │          │
│       └────────────┴────────────┴────────────┴──────────┘  │
│                      │                                     │
└──────────────────────┼─────────────────────────────────────┘
                       │
┌──────────────────────┼─────────────────────────────────────┐
│              ┌───────▼────────┐                             │
│              │   API Layer      │                             │
│              │  (Next.js API    │                             │
│              │   Routes)        │                             │
│              └────────┬────────┘                             │
│                       │                                       │
│       ┌───────────────┼───────────────┬─────────────────┐   │
│       │               │               │                 │   │
│  ┌────▼────┐   ┌─────▼─────┐   ┌─────▼──────┐   ┌──▼─────────┐  │
│  │Auth/SSO │   │Ticket    │   │Knowledge │   │Assignment │  │
│  │Service  │   │Service   │   │Base       │   │Service    │  │
│  └─────────┘   └───────────┘   └───────────┘   └────────────┘  │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Data & Services Layer                 │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │ │
│  │  │ Database │  │  Email   │  │   Blob   │  │  Cache  │ │ │
│  │  │  (Drizzle)│  │ (Resend) │  │ Storage  │  │         │ │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Component Structure
```
app/
├── api/                          # API routes
│   ├── auth/                     # NextAuth configuration
│   ├── tickets/                  # Ticket CRUD operations
│   │   ├── [id]/                # Ticket-specific endpoints
│   │   │   ├── assign/          # Assignment endpoints
│   │   │   ├── attachments/      # File upload/download
│   │   │   ├── calls/            # Phone call logging
│   │   │   ├── resolve/         # Ticket resolution
│   │   │   └── status/          # Status updates
│   │   └── suggest/             # Similar ticket suggestions
│   ├── calls/                   # Call logging API
│   ├── kb/                       # Knowledge base
│   │   └── search/              # KB search
│   ├── analytics/                # Reporting endpoints
│   │   ├── workloads/            # Agent workload stats
│   │   └── recurring/           # Recurring issues
│   └── departments/              # Department management
├── dashboard/                    # Dashboard pages
│   ├── layout.tsx               # Dashboard layout wrapper
│   ├── my-tickets/              # Employee ticket view
│   ├── all-tickets/             # Agent/Team lead ticket view
│   ├── issue-logging/           # Ticket creation form
│   └── agent-workspace/         # Agent workspace
└── components/                   # React components
    ├── tickets/                  # Ticket-related components
    ├── kb/                       # Knowledge base components
    └── shared/                   # Shared UI components

lib/
├── db/                          # Database layer
│   ├── schema.ts                # Drizzle schema definitions
│   ├── seed.ts                  # Database seeding
│   └── migrations/              # Database migrations
├── storage.ts                   # File storage abstraction
├── assignment.ts                # Auto-assignment logic
├── suggestions.ts               # Similar ticket algorithms
├── sla.ts                      # SLA calculations
└── auth.ts                     # Authentication configuration
```

---

## Data Model

### Core Entities

#### Users
```typescript
{
  id: number
  email: string (unique)
  passwordHash: string | null (for SAML users)
  fullName: string
  role: 'Employee' | 'Agent' | 'TeamLead' | 'Admin'
  departmentId: number | null
  samlIdentityId: string | null
  location: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
```

#### Departments
```typescript
{
  id: number
  name: string (unique)
  code: string (unique)  // e.g., 'ENG', 'SALES', 'HR'
  description: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
```

#### Tickets
```typescript
{
  id: number
  ticketNumber: string (unique)  // INC-0001 format
  title: string
  description: string
  categoryId: number | null
  priority: 'P1' | 'P2' | 'P3' | 'P4'
  status: 'New' | 'Assigned' | 'InProgress' | 'Pending' | 'Resolved' | 'Closed'
  callerId: number | null
  guestUserId: number | null
  assignedAgentId: number | null
  createdBy: number | null
  departmentId: number | null
  impact: 'Low' | 'Medium' | 'High'
  urgency: 'Low' | 'Medium' | 'High'
  resolution: string | null
  suggestedTicketId: number | null  // Link to similar resolved ticket
  lastActivityAt: Date | null
  slaFirstResponseDue: Date | null
  slaResolutionDue: Date | null
  resolvedAt: Date | null
  closedAt: Date | null
  createdAt: Date
  updatedAt: Date
}
```

#### Calls (Phone Interactions)
```typescript
{
  id: number
  ticketId: number | null
  callerId: number | null
  guestUserId: number | null
  agentId: number
  callDirection: 'inbound' | 'outbound'
  duration: number  // seconds
  notes: string
  callOutcome: 'resolved' | 'escalated' | 'follow_up'
  createdAt: Date
}
```

#### Guest Users
```typescript
{
  id: number
  name: string
  email: string (unique)
  company: string
  phone: string | null
  sponsorId: number  // Employee who sponsors this guest
  isActive: boolean
  notes: string | null
  createdAt: Date
  updatedAt: Date
}
```

#### Attachments
```typescript
{
  id: number
  ticketId: number
  commentId: number | null
  filename: string
  fileUrl: string
  fileSize: number  // bytes
  mimeType: string
  uploadedBy: number
  createdAt: Date
}
```

#### Knowledge Base Articles
```typescript
{
  id: number
  title: string
  content: string  // markdown
  categoryId: number | null
  createdBy: number
  viewCount: number
  helpfulCount: number
  notHelpfulCount: number
  isPublished: boolean
  createdAt: Date
  updatedAt: Date
}
```

#### Categories
```typescript
{
  id: number
  name: string (unique)
  description: string | null
  parentCategoryId: number | null
  defaultAgentId: number | null
  formSchema: string | null  // JSON for dynamic fields
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
```

#### SLA Policies
```typescript
{
  id: number
  priority: 'P1' | 'P2' | 'P3' | 'P4'
  firstResponseMinutes: number
  resolutionMinutes: number
  createdAt: Date
  updatedAt: Date
}
```

#### Comments
```typescript
{
  id: number
  ticketId: number
  body: string
  authorId: number
  isInternal: boolean
  mentions: number[]  // Array of user IDs
  createdAt: Date
  updatedAt: Date
}
```

### Priority Calculation Matrix
```
           Urgency: Low    Medium    High
Impact: Low     P4        P3        P2
       Medium   P3        P2        P1
       High     P2        P1        P1
```

---

## Integrations

### MVP Integrations

#### 1. Employee Directory (Required)
- **Purpose:** User authentication and department assignment
- **Implementation:**
  - Nightly batch import from Active Directory or custom HR system
  - Map employee records to user accounts
- **Data Fields:** name, email, department, manager, location
- **Fallback:** Manual user creation during MVP

#### 2. Email Service (Required)
- **Purpose:** Transactional email notifications
- **Options:** Resend (recommended) or SendGrid
- **Email Types:**
  - Ticket creation confirmation
  - Ticket assignment notification
  - Status change notifications
  - SLA warning/breach alerts
- **Configuration:** SMTP or API integration

### Post-MVP Integrations

#### 3. SAML SSO (Post-MVP)
- **Purpose:** Corporate single sign-on
- **Providers:** Azure AD Entra or Okta
- **Flow:** Redirect corporate domain to SSO, fallback to local auth for contractors
- **Implementation:** NextAuth SAMLProvider

#### 4. Slack/Teams (Optional)
- **Purpose:** Chat platform integration
- **Use Cases:**
  - Ticket notifications in channels
  - Quick status updates
  - @mention for collaboration
- **Implementation:** Webhooks or API integration

---

## API Endpoints

### Authentication
```
POST   /api/auth/signin              - Login
POST   /api/auth/signout             - Logout
GET    /api/auth/session             - Get current session
GET    /api/auth/providers           - Available auth providers
```

### Tickets
```
POST   /api/tickets                  - Create ticket with attachments
GET    /api/tickets                  - List tickets (filters: ?status=New&agent=123)
GET    /api/tickets/[id]             - Get ticket with relations
PATCH  /api/tickets/[id]             - Update ticket
DELETE /api/tickets/[id]             - Delete ticket (admin only)
```

### Ticket Actions
```
POST   /api/tickets/[id]/assign      - Assign ticket to agent
POST   /api/tickets/[id]/resolve     - Resolve ticket with resolution text
PATCH  /api/tickets/[id]/status      - Update ticket status
POST   /api/tickets/[id]/comments    - Add comment to ticket
```

### Attachments
```
GET    /api/tickets/[id]/attachments     - List ticket attachments
POST   /api/tickets/[id]/attachments     - Upload attachment (multipart/form-data)
DELETE /api/tickets/[id]/attachments/[id] - Delete attachment
```

### Phone Calls
```
GET    /api/calls                     - List all calls
GET    /api/calls?ticketId=123         - Filter calls by ticket
POST   /api/calls                     - Log a phone call
```

### Knowledge Base
```
GET    /api/kb/search?q=term          - Search knowledge base
GET    /api/kb/categories             - List KB categories
GET    /api/kb/articles              - List KB articles
POST   /api/kb/articles              - Create KB article
GET    /api/kb/articles/[id]          - Get KB article
PATCH  /api/kb/articles/[id]          - Update KB article
POST   /api/kb/articles/[id]/feedback - Mark article helpful/not helpful
```

### Suggestions & Analytics
```
GET    /api/tickets/similar?title=X&description=Y&categoryId=Z - Find similar tickets
GET    /api/analytics/workloads                 - Get all agent workloads
GET    /api/analytics/workloads?agentId=123       - Get specific agent workload
GET    /api/analytics/recurring                 - Detect recurring issues
GET    /api/analytics/summary                   - Dashboard KPIs
```

### Departments & Users
```
GET    /api/departments                - List departments
POST   /api/departments                - Create department (admin)
GET    /api/users                       - List users
POST   /api/users                       - Create user (admin)
PATCH  /api/users/[id]                  - Update user (admin)
```

---

## UI/UX Wireframe Descriptions

### Employee Portal (`/dashboard/my-tickets`)

**Layout:**
```
┌────────────────────────────────────────────────────────────┐
│  IT Help Desk                                  [Profile ▼]     │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  Search Knowledge Base...                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ [🔍] Search for answers before creating a ticket    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ + Create New Ticket                                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Filters: [Open] [Resolved] [All]                           │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ INC-0010: Cannot connect to VPN                        │ │
│  │ Status: In Progress | P2 | SLA: 45min remaining        │ │
│  │ Category: Network | Assigned to: Sarah Johnson           │ │
│  │ Created: 2 hours ago                                   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ INC-0009: Monitor flickering issue                       │ │
│  │ Status: Open | P3 | SLA: 3 hours remaining             │ │
│  │ Category: Hardware | Unassigned                         │ │
│  │ Created: 4 hours ago                                   │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ...more tickets...                                         │
└────────────────────────────────────────────────────────────┘
```

### Ticket Creation Modal

**Fields:**
1. **Category Selection (Step 1)**
   - Icon-based category grid (Hardware, Software, Network, Access)
   - Visual selection with category names

2. **Details Form (Step 2)**
   - Title (required, max 200 chars)
   - Description (required, textarea)
   - Impact: Low/Medium/High (dropdown)
   - Urgency: Low/Medium/High (dropdown)
   - Attachments (drag & drop, max 25MB)
   - KB article suggestions displayed if match found

3. **Review & Submit (Step 3)**
   - Display calculated priority
   - Show expected response time based on SLA
   - Confirm or edit

### Agent Workspace (`/dashboard/agent`)

**Layout:**
```
┌────────────────────────────────────────────────────────────┐
│  Agent Workspace                                      [Agent ▼] │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ My Stats                                                │ │
│  │ [Open: 8] [Overdue: 2] [Resolved Today: 5]            │ │
│  │ Avg Response Time: 1.2hrs | SLA Compliance: 92%      │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Filters: [My Tickets] [Unassigned] [SLA Breaching]      │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ INC-0010 | Cannot connect to VPN | P2 | In Progress    │ │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 20min remaining │ │
│  │ Caller: John Smith (ENG) | Created: 2hrs ago           │ │
│  │ [+ Add Comment] [+ Log Call] [+ Resolve]              │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ TICK-1001 | Server Down - Production DB | P1 | New       │ │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 5min remaining  │ │
│  │ Unassigned | Created: 30min ago                         │
│  │ [Assign to Me]                                           │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ...more tickets...                                         │
└────────────────────────────────────────────────────────────┘
```

### Ticket Detail View

**Layout:**
```
┌────────────────────────────────────────────────────────────┐
│  INC-0010: Cannot connect to VPN                          │
│  Status: In Progress | P2 | Assigned to: You               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 20min remaining │ │
│  [+ Edit] [+ Log Call]                                     │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Caller                                                  │ │
│  │ Name: John Smith                                       │ │
│  │ Email: john.smith@company.com                          │ │
│  │ Department: Engineering                                │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Details                                                  │ │
│  │ Title: Cannot connect to VPN                           │ │
│  │ Category: Network                                       │
│  │ Impact: Medium | Urgency: High                       │
│  │ Created: Today, 2:00 PM                                │
│  │ Last Activity: 30 min ago                              │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Description                                              │ │
│  │ VPN connection failing for all remote team members...   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Attachments (2)                                         │ │
│  │ 📄 vpn_error_screenshot.png (256KB)                   │ │
│  │ 📄 network_diagram.pdf (1.2MB)                         │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Similar Resolved Tickets (3)                            │ │
│  │                                                          │ │
│  │ TICK-0842 (Resolved) - "VPN not connecting..."         │ │
│  │ Resolution: Reset network adapter and reconnected...      │ │
│  │                                                          │ │
│  │ [View Full Resolution] [Use This Solution]               │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Activity Timeline                                        │ │
│  │                                                          │ │
│  │ 🔵 Today, 2:00 PM - Ticket created by John Smith       │ │
│  │ 🟢 Today, 2:05 PM - Assigned to you (auto-assignment)    │ │
│  │ 🟢 Today, 2:15 PM - You added comment: "Investigating..." │ │
│  │ 🟢 Today, 2:30 PM - You added note: Phone call logged    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Add Comment                                             │ │
│  │ [💬 Internal Comment] [📎 Toggle @mentions]          │ │
│  │ ┌────────────────────────────────────────────────┐    │ │
│  │ │ Type your comment...                                │    │ │
│  │ │                                                    │    │ │
│  │ │                                                    │    │ │
│  │ └────────────────────────────────────────────────┘    │ │
│ │ [Cancel] [Post Comment]                                 │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Actions                                                 │ │
│ │ [+ Log Call] [Reassign] [Resolve Ticket]               │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Quick Actions                                             │ │
│ │ [Convert to KB Article] [Create Problem Ticket]         │ │
│  └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### Knowledge Base Page (`/kb`)

**Layout:**
```
┌────────────────────────────────────────────────────────────┐
│  Knowledge Base                                             │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 🔍 Search Knowledge Base                                │ │
│  │ ┌────────────────────────────────────────────────┐    │ │
│  │ │ [Type your question or keywords...]            │    │ │
│  │ │                                                    │    │ │
│  │ └────────────────────────────────────────────────┘    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Popular Articles                                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 🔐 How to connect to VPN                                │ │
│  │ 📊 How to request software                             │ │
│  │ 🔑 Password reset instructions                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Browse by Category                                        │
│  ┌──────────────┬──────────────┬──────────────┬────────────┐ │
│  │ 🖥️ Hardware   │ 💻 Software    │ 🌐 Network    │ 🔑 Access   │ │
│  │ 24 articles │ 18 articles  │ 12 articles  │ 15 articles │ │
│  └──────────────┴──────────────┴──────────────┴────────────┘ │
│                                                              │
│  Recent Articles                                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ • Updated: Configuring VPN for Mac (2 days ago)        │ │
│  │ • New: Installing Adobe Creative Cloud (1 week ago)     │ │
│  │ • Updated: Printer setup guide (3 days ago)            │ │
│  └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### KB Article View
```
┌────────────────────────────────────────────────────────────┐
│  ← Back to Knowledge Base                                  │
│                                                              │
│  🔐 How to connect to VPN                                   │
│  Category: Network | Updated: Jan 15, 2025                   │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ [Content: Step-by-step VPN connection instructions...]   │ │
│  │                                                        │ │
│  │ 1. Download the VPN client from...                        │ │
│  │ 2. Install and launch the application...                 │ │
│  │ 3. Enter your credentials when prompted...                │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Was this article helpful?                                │ │
│  │ [👍 Yes (124)] [👎 No (3)]                               │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Still need help?                                          │ │
│  │ [Create ticket about this issue]                           │ │
│  └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### Team Lead Dashboard

**Layout:**
```
┌────────────────────────────────────────────────────────────┐
│  Team Lead Dashboard                                        │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Team Overview                                            │ │
│  │ Total Agents: 3 | Open Tickets: 24 | Overdue: 2         │ │
│  │ Avg SLA Compliance: 89% | Weekly Volume: 156 tickets    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Team Workload                                            │ │
│  │ ┌──────────────────────────────────────────────────┐ │ │
│  │ │ Sarah Johnson     ████████░░░░░ 8 tickets      │ │ │
│  │ │ Michael Chen      ██████░░░░░░░ 6 tickets        │ │ │
│  │ │ Emily Davis      ████░░░░░░░░░░░ 3 tickets        │ │ │
│  │ └──────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ SLA Breaches (Alerts)                                     │ │
│  │ ⚠️ TICK-0010 | 15min overdue | P2 | Sarah Johnson      │ │
│  │ ⚠️ TICK-0008 | 2hrs overdue | P3 | Unassigned        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Recurring Issues This Month                               │ │
│  │ • "VPN connection" - 12 occurrences                   │ │
│  │ • "Printer setup" - 8 occurrences                    │ │
│  │ • "Password reset" - 5 occurrences                   │ │
│  │ [View Details] [Create Problem Ticket]               │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Quick Actions                                             │ │
│ │ [View All Tickets] [Manage Categories] [SLA Policies]   │ │
│  └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

---

## Workflows

### Ticket Creation Workflow
```
┌─────────────┐
│   Employee  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Search KB   │───────┐
└──────┬──────┘       │
       │              ▼
       │         ┌──────────┐
       │         │ Match?   │
       │         └────┬────┘
       │              │
       │         ┌────┴────┐
       ▼         │  No     │
┌──────────┐  │  ┌────▼─────┐
│ Create   │  │  │Select   │
│ Ticket   │  │  │Category │
└────┬─────┘  │  └────┬─────┘
     │       │       │
     │       │       ▼
     │       │  ┌─────────┐
     │       │  │Details  │
     │       │  │Form     │
     │       │  │+ Attach │
     │       │  └────┬────┘
     │       │       │
     ▼       │       ▼
┌─────────┐ │  ┌─────────┐
│ Submit  │ │  │Review & │
└────┬────┘ │  │Confirm │
     │       │  └─────────┘
     ▼       │       │
┌─────────┐ │       │
│ Auto-   │ │       │
│Assign │ │       │
└─────────┘ │       │
     │       │       │
     ▼       │       │
┌─────────┐ │       │
│ Email   │ │       │
│Confirm │ │       │
└─────────┘ │       │
     │       │       │
     └───────┴───────┘
```

### Agent Resolution Workflow
```
┌─────────┐
│  Agent  │
└────┬────┘
     │
     ▼
┌──────────────┐
│ View Ticket  │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ View similar tickets │
│ (with suggestions)   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Add comments/notes    │
│ Optional: Log call    │
└──────────┬───────────┘
           │
           ▼
     ┌─────────┐
     │Resolve? │
     └────┬────┘
          │
     ┌────┴────┐
     │  Yes    │
     └────┬────┘
          │
          ▼
┌──────────────────┐
│ Enter resolution │
│                  │
│ Optional:         │
│ - Convert to KB   │
│ - Create Problem │
│ - Update KB      │
└──────────┬───────┘
           │
           ▼
┌──────────────────┐
│ Mark Resolved    │
└──────────┬───────┘
           │
           ▼
┌──────────────────┐
│ Email to caller  │
│ (auto-sent)      │
└──────────────────┘
```

### SLA Escalation Workflow (Auto)
```
┌────────────────┐
│  Ticket Created  │
└────────┬───────┘
         │
         ▼
┌────────────────────────────┐
│  SLA Countdown Timer Starts  │
│  (Based on Priority Matrix)   │
└────────┬───────────────────┘
         │
    ┌────┴────────┐
    │               │
    │ 80% elapsed │    │SLA Breached
    │               │
    ▼               ▼
┌─────────┐     ┌────────────┐
│ Yellow  │     │ Red Flag   │
│ Warning │     │+ Notify    │
│ to Agent│     │ Team Lead  │
└─────────┘     └──────┬─────┘
                      │
                      ▼
            ┌───────────────────┐
            │ Escalate if still  │
            │ overdue by 2x       │
            └───────────────────┘
```

---

## Dependencies

### Internal Dependencies
| Component | Depends On |
|-----------|-----------|
| Ticket auto-assignment | Categories, Users, SLA Policies |
| SLA tracking | SLA Policies, Tickets |
| Phone call logging | Tickets, Users, Guest Users |
| File attachments | Vercel Blob/Local filesystem |
| Email notifications | Resend/SendGrid account |
| Knowledge base search | KB Articles, Categories |
| Similar tickets | Tickets (resolved), Categories |

### External Dependencies
| Service | Purpose | Required for MVP |
|---------|--------|------------------|
| Vercel/Netlify | Hosting | Yes |
| Vercel Blob Storage | File storage | Yes |
| Resend/SendGrid | Email notifications | Yes |
| PostgreSQL (Vercel Postgres/Neon) | Production database | Yes |
| Employee Directory | User sync | MVP (batch import) |
| SAML Provider (Azure AD/Okta) | SSO | Post-MVP |

### Development Tools
- **Node.js** >= 18.17.0
- **npm** or **pnpm** package manager
- **TypeScript** 5.x
- **Next.js** 15.x
- **Drizzle ORM** for database
- **Vitest** for testing
- **Playwright** for E2E tests

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|------------|------------|
| **File storage costs** | Medium | Low | Set 25MB upload limit, monitor usage, implement quotas |
| **Email deliverability** | High | Low | Use reputable provider (Resend), set up SPF/DKIM records |
| **Database performance** | Medium | Medium | Add indexes before launch, optimize queries, monitor query times |
| **SLA calculation accuracy** | High | Low | Background job with fallback alerting, test thoroughly |
| **Auto-assignment fairness** | Medium | Low | Round-robin with workload balancing, allow manual reassignment |
| **Search relevance quality** | Medium | Medium | Iterative algorithm, user feedback loop, fine-tune ranking |
| **MVP timeline slippage** | Medium | Medium | Prioritize features, have cut-down plan, focus on core workflows |
| **User adoption** | High | Low | Training sessions, documentation, intuitive UX, gradual rollout |
| **Security vulnerabilities** | High | Low | Input validation, parameterized queries, security audit, penetration testing |
| **SSO integration complexity** | Low | Medium | Defer to post-MVP, use proven library (NextAuth), fallback to local auth |

---

## Timeline & Milestones

### 4-Week MVP Sprint

#### Week 1: Foundation (Days 1-7)
**Sprint Goal:** Database schema, authentication, basic ticket CRUD

- [ ] Database schema with all tables (migrations applied)
- [ ] Authentication setup (local auth only)
- [ ] Basic ticket CRUD operations
- [ ] Role-based access control implementation
- [ ] File storage infrastructure setup
- [ ] Department seed data
- [ ] Guest user seed data

#### Week 2: Core Features (Days 8-14)
**Sprint Goal:** Auto-assignment, SLA tracking, file attachments

- [ ] Auto-assignment logic implementation
- [ ] Priority calculation (Impact × Urgency matrix)
- [ ] SLA tracking and breach detection
- [ ] File upload/download for tickets
- [ ] Status transition automation
- [ ] Updated ticket creation with attachments
- [ ] Phone call logging API

#### Week 3: Collaboration (Days 15-21)
**Sprint Goal:** Comments, notifications, knowledge base

- [ ] Comments system with @mentions
- [ ] Email notification system (Resend)
- [ ] Knowledge base search with relevance scoring
- [ ] KB article creation interface
- [ ] Similar ticket suggestions
- [ ] Phone call UI component

#### Week 4: Polish & Launch (Days 22-28)
**Sprint Goal:** Dashboards, testing, launch

- [ ] Employee dashboard
- [ ] Agent workspace
- [ ] Team lead dashboard
- [ ] Admin panel (users, categories, SLA)
- [ ] E2E test coverage
- [ ] Bug fixes and polish
- [ ] Performance optimization
- [ ] Documentation completion
- [ ] MVP launch

### Post-MVP Phase (Months 2-3)
- [ ] SAML SSO integration
- [ ] Advanced analytics dashboards
- [ ] Real-time updates (WebSocket/SSE)
- [ ] Mobile responsive design improvements
- [ ] API documentation

---

## Sample Scenarios

### Scenario 1: Employee Creates Ticket with KB Search
**Actor:** John Smith (Engineering Employee)

**Preconditions:**
- John is logged into the system
- John is experiencing VPN connection issues

**Steps:**
1. John navigates to the Help Desk portal
2. He sees the KB search prominently displayed
3. He types "VPN connection" and searches
4. Results show 3 KB articles, but none match his exact issue
5. He clicks "Still need help? Create ticket" button
6. Category selection screen appears - he selects "Network"
7. He fills in the details:
   - Title: "Cannot connect to VPN from home network"
   - Description: "Getting authentication error when trying to connect..."
   - Impact: Medium, Urgency: High
   - Uploads screenshot of error message
8. Review screen shows calculated priority as P2, expected response: 1 hour
9. He submits the ticket
10. System auto-assigns to Michael Chen (least busy Network agent)
11. John receives email confirmation with ticket number INC-0010

**Expected Outcome:**
- Ticket created successfully
- Auto-assigned to Michael Chen
- Email sent to John
- Michael receives notification

### Scenario 2: Agent Handles Phone Call
**Actor:** Sarah Johnson (IT Agent)

**Preconditions:**
- Sarah is logged in as an Agent
- Phone rings from external vendor

**Steps:**
1. Sarah answers call from external vendor
2. She opens "Log Call" interface
3. She searches for existing ticket by vendor name - none found
4. She creates new ticket logging:
   - Ticket number: INC-0011
   - Caller info: Guest user creation
   - Guest name: "External Vendor Contact"
   - Company: "ACME Corporation"
   - Sponsor: John Smith (employee)
   - Call direction: Inbound
   - Duration: 5 minutes
   - Notes: "Vendor cannot access partner portal"
   - Call outcome: Follow-up
5. System creates guest user record and links to John Smith
6. Call is logged and associated with the new ticket
7. Ticket is auto-assigned to Sarah (she handled the call)

**Expected Outcome:**
- Guest user created and linked to sponsor
- Phone call logged with full details
- Ticket created and assigned to handling agent

### Scenario 3: SLA Breach Escalation
**Actor:** TICK-0010 (High priority VPN issue)

**Preconditions:**
- Ticket created 90 minutes ago
- P2 priority (1-hour first response SLA)
- Assigned to Michael Chen but no activity

**Timeline:**
- T+0min: Ticket created, SLA timer starts (60 minutes)
- T+60min: SLA first response due, no agent activity
- T+68min: 80% SLA elapsed → Yellow warning to Michael
- T+90min: SLA breached → Red flag + notification to Team Lead
- Team Lead (David Martinez) intervenes, reassigns to Sarah Johnson

**Expected Outcome:**
- Michael receives warning at 80% (48 minutes)
- David receives breach alert at 90 minutes
- David reassigns ticket to available agent
- Sarah receives notification of assignment

### Scenario 4: Knowledge Base Creation from Resolved Ticket
**Actor:** Michael Chen (IT Agent)

**Preconditions:**
- Michael has just resolved TICK-0008: "Monitor flickering issue"
- Resolution involved replacing display driver

**Steps:**
1. On resolved ticket screen, Michael clicks "Convert to KB Article"
2. System pre-fills KB article form:
   - Title: "Fix for flickering Dell 24-inch monitor"
   - Category: Hardware
   - Content: Copied from ticket resolution
3. Michael reviews and enhances the content
4. He marks article as published
5. KB article is now searchable for future tickets
6. System tracks view count and helpful feedback

**Expected Outcome:**
- KB article created from resolved ticket
- Future similar searches may surface this article
- Deflection metric improves over time

---

## Open Questions

### Phase 1 (Before MVP Development)

1. **Employee Directory Integration**
   - What system holds your employee data? (Active Directory, LDAP, custom HR system?)
   - How should we sync with it? (Nightly batch import, real-time API, manual CSV upload?)

2. **Department Structure**
   - Do you have a definitive list of departments?
   - Should departments be hierarchical? (e.g., Engineering → Frontend/Backend)
   - Who should be default department for users without a department?

3. **SLA Policy Configuration**
   - Are the default SLA policies acceptable?
   - P1 (15min/4hr), P2 (1hr/24hr), P3 (4hr/3d), P4 (24hr/7d)
   - Or should these be adjusted based on your organization's needs?

4. **Email Provider Setup**
   - Do you have a preference between Resend and SendGrid?
   - Do you have API keys already set up?
   - What should be the "from" email address? (e.g., helpdesk@yourcompany.com)

### Phase 2 (During Development)

5. **Priority Matrix Adjustment**
   - Is the Impact × Urgency priority matrix correct for your workflows?
   - Should any weights be adjusted?

6. **Ticket Number Format**
   - Is "INC-0001" format acceptable, or do you prefer something else?
   - Should number reset each year, or continue incrementing?

7. **Guest User Workflow**
   - For guest users, should the sponsor receive notifications about tickets?
   - Should there be any approval process for guest tickets?

### Phase 3 (Post-MVP)

8. **SSO Provider Selection**
   - Do you use Azure AD Entra, Okta, or another SAML provider?
   - What user attributes should be mapped from SSO? (department, manager, etc.)

9. **Chat Platform Integration**
   - Do you use Slack or Microsoft Teams for internal communication?
   - Should ticket notifications be posted to channels?

10. **Mobile Requirements**
    - How critical is mobile access for your use case?
    - Should we prioritize responsive design or native app?

### Design & UX

11. **Department Visibility Rules**
    - Should employees see all tickets in their department, or be filtered by team?
    - Should there be any "private" departments?

12. **Dashboard Customization**
    - Should agents/leads be able to customize their dashboard views?
    - What metrics are most important to display by default?

### Technical Architecture

13. **File Storage Retention**
    - How long should attachments be kept after ticket closure?
    - Is 90 days acceptable, or do you need longer retention?

14. **Backup & Recovery**
    - What is your RTO (Recovery Time Objective) and RPO (Recovery Point Objective)?
    - Do you need disaster recovery capabilities?

15. **Compliance & Auditing**
    - Are there specific compliance requirements (SOC2, HIPAA, GDPR)?
    - Do you need detailed audit logs for all actions?

---

## Document Approval

**This PRD is ready for stakeholder review.**

Please review the sections above and provide feedback on:
1. Missing requirements or scenarios
2. Adjustments to priorities or scope
3. Additional clarifications needed

Once approved, this document will guide the 4-6 week MVP development sprint.

---

**Document Control**
- **Author:** Claude Code
- **Version:** 1.0
- **Last Updated:** 2025-02-07
- **Next Review:** After stakeholder feedback
