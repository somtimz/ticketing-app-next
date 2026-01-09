import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { tickets, auditLog } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { reassignTicketSchema, type ReassignTicketInput } from '@/lib/validators';
import type { ApiErrorResponse } from '@/types';

// PUT /api/tickets/[id]/assign - Reassign ticket to another agent
export async function PUT(
  req: NextRequest,
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

    // Get current assignment
    const currentTicket = await db
      .select({ assignedAgentId: tickets.assignedAgentId })
      .from(tickets)
      .where(eq(tickets.id, ticketId))
      .limit(1);

    if (currentTicket.length === 0) {
      return NextResponse.json<ApiErrorResponse>(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    const body = await req.json();

    // Validate request body
    const validatedData: ReassignTicketInput = reassignTicketSchema.parse(body);

    // Update ticket assignment
    await db
      .update(tickets)
      .set({
        assignedAgentId: validatedData.agentId,
        updatedAt: new Date()
      })
      .where(eq(tickets.id, ticketId));

    // Log audit trail
    await db.insert(auditLog).values({
      entityType: 'ticket',
      entityId: ticketId,
      action: 'reassigned',
      performedBy: Number.parseInt(session.user.id, 10),
      changes: JSON.stringify({
        from: currentTicket[0].assignedAgentId,
        to: validatedData.agentId,
        notes: validatedData.notes
      })
    });

    return NextResponse.json({
      success: true,
      assignedTo: validatedData.agentId
    });
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

    console.error('Error reassigning ticket:', error);
    return NextResponse.json<ApiErrorResponse>(
      { error: 'Failed to reassign ticket' },
      { status: 500 }
    );
  }
}
