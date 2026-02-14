# IT Help Desk MVP Implementation Plan

> **Timeline:** 4-6 weeks (MVP Launch)
> **Status:** ✅ MVP Complete
> **Updated:** 2026-02-13

---

## What's Been Built

All MVP phases are complete. The application is running with the following features implemented:

### Core Infrastructure
- Next.js 15 App Router · React 19 · Drizzle ORM · SQLite (dev) · NextAuth v5
- Role-based access: Employee < Agent < TeamLead < Admin (`lib/rbac.ts`)
- Zod validation schemas (`lib/validators.ts`)
- API error helpers (`lib/api-error.ts`)
- SLA calculation utilities (`lib/sla.ts`)

### Ticket Management
- Full CRUD: `app/api/tickets/`, `app/api/tickets/[id]/`
- Priority auto-calculated from Impact × Urgency matrix → P1–P4
- SLA due dates calculated at creation time
- Status flow: New → Assigned → InProgress → Pending → Resolved → Closed
- Ticket assignment/reassignment: `app/api/tickets/[id]/assign/` + UI in ticket detail
- Resolve with resolution notes: `app/api/tickets/[id]/resolve/`
- Status history tracking: `app/api/tickets/[id]/status/`
- Comments (internal/external): `app/api/tickets/[id]/comments/`
- File attachments: `app/api/tickets/[id]/attachments/`

### Phone Call Logging
- Agents can log calls against tickets: `app/api/calls/`
- Fields: direction, duration, outcome, notes

### Knowledge Base
- Full CRUD API: `app/api/kb/articles/`, `app/api/kb/articles/[id]/`
- Full-text search: `app/api/kb/search/`
- Helpful/not-helpful feedback: `app/api/kb/articles/[id]/feedback/`
- Browse, view, create, edit UI under `app/dashboard/kb/`
- Markdown rendering via `react-markdown`
- Role-gated: Employees see published only; Agent+ see drafts + can create; Admin can delete
- Feedback suppressed after vote via localStorage

### Agent Assignment
- `GET /api/agents` — list assignable users (Agent+)
- Assign/Reassign form on ticket detail page (visible to Agent+)

### Automation
- Auto-close cron: `app/api/cron/auto-close/`
- SLA monitor cron: `app/api/cron/sla-monitor/`
- Similar ticket suggestions: `app/api/tickets/suggest/`

### Analytics
- Recurring issues: `app/api/analytics/recurring/`
- Agent workloads: `app/api/analytics/workloads/`

### Seed Data
- 11 users, 18 tickets, 4 categories, 4 SLA policies, 9 KB articles (8 published, 1 draft)
- Run: `npm run db:seed`

---

---

## Overview

This plan implements the MVP for a simplified IT help desk application focused on:
- Team-level ticket visibility
- Phone call logging
- Essential automation (auto-assignment, status transitions, escalation)
- Knowledge base with search
- SLA tracking
- File attachments

**Deployment:** Vercel/Netlify with PostgreSQL
**Scale:** Medium (1,000-10,000 tickets/month)

---

## Phase 1: Foundation (Week 1)

### Task 1.1: Update Database Schema

**Files:** `lib/db/schema.ts`

**Add new tables:**

```typescript
// Calls table for phone logging
export const calls = sqliteTable('calls', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ticketId: integer('ticket_id').notNull().references(() => tickets.id, { onDelete: 'cascade' }),
  agentId: integer('agent_id').notNull().references(() => users.id),
  callerId: integer('caller_id').references(() => users.id),
  guestUserId: integer('guest_user_id').references(() => guestUsers.id),
  callDirection: text('call_direction', { enum: ['inbound', 'outbound'] }).notNull(),
  duration: integer('duration').notNull(), // seconds
  notes: text('notes').notNull(),
  callOutcome: text('call_outcome', { enum: ['resolved', 'escalated', 'follow_up'] }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
});

// Attachments table
export const attachments = sqliteTable('attachments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ticketId: integer('ticket_id').notNull().references(() => tickets.id, { onDelete: 'cascade' }),
  commentId: integer('comment_id').references(() => comments.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  fileUrl: text('file_url').notNull(),
  fileSize: integer('file_size').notNull(), // bytes
  mimeType: text('mime_type').notNull(),
  uploadedBy: integer('uploaded_by').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
});

// Guest users (for external callers)
export const guestUsers = sqliteTable('guest_users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  company: text('company').notNull(),
  sponsorId: integer('sponsor_id').notNull().references(() => users.id),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
});

// Update tickets table with new fields
// Add to existing tickets table:
departmentId: integer('department_id').references(() => departments.id),
guestUserId: integer('guest_user_id').references(() => guestUsers.id),
lastActivityAt: integer('last_activity_at', { mode: 'timestamp' }),
suggestedTicketId: integer('suggested_ticket_id').references(() => tickets.id),
```

