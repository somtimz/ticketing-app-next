import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { tickets, callers, categories, calls, users, employees } from '@/lib/db/schema';
import { eq, desc, or, and, sql, isNotNull, inArray } from 'drizzle-orm';
import { createTicketSchema, type CreateTicketInput } from '@/lib/validators';
import { calculatePriority, calculateSLADueDates } from '@/lib/sla';
import { sendTicketCreatedEmail, sendTicketAssignedEmail } from '@/lib/email';
import { hasRole } from '@/lib/rbac';
import type { TicketWithRelations, ApiErrorResponse } from '@/types';

// GET /api/tickets - List tickets
export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json<ApiErrorResponse>(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');
    const slaRisk = searchParams.get('slaRisk'); // 'breach' | 'at-risk' | 'healthy'
    const assignedAgentIdParam = searchParams.get('assignedAgentId');

    // Build WHERE clause based on user role and department
    const userId = parseInt(session.user.id);

    // Get user's department
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        departmentId: true
      }
    });

    // Build base access conditions
    let accessConditions;

    if (hasRole(session, 'TeamLead') || hasRole(session, 'Admin')) {
      // Team Leads and Admins can see all tickets
      accessConditions = sql`1=1`;
    } else if (hasRole(session, 'Agent')) {
      // Agents can see all tickets (full visibility needed for assignment)
      accessConditions = sql`1=1`;
    } else {
      // Employees see their own tickets + department tickets
      if (user?.departmentId) {
        accessConditions = or(
          eq(tickets.createdBy, userId),
          eq(tickets.departmentId, user.departmentId)
        );
      } else {
        // No department assigned - only see own tickets
        accessConditions = eq(tickets.createdBy, userId);
      }
    }

    // Combine all filter conditions
    const filterConditions = [];

    if (status) {
      // Support comma-separated statuses e.g. "InProgress,Assigned,New"
      const statusList = status.split(',').map(s => s.trim());
      if (statusList.length === 1) {
        filterConditions.push(eq(tickets.status, statusList[0] as any));
      } else {
        filterConditions.push(inArray(tickets.status, statusList as any[]));
      }
    }

    if (assignedAgentIdParam) {
      const agentId = parseInt(assignedAgentIdParam, 10);
      if (!isNaN(agentId)) {
        filterConditions.push(eq(tickets.assignedAgentId, agentId));
      }
    }

    if (slaRisk) {
      // Only filter tickets that have slaResolutionDue set
      filterConditions.push(isNotNull(tickets.slaResolutionDue));
      if (slaRisk === 'breach') {
        // slaResolutionDue < now()
        filterConditions.push(sql`${tickets.slaResolutionDue} < now()`);
      } else if (slaRisk === 'at-risk') {
        // slaResolutionDue BETWEEN now() AND now() + interval '2 hours'
        filterConditions.push(sql`${tickets.slaResolutionDue} >= now()`);
        filterConditions.push(sql`${tickets.slaResolutionDue} <= now() + interval '2 hours'`);
      } else if (slaRisk === 'healthy') {
        // slaResolutionDue > now() + interval '2 hours'
        filterConditions.push(sql`${tickets.slaResolutionDue} > now() + interval '2 hours'`);
      }
    }

    let whereConditions;
    if (filterConditions.length === 0) {
      whereConditions = accessConditions;
    } else {
      whereConditions = and(accessConditions, ...filterConditions);
    }

    const result = await db
      .select({
        id: tickets.id,
        ticketNumber: tickets.ticketNumber,
        title: tickets.title,
        description: tickets.description,
        impact: tickets.impact,
        urgency: tickets.urgency,
        priority: tickets.priority,
        status: tickets.status,
        slaFirstResponseDue: tickets.slaFirstResponseDue,
        slaResolutionDue: tickets.slaResolutionDue,
        lastActivityAt: tickets.lastActivityAt,
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
        resolvedAt: tickets.resolvedAt,
        closedAt: tickets.closedAt,
        createdBy: tickets.createdBy,
        category: {
          id: categories.id,
          name: categories.name
        },
        caller: {
          id: callers.id,
          fullName: callers.fullName,
          email: callers.email,
          phone: callers.phone
        },
        assignedAgent: {
          id: users.id,
          fullName: users.fullName,
          email: users.email
        }
      })
      .from(tickets)
      .leftJoin(categories, eq(tickets.categoryId, categories.id))
      .leftJoin(callers, eq(tickets.callerId, callers.id))
      .leftJoin(users, eq(tickets.assignedAgentId, users.id))
      .where(whereConditions)
      .orderBy(desc(tickets.createdAt))
      .limit(limit);

    const typedResult: TicketWithRelations[] = result.map(ticket => ({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      title: ticket.title,
      description: ticket.description,
      impact: ticket.impact,
      urgency: ticket.urgency,
      priority: ticket.priority,
      status: ticket.status,
      slaFirstResponseDue: ticket.slaFirstResponseDue,
      slaResolutionDue: ticket.slaResolutionDue,
      lastActivityAt: ticket.lastActivityAt ?? null,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      resolvedAt: ticket.resolvedAt,
      closedAt: ticket.closedAt,
      category: ticket.category
        ? {
            id: ticket.category.id,
            name: ticket.category.name
          }
        : null,
      caller: ticket.caller
        ? {
            id: ticket.caller.id,
            fullName: ticket.caller.fullName,
            email: ticket.caller.email,
            phone: ticket.caller.phone
          }
        : {
            id: 0,
            fullName: 'Unknown',
            email: null,
            phone: null
          },
      assignedAgent: ticket.assignedAgent
        ? {
            id: ticket.assignedAgent.id,
            fullName: ticket.assignedAgent.fullName,
            email: ticket.assignedAgent.email
          }
        : null,
      department: null,
      guestUser: null
    }));

    return NextResponse.json({ tickets: typedResult });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json<ApiErrorResponse>(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}

