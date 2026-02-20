import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { comments, tickets, users, callers } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { requireAuth, handleAPIError } from '@/lib/api-error';
import { hasRole } from '@/lib/rbac';
import { sendTicketCommentEmail } from '@/lib/email';

const addCommentSchema = z.object({
  body: z.string().min(1).max(5000),
  isInternal: z.boolean().default(false)
});

// GET /api/tickets/[id]/comments
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireAuth(session);

    const { id } = await params;
    const ticketId = Number.parseInt(id, 10);

    if (Number.isNaN(ticketId)) {
      return NextResponse.json({ error: 'Invalid ticket ID' }, { status: 400 });
    }

    const isAgent = hasRole(session, 'Agent');

    const rows = await db
      .select({
        id: comments.id,
        body: comments.body,
        isInternal: comments.isInternal,
        createdAt: comments.createdAt,
        author: {
          id: users.id,
          fullName: users.fullName,
          role: users.role
        }
      })
      .from(comments)
      .innerJoin(users, eq(comments.authorId, users.id))
      .where(
        isAgent
          ? eq(comments.ticketId, ticketId)
          : // Employees only see non-internal comments
            eq(comments.ticketId, ticketId)
      )
      .orderBy(asc(comments.createdAt));

    // Filter out internal notes for non-agents
    const filtered = isAgent ? rows : rows.filter(c => !c.isInternal);

    return NextResponse.json({ comments: filtered });
  } catch (error) {
    return handleAPIError(error);
  }
}

// POST /api/tickets/[id]/comments
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireAuth(session);

    const { id } = await params;
    const ticketId = Number.parseInt(id, 10);

    if (Number.isNaN(ticketId)) {
      return NextResponse.json({ error: 'Invalid ticket ID' }, { status: 400 });
    }

    // Verify ticket exists
    const ticket = await db.query.tickets.findFirst({
      where: eq(tickets.id, ticketId),
      columns: { id: true }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const body = await req.json();
    const validated = addCommentSchema.parse(body);

    // Only agents+ can post internal notes
    const isInternal = validated.isInternal && hasRole(session, 'Agent');

    const [comment] = await db
      .insert(comments)
      .values({
        ticketId,
        body: validated.body,
        authorId: Number.parseInt(session!.user.id, 10),
        isInternal
      })
      .returning();

    // Update ticket lastActivityAt
    await db
      .update(tickets)
      .set({ lastActivityAt: new Date(), updatedAt: new Date() })
      .where(eq(tickets.id, ticketId));

    // Send email notification for non-internal comments
    if (!isInternal) {
      const fullTicket = await db.query.tickets.findFirst({
        where: eq(tickets.id, ticketId)
      }) as any;

      if (fullTicket) {
        const commenterName = session!.user.name || 'Support Agent';

        // Notify assigned agent if commenter is not the agent
        if (fullTicket.assignedAgentId && String(fullTicket.assignedAgentId) !== session!.user.id) {
          const agent = await db.query.users.findFirst({
            where: eq(users.id, fullTicket.assignedAgentId)
          });
          if (agent?.email) {
            void sendTicketCommentEmail(agent.email, fullTicket.ticketNumber, fullTicket.title, commenterName, validated.body, ticketId);
          }
        }

        // Notify caller if they have an email and are not the commenter
        if (fullTicket.callerId) {
          const caller = await db.select({ email: callers.email }).from(callers).where(eq(callers.id, fullTicket.callerId)).limit(1);
          const callerEmail = caller[0]?.email;
          if (callerEmail) {
            void sendTicketCommentEmail(callerEmail, fullTicket.ticketNumber, fullTicket.title, commenterName, validated.body, ticketId);
          }
        }
      }
    }

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    return handleAPIError(error);
  }
}