**Commands:**
```bash
npm run db:generate
npm run db:push
```

---

### Task 1.2: Set Up File Storage

**Files:** Create `lib/storage.ts`

```typescript
import { put } from '@vercel/blob';

export async function uploadAttachment(
  file: File,
  ticketId: number,
  uploadedBy: number
): Promise<{ url: string; filename: string }> {
  const filename = `${ticketId}/${Date.now()}-${file.name}`;

  const blob = await put(filename, file, {
    access: 'public',
  });

  return {
    url: blob.url,
    filename: file.name
  };
}

export async function deleteAttachment(url: string): Promise<void> {
  // Vercel Blob handles deletion automatically
  // Or implement S3 deletion
}

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
  'application/zip'
];

export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
```

**Install dependencies:**
```bash
npm install @vercel/blob
```

---

### Task 1.3: Create Department Schema

**Files:** `lib/db/schema.ts`

```typescript
export const departments = sqliteTable('departments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  code: text('code').notNull().unique(), // e.g., 'ENG', 'SALES', 'HR'
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
});
```

---

### Task 1.4: Update Seed Script

**Files:** `lib/db/seed.ts`

Add departments and guest users:

```typescript
// Create departments
const [engineering] = await db.insert(departments).values({
  name: 'Engineering',
  code: 'ENG'
}).onConflictDoNothing().returning();

const [sales] = await db.insert(departments).values({
  name: 'Sales',
  code: 'SALES'
}).onConflictDoNothing().returning();

const [hr] = await db.insert(departments).values({
  name: 'Human Resources',
  code: 'HR'
}).onConflictDoNothing().returning();

// Create guest user
const [guest] = await db.insert(guestUsers).values({
  name: 'External Vendor',
  email: 'vendor@external.com',
  company: 'ACME Corp',
  sponsorId: employee.id
}).onConflictDoNothing().returning();

// Update employee with department
await db.update(users)
  .set({ departmentId: engineering.id })
  .where(eq(users.id, employee.id));
```

---

## Phase 2: Core Features (Week 2)

### Task 2.1: Create Ticket API with Attachments

**Files:** `app/api/tickets/route.ts`