// POST /api/tickets - Create new ticket
export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json<ApiErrorResponse>(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();

    // Validate request body
    const validatedData: CreateTicketInput = createTicketSchema.parse(body);

    // Generate ticket number
    const year = new Date().getFullYear();
    const countResult = await db
      .select({ count: tickets.id })
      .from(tickets);
    const count = countResult.length || 0;
    const sequence = String(count + 1).padStart(4, '0');
    const ticketNumber = `INC-${year}-${sequence}`;

    // Find or create category
    let categoryId: number | null = null;
    if (validatedData.category) {
      const category = await db
        .select()
        .from(categories)
        .where(eq(categories.name, validatedData.category))
        .limit(1);
      if (category.length > 0) {
        categoryId = category[0].id;
      }
    }

    // Check if caller exists by employee ID or email
    let callerId: number;
    const existingCaller = await db
      .select()
      .from(callers)
      .where(
        validatedData.callerEmail
          ? eq(callers.email, validatedData.callerEmail)
          : eq(callers.fullName, validatedData.callerName)
      )
      .limit(1);

    if (existingCaller.length > 0) {
      callerId = existingCaller[0].id;
    } else {
      // Check if employee exists
      let employeeReferenceId: number | null = null;
      if (validatedData.callerEmployeeId) {
        const employee = await db
          .select()
          .from(employees)
          .where(eq(employees.employeeId, validatedData.callerEmployeeId))
          .limit(1);
        if (employee.length > 0) {
          employeeReferenceId = employee[0].id;
        }
      }

      // Create new caller
      const newCaller = await db
        .insert(callers)
        .values({
          fullName: validatedData.callerName,
          email: validatedData.callerEmail || null,
          phone: validatedData.callerPhone || null,
          employeeReferenceId,
          isGuest: !employeeReferenceId
        })
        .returning();
      callerId = newCaller[0].id;
    }

    // Calculate priority from impact and urgency
    const priority = calculatePriority(validatedData.impact, validatedData.urgency);

    // Calculate SLA due dates
    const createdAt = new Date();
    const slaDueDates = calculateSLADueDates(priority, createdAt);

    // Determine initial status and auto-assignment
    let assignedAgentId: number | null = null;
    let initialStatus: 'New' | 'Assigned' = 'New';

    // Auto-assign based on category if available
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
        createdBy: Number.parseInt(session.user.id, 10),
        slaFirstResponseDue: slaDueDates.firstResponseDue,
        slaResolutionDue: slaDueDates.resolutionDue
      })
      .returning();
    const newTicket = newTicketRows as any[];

    // Create initial call record
    await db.insert(calls).values({
      ticketId: newTicket[0].id,
      callerId,
      agentId: Number.parseInt(session.user.id, 10),
      callDirection: 'inbound' as const,
      notes: 'Initial ticket creation',
      duration: 0,
      callOutcome: 'follow_up' as const
    });

    // Send email notifications
    const createdTicket = newTicket[0];

    // Send email to ticket creator/submitter
    if (session.user.email) {
      await sendTicketCreatedEmail(
        session.user.email,
        createdTicket.ticketNumber,
        createdTicket.title,
        createdTicket.priority,
        createdTicket.id
      );
    }

    // Send email to assigned agent if ticket was auto-assigned
    if (assignedAgentId) {
      const agent = await db.query.users.findFirst({
        where: eq(users.id, assignedAgentId)
      });

      if (agent?.email) {
        await sendTicketAssignedEmail(
          agent.email,
          createdTicket.ticketNumber,
          createdTicket.title,
          createdTicket.priority,
          createdTicket.id,
          (session.user as any).fullName || 'System'
        );
      }
    }

    return NextResponse.json(newTicket[0], { status: 201 });
  } catch (error) {
    if (error instanceof Error && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json<ApiErrorResponse>(
        {
          error: 'Validation error',
          details: error
        },
        { status: 400 }
      );
    }

    console.error('Error creating ticket:', error);
    return NextResponse.json<ApiErrorResponse>(
      { error: 'Failed to create ticket' },
      { status: 500 }
    );
  }
}
