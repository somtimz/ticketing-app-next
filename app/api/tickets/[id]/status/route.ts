import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { tickets, ticketStatusHistory, users, ticketSatisfactionSurveys } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { updateTicketStatusSchema, type UpdateTicketStatusInput } from '@/lib/validators';
import { sendTicketStatusUpdateEmail, sendSatisfactionSurveyEmail } from '@/lib/email';
import { parseNotificationPreferences } from '@/app/api/users/me/preferences/route';
import type { ApiErrorResponse } from '@/types';
import { randomUUID } from 'crypto';

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

    // Notify ticket submitter using granular preferences
    const fullTicket = await db.query.tickets.findFirst({ where: eq(tickets.id, ticketId) }) as any;
    if (fullTicket?.createdBy) {
      const submitter = await db.query.users.findFirst({ where: eq(users.id, fullTicket.createdBy) }) as any;
      if (submitter?.email) {
        const prefs = parseNotificationPreferences(
          submitter.notificationPreferences,
          submitter.emailNotificationsEnabled
        );

        if (prefs.statusChange) {
          void sendTicketStatusUpdateEmail(
            submitter.email,
            fullTicket.ticketNumber,
            fullTicket.title,
            currentTicket[0].status,
            validatedData.status,
            validatedData.notes || null,
            ticketId
          );
        }

        // When ticket is closed, create a satisfaction survey and email it
        if (validatedData.status === 'Closed') {
          const token = randomUUID();
          await db.insert(ticketSatisfactionSurveys).values({
            ticketId,
            token
          });
          void sendSatisfactionSurveyEmail(
            submitter.email,
            fullTicket.ticketNumber,
            fullTicket.title,
            token
          );
        }
      }
    }

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