```typescript
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { tickets, attachments } from '@/lib/db/schema';
import { calculatePriority, calculateSLADueDates } from '@/lib/sla';
import { uploadAttachment, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '@/lib/storage';
import { requireRole } from '@/lib/rbac';
import { eq } from 'drizzle-orm';

const createTicketSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  categoryId: z.number().optional(),
  impact: z.enum(['Low', 'Medium', 'High']),
  urgency: z.enum(['Low', 'Medium', 'High']),
  departmentId: z.number().optional()
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    requireRole(session, 'Employee');

    const formData = await req.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const categoryId = formData.get('categoryId') as string | null;
    const impact = formData.get('impact') as string;
    const urgency = formData.get('urgency') as string;
    const departmentId = formData.get('departmentId') as string | null;

    // Validate fields
    const validated = createTicketSchema.parse({
      title,
      description,
      categoryId: categoryId ? parseInt(categoryId) : undefined,
      impact,
      urgency,
      departmentId: departmentId ? parseInt(departmentId) : undefined
    });

    // Handle file uploads
    const files = formData.getAll('files') as File[];
    const uploadedAttachments = [];

    for (const file of files) {
      if (file.size === 0) continue;

      // Validate file
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: 'invalid_file_type', message: `File type ${file.type} not allowed` },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: 'file_too_large', message: 'File size exceeds 25MB limit' },
          { status: 400 }
        );
      }

      // Upload file (after ticket creation)
      uploadedAttachments.push(file);
    }

    // Calculate priority and SLA
    const priority = calculatePriority(
      validated.impact as any,
      validated.urgency as any
    );

    const now = new Date();
    const slaDates = calculateSLADueDates(priority, now);

    // Get category for auto-assignment
    let assignedAgentId: number | null = null;
    if (validated.categoryId) {
      const category = await db.query.categories.findFirst({
        where: eq(categories.id, validated.categoryId)
      });
      assignedAgentId = category?.defaultAgentId || null;
    }

    // Generate ticket number
    const ticketCount = await db.select().from(tickets);
    const ticketNumber = `INC-${String(ticketCount.length + 1).padStart(4, '0')}`;

    // Create ticket
    const [ticket] = await db.insert(tickets).values({
      ticketNumber,
      title: validated.title,
      description: validated.description,
      status: assignedAgentId ? 'In Progress' : 'Open',
      priority,
      impact: validated.impact as any,
      urgency: validated.urgency as any,
      categoryId: validated.categoryId || null,
      assignedAgentId,
      createdBy: parseInt(session.user.id),
      departmentId: validated.departmentId || null,
      slaFirstResponseDue: slaDates.firstResponseDue,
      slaResolutionDue: slaDates.resolutionDue,
      lastActivityAt: now,
      createdAt: now,
      updatedAt: now
    }).returning();

    // Upload attachments
    for (const file of uploadedAttachments) {
      const { url, filename } = await uploadAttachment(
        file,
        ticket.id,
        parseInt(session.user.id)
      );

      await db.insert(attachments).values({
        ticketId: ticket.id,
        filename,
        fileUrl: url,
        fileSize: file.size,
        mimeType: file.type,
        uploadedBy: parseInt(session.user.id)
      });
    }

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    return handleAPIError(error);
  }
}
```

---

### Task 2.2: Auto-Assignment Logic

**Files:** Create `lib/assignment.ts`

```typescript
import { db } from '@/lib/db';
import { tickets, users, categories } from '@/lib/db/schema';
import { eq, count, and, sql } from 'drizzle-orm';

export async function findBestAgentForCategory(
  categoryId: number
): Promise<number | null> {
  // Get category with default agent
  const category = await db.query.categories.findFirst({
    where: eq(categories.id, categoryId)
  });

  if (!category?.defaultAgentId) {
    return null;
  }

  // Get all agents in the system
  const agents = await db.query.users.findMany({
    where: eq(users.role, 'Agent')
  });

  if (agents.length === 0) {
    return null;
  }

  // Calculate workload for each agent
  const workloads = await Promise.all(
    agents.map(async (agent) => {
      const openTickets = await db
        .select({ count: count() })
        .from(tickets)
        .where(
          and(
            eq(tickets.assignedAgentId, agent.id),
            sql`${tickets.status} != 'Resolved'`,
            sql`${tickets.status} != 'Closed'`
          )
        );

      return {
        agent,
        openTickets: openTickets[0].count
      };
    })
  );

  // Find agent with least workload
  workloads.sort((a, b) => a.openTickets - b.openTickets);

  return workloads[0].agent.id;
}

export async function assignTicket(ticketId: number): Promise<void> {
  // Get ticket
  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.id, ticketId)
  });

  if (!ticket || !ticket.categoryId) {
    return;
  }

  // Find best agent
  const agentId = await findBestAgentForCategory(ticket.categoryId);

  if (!agentId) {
    return;
  }

  // Update ticket
  await db.update(tickets)
    .set({
      assignedAgentId: agentId,
      status: 'In Progress',
      updatedAt: new Date()
    })
    .where(eq(tickets.id, ticketId));
}
```

---

### Task 2.3: Phone Call Logging API

**Files:** Create `app/api/calls/route.ts`

