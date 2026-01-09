import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { tickets, callers, categories, calls, users, ticketStatusHistory } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { updateTicketStatusSchema, type UpdateTicketStatusInput } from '@/lib/validators';
import { canModifyTicket } from '@/lib/rbac';
import { APIError, handleAPIError, requireAuth } from '@/lib/api-error';
import type { TicketWithRelations, CallWithCaller, ApiErrorResponse } from '@/types';

// GET /api/tickets/[id] - Get ticket details with call history
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session) {
    return NextResponse.json<ApiErrorResponse>(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const ticketId = Number.parseInt(id, 10);

    if (Number.isNaN(ticketId)) {
      return NextResponse.json<ApiErrorResponse>(
        { error: 'Invalid ticket ID' },
        { status: 400 }
      );
    }

    // Get ticket with relations
    const ticketResult = await db
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
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
        resolvedAt: tickets.resolvedAt,
        closedAt: tickets.closedAt,
        resolution: tickets.resolution,
        category: {
          id: categories.id,
          name: categories.name
        },
        caller: {
          id: callers.id,
          fullName: callers.fullName,
          email: callers.email,
          phone: callers.phone,
          isGuest: callers.isGuest
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
      .where(eq(tickets.id, ticketId))
      .limit(1);

    if (ticketResult.length === 0) {
      return NextResponse.json<ApiErrorResponse>(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    const ticket = ticketResult[0];

    // Get call history
    const callsResult = await db
      .select({
        id: calls.id,
        ticketId: calls.ticketId,
        callerId: calls.callerId,
        agentId: calls.agentId,
        callType: calls.callType,
        notes: calls.notes,
        durationSeconds: calls.durationSeconds,
        createdAt: calls.createdAt,
        caller: {
          id: callers.id,
          fullName: callers.fullName,
          email: callers.email
        },
        agent: {
          id: users.id,
          fullName: users.fullName,
          email: users.email
        }
      })
      .from(calls)
      .innerJoin(callers, eq(calls.callerId, callers.id))
      .innerJoin(users, eq(calls.agentId, users.id))
      .where(eq(calls.ticketId, ticketId))
      .orderBy(calls.createdAt);

    const typedCalls: CallWithCaller[] = callsResult.map(call => ({
      id: call.id,
      ticketId: call.ticketId,
      callerId: call.callerId,
      agentId: call.agentId,
      callType: call.callType,
      notes: call.notes,
      durationSeconds: call.durationSeconds,
      createdAt: call.createdAt,
      caller: {
        id: call.caller.id,
        fullName: call.caller.fullName,
        email: call.caller.email
      },
      agent: {
        id: call.agent.id,
        fullName: call.agent.fullName,
        email: call.agent.email
      }
    }));

    const typedTicket: TicketWithRelations = {
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
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      resolvedAt: ticket.resolvedAt,
      closedAt: ticket.closedAt,
      resolution: ticket.resolution,
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
      calls: typedCalls
    };

    return NextResponse.json(typedTicket);
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json<ApiErrorResponse>(
      { error: 'Failed to fetch ticket' },
      { status: 500 }
    );
  }
}

// Valid status transitions
// Note: Pending status is not yet in the database schema but included for future use
const VALID_TRANSITIONS: Record<string, string[]> = {
  'Open': ['In Progress'],
  'In Progress': ['Resolved'], // Pending will be added when schema is updated
  'Resolved': ['Open', 'Closed'],
  'Closed': ['Open']
};

// PATCH /api/tickets/[id] - Update ticket status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireAuth(session);

    // After requireAuth, session is guaranteed to be non-null
    const authenticatedSession = session!;

    const { id } = await params;
    const ticketId = Number.parseInt(id, 10);

    if (Number.isNaN(ticketId)) {
      throw new APIError(400, 'invalid_ticket_id', 'Invalid ticket ID');
    }

    const body = await req.json();

    // Validate request body
    const validatedData: UpdateTicketStatusInput = updateTicketStatusSchema.parse(body);

    // Get current ticket
    const currentTicketResult = await db
      .select({
        id: tickets.id,
        status: tickets.status,
        callerId: tickets.callerId,
        assignedAgentId: tickets.assignedAgentId
      })
      .from(tickets)
      .where(eq(tickets.id, ticketId))
      .limit(1);

    if (currentTicketResult.length === 0) {
      throw new APIError(404, 'ticket_not_found', 'Ticket not found');
    }

    const currentTicket = currentTicketResult[0];
    const currentStatus = currentTicket.status;
    const newStatus = validatedData.status;

    // Validate status transition
    if (currentStatus !== newStatus) {
      const allowedTransitions = VALID_TRANSITIONS[currentStatus];
      if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
        throw new APIError(
          400,
          'invalid_status_transition',
          `Cannot transition from ${currentStatus} to ${newStatus}. Valid transitions: ${allowedTransitions.join(', ')}`
        );
      }
    }

    // Check permissions - user can modify ticket if:
    // - Employee can only update their own tickets
    // - Agents can update assigned tickets
    // - TeamLeads can update any ticket
    // - Admins can update any ticket
    const hasPermission = canModifyTicket(
      authenticatedSession,
      currentTicket.callerId,
      currentTicket.assignedAgentId
    );

    if (!hasPermission) {
      throw new APIError(
        403,
        'forbidden',
        'You do not have permission to update this ticket'
      );
    }

    // Prepare update data with timestamp handling
    const updateData: any = {
      status: newStatus,
      updatedAt: new Date()
    };

    // Set resolvedAt when status -> Resolved
    if (newStatus === 'Resolved' && currentStatus !== 'Resolved') {
      updateData.resolvedAt = new Date();
    } else if (newStatus !== 'Resolved' && currentStatus === 'Resolved') {
      // Clear resolvedAt if reopened
      updateData.resolvedAt = null;
    }

    // Set closedAt when status -> Closed
    if (newStatus === 'Closed' && currentStatus !== 'Closed') {
      updateData.closedAt = new Date();
    } else if (newStatus !== 'Closed' && currentStatus === 'Closed') {
      // Clear closedAt if reopened
      updateData.closedAt = null;
    }

    // Update ticket status
    await db
      .update(tickets)
      .set(updateData)
      .where(eq(tickets.id, ticketId));

    // Log status change in history
    await db.insert(ticketStatusHistory).values({
      ticketId,
      fromStatus: currentStatus,
      toStatus: newStatus,
      changedBy: Number.parseInt(authenticatedSession.user.id, 10),
      notes: validatedData.notes || null
    });

    return NextResponse.json({
      success: true,
      ticketId,
      previousStatus: currentStatus,
      newStatus,
      resolvedAt: updateData.resolvedAt,
      closedAt: updateData.closedAt
    });
  } catch (error) {
    return handleAPIError(error);
  }
}
