import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { tickets, calls } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { addCallSchema, type AddCallInput } from '@/lib/validators';
import type { ApiErrorResponse } from '@/types';

// POST /api/tickets/[id]/calls - Add follow-up call to ticket
export async function POST(
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

    // Verify ticket exists and get caller ID
    const ticket = await db
      .select({ callerId: tickets.callerId })
      .from(tickets)
      .where(eq(tickets.id, ticketId))
      .limit(1);

    if (ticket.length === 0) {
      return NextResponse.json<ApiErrorResponse>(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    const body = await req.json();

    // Validate request body
    const validatedData: AddCallInput = addCallSchema.parse(body);

    // Add call record
    const newCall = await db
      .insert(calls)
      .values({
        ticketId,
        callerId: ticket[0].callerId,
        agentId: Number.parseInt(session.user.id, 10),
        callDirection: (validatedData.callType === 'email' ? 'inbound' : validatedData.callType) as 'inbound' | 'outbound',
        notes: validatedData.notes ?? '',
        duration: validatedData.durationSeconds ?? 0,
        callOutcome: 'follow_up' as const
      })
      .returning();

    return NextResponse.json(newCall[0], { status: 201 });
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

    console.error('Error adding call:', error);
    return NextResponse.json<ApiErrorResponse>(
      { error: 'Failed to add call' },
      { status: 500 }
    );
  }
}