```typescript
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { calls, tickets, guestUsers } from '@/lib/db/schema';
import { requireRole } from '@/lib/rbac';
import { eq } from 'drizzle-orm';

const logCallSchema = z.object({
  ticketId: z.number().optional(),
  ticketNumber: z.string().optional(),
  callerId: z.number().optional(),
  guestUserId: z.number().optional(),
  guestName: z.string().optional(),
  guestEmail: z.string().optional(),
  guestCompany: z.string().optional(),
  callDirection: z.enum(['inbound', 'outbound']),
  duration: z.number().min(0),
  notes: z.string().min(1).max(5000),
  callOutcome: z.enum(['resolved', 'escalated', 'follow_up'])
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    requireRole(session, 'Agent');

    const body = await req.json();
    const validated = logCallSchema.parse(body);

    let ticketId = validated.ticketId;
    let guestUserId = validated.guestUserId;

    // Find ticket by number if provided
    if (!ticketId && validated.ticketNumber) {
      const ticket = await db.query.tickets.findFirst({
        where: eq(tickets.ticketNumber, validated.ticketNumber)
      });
      ticketId = ticket?.id;
    }

    // Handle guest user creation/lookup
    if (validated.guestName && validated.guestEmail && validated.guestCompany) {
      const existing = await db.query.guestUsers.findFirst({
        where: eq(guestUsers.email, validated.guestEmail)
      });

      if (existing) {
        guestUserId = existing.id;
      } else {
        const [guest] = await db.insert(guestUsers).values({
          name: validated.guestName,
          email: validated.guestEmail,
          company: validated.guestCompany,
          sponsorId: parseInt(session.user.id)
        }).returning();
        guestUserId = guest.id;
      }
    }

    // Create call log
    const [call] = await db.insert(calls).values({
      ticketId: ticketId || null,
      agentId: parseInt(session.user.id),
      callerId: validated.callerId || null,
      guestUserId,
      callDirection: validated.callDirection,
      duration: validated.duration,
      notes: validated.notes,
      callOutcome: validated.callOutcome
    }).returning();

    return NextResponse.json({ call }, { status: 201 });
  } catch (error) {
    return handleAPIError(error);
  }
}
```

---

## Phase 3: Collaboration (Week 3-4)

### Task 3.1: Email Notifications

**Files:** Create `lib/email.ts`

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendTicketCreatedEmail(
  to: string,
  ticketNumber: string,
  title: string
) {
  await resend.emails.send({
    from: 'IT Help Desk <helpdesk@yourcompany.com>',
    to,
    subject: `Ticket ${ticketNumber} Created`,
    html: `
      <h2>Ticket Created: ${ticketNumber}</h2>
      <p><strong>Subject:</strong> ${title}</p>
      <p>Your ticket has been created and assigned to an agent.</p>
      <p>You can track progress at: <a href="${process.env.NEXT_PUBLIC_APP_URL}/tickets/${ticketNumber}">View Ticket</a></p>
    `
  });
}

export async function sendTicketAssignedEmail(
  to: string,
  ticketNumber: string,
  title: string
) {
  await resend.emails.send({
    from: 'IT Help Desk <helpdesk@yourcompany.com>',
    to,
    subject: `New Assignment: ${ticketNumber}`,
    html: `
      <h2>You have been assigned a new ticket</h2>
      <p><strong>Ticket:</strong> ${ticketNumber}</p>
      <p><strong>Subject:</strong> ${title}</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/agent/tickets/${ticketNumber}">View Ticket</a></p>
    `
  });
}

export async function sendSLABreachEmail(
  to: string,
  ticketNumber: string,
  priority: string
) {
  await resend.emails.send({
    from: 'IT Help Desk <helpdesk@yourcompany.com>',
    to,
    subject: `SLA Breach Alert: ${ticketNumber}`,
    html: `
      <h2>SLA Breach Alert</h2>
      <p>Ticket <strong>${ticketNumber}</strong> has breached its SLA.</p>
      <p><strong>Priority:</strong> ${priority}</p>
      <p>Please investigate immediately.</p>
    `
  });
}
```

**Install:**
```bash
npm install resend
```

---

### Task 3.2: Knowledge Base Search

**Files:** Create `app/api/kb/search/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { knowledgeBaseArticles, categories } from '@/lib/db/schema';
import { auth } from '@/lib/auth';
import { or, ilike, sql } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json({ articles: [] });
    }

    // Full-text search
    const articles = await db
      .select({
        id: knowledgeBaseArticles.id,
        title: knowledgeBaseArticles.title,
        content: knowledgeBaseArticles.content,
        categoryId: knowledgeBaseArticles.categoryId,
        categoryName: categories.name,
        viewCount: knowledgeBaseArticles.viewCount,
        helpfulCount: knowledgeBaseArticles.helpfulCount
      })
      .from(knowledgeBaseArticles)
      .leftJoin(categories, eq(knowledgeBaseArticles.categoryId, categories.id))
      .where(
        and(
          eq(knowledgeBaseArticles.isPublished, true),
          or(
            ilike(knowledgeBaseArticles.title, `%${query}%`),
            ilike(knowledgeBaseArticles.content, `%${query}%`)
          )
        )
      )
      .orderBy(sql`LOWER(${knowledgeBaseArticles.title}) LIKE ${'%' + query + '%'} DESC`)
      .limit(10);

    return NextResponse.json({ articles });
  } catch (error) {
    return handleAPIError(error);
  }
}
```

---

### Task 3.3: Suggested Solutions

**Files:** Create `lib/suggestions.ts`

```typescript
import { db } from '@/lib/db';
import { tickets, categories } from '@/lib/db/schema';
import { eq, and, or, sql, desc } from 'drizzle-orm';

