import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { tickets, ticketStatusHistory } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { updateTicketStatusSchema, type UpdateTicketStatusInput } from '@/lib/validators';
import { adjustSLAForHoldTime, calcCurrentHoldMinutes } from '@/lib/sla';
import type { ApiErrorResponse } from '@/types';

// PUT /api/tickets/[id]/status - Update ticket status
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

    const body = await req.json();

    // Validate request body
    const validatedData: UpdateTicketStatusInput = updateTicketStatusSchema.parse(body);

    // Get current ticket (need SLA hold fields too)
    const currentTickets = await db
      .select({
        status: tickets.status,
        slaHeldAt: tickets.slaHeldAt,
        totalHoldMinutes: tickets.totalHoldMinutes,
        slaFirstResponseDue: tickets.slaFirstResponseDue,
        slaResolutionDue: tickets.slaResolutionDue
      })
      .from(tickets)
      .where(eq(tickets.id, ticketId))
      .limit(1);

    if (currentTickets.length === 0) {
      return NextResponse.json<ApiErrorResponse>(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    const currentTicket = currentTickets[0];
    const now = new Date();

    // --- SLA pause / resume logic ---
    const updatePayload: Record<string, unknown> = {
      status: validatedData.status,
      updatedAt: now,
      resolvedAt: validatedData.status === 'Resolved' ? now : null,
      closedAt: validatedData.status === 'Closed' ? now : null
    };

    if (validatedData.status === 'On Hold' && currentTicket.status !== 'On Hold') {
      // Entering On Hold: record when hold started
      updatePayload.slaHeldAt = now;
    } else if (validatedData.status !== 'On Hold' && currentTicket.status === 'On Hold') {
      // Leaving On Hold: accumulate hold duration and push SLA due dates forward
      const heldAt = currentTicket.slaHeldAt ? new Date(currentTicket.slaHeldAt) : now;
      const newHoldMinutes = calcCurrentHoldMinutes(heldAt, now);
      const accumulated = (currentTicket.totalHoldMinutes ?? 0) + newHoldMinutes;
      updatePayload.slaHeldAt = null;
      updatePayload.totalHoldMinutes = accumulated;

      if (currentTicket.slaFirstResponseDue) {
        updatePayload.slaFirstResponseDue = adjustSLAForHoldTime(
          new Date(currentTicket.slaFirstResponseDue),
          newHoldMinutes
        );
      }
      if (currentTicket.slaResolutionDue) {
        updatePayload.slaResolutionDue = adjustSLAForHoldTime(
          new Date(currentTicket.slaResolutionDue),
          newHoldMinutes
        );
      }
    }

    // Update ticket status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.update(tickets).set(updatePayload as any).where(eq(tickets.id, ticketId));

    // Log status change in history
    await db.insert(ticketStatusHistory).values({
      ticketId,
      fromStatus: currentTicket.status,
      toStatus: validatedData.status,
      changedBy: Number.parseInt(session.user.id, 10),
      notes: validatedData.notes || null
    });

    return NextResponse.json({
      success: true,
      status: validatedData.status
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

    console.error('Error updating ticket status:', error);
    return NextResponse.json<ApiErrorResponse>(
      { error: 'Failed to update ticket status' },
      { status: 500 }
    );
  }
}
