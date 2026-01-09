import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { tickets, callers, categories, calls, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
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
        priority: tickets.priority,
        status: tickets.status,
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
      priority: ticket.priority,
      status: ticket.status,
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