export interface SimilarTicket {
  id: number;
  ticketNumber: string;
  title: string;
  description: string;
  resolution: string;
  categoryId: number;
  categoryName: string;
}

export async function findSimilarTickets(
  title: string,
  description: string,
  categoryId?: number
): Promise<SimilarTicket[]> {
  // Build search terms from title and description
  const keywords = extractKeywords(`${title} ${description}`);

  if (keywords.length === 0) {
    return [];
  }

  // Build OR conditions for each keyword
  const searchConditions = keywords.flatMap(keyword => [
    ilike(tickets.title, `%${keyword}%`),
    ilike(tickets.description, `%${keyword}%`)
  ]);

  // Query for similar resolved tickets
  const results = await db
    .select({
      id: tickets.id,
      ticketNumber: tickets.ticketNumber,
      title: tickets.title,
      description: tickets.description,
      resolution: tickets.resolution, // Add this field to schema
      categoryId: tickets.categoryId,
      categoryName: categories.name
    })
    .from(tickets)
    .leftJoin(categories, eq(tickets.categoryId, categories.id))
    .where(
      and(
        eq(tickets.status, 'Resolved'),
        categoryId ? eq(tickets.categoryId, categoryId) : sql`1=1`,
        or(...searchConditions)
      )
    )
    .orderBy(desc(tickets.resolvedAt))
    .limit(3);

  return results as SimilarTicket[];
}

function extractKeywords(text: string): string[] {
  // Remove common words and extract meaningful keywords
  const stopWords = ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or', 'because'];

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/);

  return words.filter(word => word.length > 3 && !stopWords.includes(word));
}
```

---

## Phase 4: Automation & Polish (Week 5-6)

### Task 4.1: Status Transition Automation

**Files:** Create `app/api/cron/status-transitions/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tickets } from '@/lib/db/schema';
import { eq, and, sql, lt } from 'drizzle-orm';
import { sendSLABreachEmail } from '@/lib/email';

