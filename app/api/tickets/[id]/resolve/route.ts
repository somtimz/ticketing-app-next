import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { tickets, ticketStatusHistory, callers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { resolveTicketSchema, type ResolveTicketInput } from '@/lib/validators';
import { sendTicketResolvedEmail } from '@/lib/email';
import type { ApiErrorResponse } from '@/types';

// POST /api/tickets/[id]/resolve - Resolve a ticket
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

    const body = await req.json();

    // Validate request body
    const validatedData: ResolveTicketInput = resolveTicketSchema.parse(body);

    // Get current ticket status
    const currentTicket = await db
      .select({ status: tickets.status, ticketNumber: tickets.ticketNumber, title: tickets.title, callerId: tickets.callerId, id: tickets.id })
      .from(tickets)
      .where(eq(tickets.id, ticketId))
      .limit(1);

    if (currentTicket.length === 0) {
      return NextResponse.json<ApiErrorResponse>(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Resolve ticket
    await db
      .update(tickets)
      .set({
        status: 'Resolved',
        resolution: validatedData.resolution,
        resolvedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(tickets.id, ticketId));

    // Log status change
    await db.insert(ticketStatusHistory).values({
      ticketId,
      fromStatus: currentTicket[0].status,
      toStatus: 'Resolved',
      changedBy: Number.parseInt(session.user.id, 10),
      notes: `Resolved: ${validatedData.resolution}`
    });

    // Handle trigger actions
    const triggerActions = validatedData.triggerActions || {};
    const triggeredActions: string[] = [];

    if (triggerActions.createProblemTicket) {
      triggeredActions.push('problem_ticket');
    }
    if (triggerActions.createDevPr) {
      triggeredActions.push('dev_pr');
    }
    if (triggerActions.updateKnowledgeArticle) {
      triggeredActions.push('knowledge_article');
    }

    // Fire-and-forget email to caller
    if (currentTicket[0].callerId) {
      const caller = await db
        .select({ email: callers.email })
        .from(callers)
        .where(eq(callers.id, currentTicket[0].callerId))
        .limit(1);
      if (caller[0]?.email) {
        void sendTicketResolvedEmail(
          caller[0].email,
          currentTicket[0].ticketNumber,
          currentTicket[0].title,
          validatedData.resolution,
          currentTicket[0].id
        );
      }
    }

    return NextResponse.json({
      success: true,
      resolvedAt: new Date(),
      triggeredActions
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

    console.error('Error resolving ticket:', error);
    return NextResponse.json<ApiErrorResponse>(
      { error: 'Failed to resolve ticket' },
      { status: 500 }
    );
  }
}
