import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { tickets, callers, categories, users, employees } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { portalCreateTicketSchema } from '@/lib/validators';
import { calculatePriority, calculateSLADueDates } from '@/lib/sla';
import { sendTicketCreatedEmail, sendTicketAssignedEmail } from '@/lib/email';
import type { ApiErrorResponse } from '@/types';

// GET /api/portal/tickets - List the current user's own tickets
export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json<ApiErrorResponse>({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status');
    const userId = parseInt(session.user.id, 10);

    const whereConditions = status
      ? and(eq(tickets.createdBy, userId), eq(tickets.status, status as any))
      : eq(tickets.createdBy, userId);

    const result = await db
      .select({
        id: tickets.id,
        ticketNumber: tickets.ticketNumber,
        title: tickets.title,
        description: tickets.description,
        priority: tickets.priority,
        status: tickets.status,
        slaResolutionDue: tickets.slaResolutionDue,
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
        resolvedAt: tickets.resolvedAt,
        closedAt: tickets.closedAt,
        category: {
          id: categories.id,
          name: categories.name
        },
        assignedAgent: {
          id: users.id,
          fullName: users.fullName
        }
      })
      .from(tickets)
      .leftJoin(categories, eq(tickets.categoryId, categories.id))
      .leftJoin(users, eq(tickets.assignedAgentId, users.id))
      .where(whereConditions)
      .orderBy(desc(tickets.createdAt))
      .limit(100);

    return NextResponse.json({ tickets: result });
  } catch (error) {
    console.error('Error fetching portal tickets:', error);
    return NextResponse.json<ApiErrorResponse>({ error: 'Failed to fetch tickets' }, { status: 500 });
  }
}

// POST /api/portal/tickets - Create ticket from portal (caller auto-filled from session)
export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json<ApiErrorResponse>({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validatedData = portalCreateTicketSchema.parse(body);

    // Generate ticket number
    const countResult = await db.select({ count: tickets.id }).from(tickets);
    const count = countResult.length || 0;
    const sequence = String(count + 1).padStart(4, '0');
    const ticketNumber = `INC-${new Date().getFullYear()}-${sequence}`;

    // Find or create category
    let categoryId: number | null = validatedData.categoryId ?? null;

    // Find or create caller record from session user
    const sessionEmail = session.user.email || '';
    const sessionName = session.user.name || 'Unknown';

    let callerId: number;
    const existingCaller = await db
      .select()
      .from(callers)
      .where(sessionEmail ? eq(callers.email, sessionEmail) : eq(callers.fullName, sessionName))
      .limit(1);

    if (existingCaller.length > 0) {
      callerId = existingCaller[0].id;
    } else {
      // Look up employee reference
      let employeeReferenceId: number | null = null;
      if (sessionEmail) {
        const employee = await db
          .select()
          .from(employees)
          .where(eq(employees.email, sessionEmail))
          .limit(1);
        if (employee.length > 0) {
          employeeReferenceId = employee[0].id;
        }
      }

      const newCaller = await db
        .insert(callers)
        .values({
          fullName: sessionName,
          email: sessionEmail || null,
          employeeReferenceId,
          isGuest: false
        })
        .returning();
      callerId = newCaller[0].id;
    }

    // Calculate priority and SLA
    const priority = calculatePriority(validatedData.impact, validatedData.urgency);
    const createdAt = new Date();
    const slaDueDates = calculateSLADueDates(priority, createdAt);

    // Auto-assign based on category
    let assignedAgentId: number | null = null;
    let initialStatus: 'New' | 'Assigned' = 'New';

    if (categoryId) {
      const { findBestAgentForCategory } = await import('@/lib/assignment');
      const bestAgent = await findBestAgentForCategory(categoryId);
      if (bestAgent) {
        assignedAgentId = bestAgent;
        initialStatus = 'Assigned';
      }
    }

    // Create ticket
    const newTicketRows = await db
      .insert(tickets)
      .values({
        ticketNumber,
        title: validatedData.title,
        description: validatedData.description,
        categoryId,
        impact: validatedData.impact,
        urgency: validatedData.urgency,
        priority,
        status: initialStatus,
        callerId,
        assignedAgentId,
        createdBy: parseInt(session.user.id, 10),
        slaFirstResponseDue: slaDueDates.firstResponseDue,
        slaResolutionDue: slaDueDates.resolutionDue
      })
      .returning();

    const newTicket = (newTicketRows as any[])[0];

    // Email notification to submitter
    if (session.user.email) {
      await sendTicketCreatedEmail(
        session.user.email,
        newTicket.ticketNumber,
        newTicket.title,
        newTicket.priority,
        newTicket.id
      );
    }

    // Email assigned agent
    if (assignedAgentId) {
      const agent = await db.query.users.findFirst({ where: eq(users.id, assignedAgentId) });
      if (agent?.email) {
        await sendTicketAssignedEmail(
          agent.email,
          newTicket.ticketNumber,
          newTicket.title,
          newTicket.priority,
          newTicket.id,
          sessionName
        );
      }
    }

    return NextResponse.json(newTicket, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json<ApiErrorResponse>({ error: 'Validation error', details: error }, { status: 400 });
    }
    console.error('Error creating portal ticket:', error);
    return NextResponse.json<ApiErrorResponse>({ error: 'Failed to create ticket' }, { status: 500 });
  }
}