export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  // Check for SLA breaches
  const breachedTickets = await db.query.tickets.findMany({
    where: and(
      sql`${tickets.status} != 'Resolved'`,
      sql`${tickets.status} != 'Closed'`,
      lt(tickets.slaFirstResponseDue, now)
    )
  });

  for (const ticket of breachedTickets) {
    // Get team lead to notify
    const teamLead = await db.query.users.findFirst({
      where: eq(users.role, 'TeamLead')
    });

    if (teamLead?.email) {
      await sendSLABreachEmail(
        teamLead.email,
        ticket.ticketNumber,
        ticket.priority
      );
    }
  }

  // Auto-close resolved tickets after 7 days
  const staleTickets = await db.query.tickets.findMany({
    where: and(
      eq(tickets.status, 'Resolved'),
      lt(sql`datetime(${tickets.resolvedAt}, '+7 days')`, now)
    )
  });

  for (const ticket of staleTickets) {
    await db.update(tickets)
      .set({
        status: 'Closed',
        closedAt: now,
        updatedAt: now
      })
      .where(eq(tickets.id, ticket.id));
  }

  return NextResponse.json({ success: true });
}
```

---

### Task 4.2: Department-Based Visibility

**Files:** Update `app/api/tickets/route.ts` GET handler

```typescript
export async function GET(req: Request) {
  try {
    const session = await auth();
    requireAuth(session);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    // Build query based on user role
    let whereConditions = [];

    if (hasRole(session, 'TeamLead')) {
      // Can see all tickets
      whereConditions.push();
    } else if (hasRole(session, 'Agent')) {
      // Can see all tickets (agents need full visibility)
      whereConditions.push();
    } else {
      // Employees see their own + department tickets
      const user = await db.query.users.findFirst({
        where: eq(users.id, parseInt(session.user.id))
      });

      if (user?.departmentId) {
        whereConditions.push(
          or(
            eq(tickets.createdBy, parseInt(session.user.id)),
            eq(tickets.departmentId, user.departmentId)
          )
        );
      } else {
        whereConditions.push(
          eq(tickets.createdBy, parseInt(session.user.id))
        );
      }
    }

    const tickets = await db.query.tickets.findMany({
      where: status ? and(...whereConditions, eq(tickets.status, status as any)) : and(...whereConditions),
      with: {
        category: true,
        assignedAgent: true,
        createdBy: true
      },
      orderBy: [desc(tickets.createdAt)]
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    return handleAPIError(error);
  }
}
```

---

### Task 4.3: Employee Dashboard

**Files:** Create `app/dashboard/tickets/page.tsx`

```typescript
'use client';

import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';

export default function EmployeeTicketsPage() {
  const { data: session } = useSession();

  const { data: tickets } = useQuery({
    queryKey: ['tickets'],
    queryFn: async () => {
      const res = await fetch('/api/tickets');
      const data = await res.json();
      return data.tickets;
    }
  });

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Tickets</h1>
        <button className="btn btn-primary">
          Create Ticket
        </button>
      </div>

      {/* KB Search */}
      <div className="mb-8">
        <input
          type="search"
          placeholder="Search knowledge base..."
          className="input input-bordered w-full"
        />
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {tickets?.map((ticket: any) => (
          <div key={ticket.id} className="card bg-base-100 shadow">
            <div className="card-body">
              <div className="flex justify-between">
                <div>
                  <h3 className="card-title">{ticket.ticketNumber}: {ticket.title}</h3>
                  <p className="text-sm text-gray-500">{ticket.category?.name}</p>
                </div>
                <div className="text-right">
                  <span className={`badge badge-${getPriorityColor(ticket.priority)}`}>
                    {ticket.priority}
                  </span>
                  <span className="badge badge-outline ml-2">{ticket.status}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Deployment Checklist

### Pre-Launch

- [ ] All database migrations run
- [ ] Environment variables configured
- [ ] Vercel Blob storage set up
- [ ] Resend API key configured
- [ ] Cron job endpoints secured
- [ ] Test accounts created
- [ ] Seed data loaded

### Environment Variables

```bash
# .env.local
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# Vercel Blob
BLOB_READ_WRITE_TOKEN=

# Email
RESEND_API_KEY=

# Cron Security
CRON_SECRET=

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Launch Commands

```bash
# Build
npm run build

# Deploy to Vercel
vercel deploy

# Set up cron job
vercel cron add "*/5 * * * *" https://your-app.com/api/cron/status-transitions
```

---

## Success Metrics Dashboard

Track these metrics for 30 days post-launch:

```typescript
// lib/analytics.ts
export async function getLaunchMetrics() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Adoption
  const totalUsers = await db.select().from(users);
  const activeUsers = await db.select()
    .from(users)
    .where(sql`${users.lastLoginAt} >= ${thirtyDaysAgo}`);

  // Ticket volume
  const totalTickets = await db.select()
    .from(tickets)
    .where(sql`${tickets.createdAt} >= ${thirtyDaysAgo}`);

  // SLA compliance
  const resolvedTickets = totalTickets.filter(t =>
    t.status === 'Resolved' && t.resolvedAt <= t.slaResolutionDue
  );

  return {
    adoptionRate: (activeUsers.length / totalUsers.length) * 100,
    totalTickets: totalTickets.length,
    slaCompliance: (resolvedTickets.length / totalTickets.length) * 100,
    // ... more metrics
  };
}
```

---

## Open Questions for Kickoff

1. **Department Structure**: Do you have a list of departments to seed?
2. **Email Provider**: Resend or SendGrid?
3. **File Storage**: Vercel Blob or AWS S3?
4. **SSO Provider**: Azure AD or Okta?
5. **Employee Directory**: How do we sync with your existing system?

---

**Ready to begin Phase 1: Foundation**
