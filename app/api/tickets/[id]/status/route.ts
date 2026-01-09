import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { tickets, ticketStatusHistory } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { updateTicketStatusSchema, type UpdateTicketStatusInput } from '@/lib/validators';
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

    // Get current ticket status
    const currentTicket = await db
      .select({ status: tickets.status })
      .from(tickets)
      .where(eq(tickets.id, ticketId))
      .limit(1);

    if (currentTicket.length === 0) {
      return NextResponse.json<ApiErrorResponse>(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Update ticket status
    await db
      .update(tickets)
      .set({
        status: validatedData.status,
        updatedAt: new Date(),
        resolvedAt: validatedData.status === 'Resolved' ? new Date() : null,
        closedAt: validatedData.status === 'Closed' ? new Date() : null
      })
      .where(eq(tickets.id, ticketId));

    // Log status change in history
    await db.insert(ticketStatusHistory).values({
      ticketId,
      fromStatus: currentTicket[0].status,
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
