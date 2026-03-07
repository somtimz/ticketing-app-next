import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { problems, problemIncidents, tickets } from '@/lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { requireRole, handleAPIError, APIError } from '@/lib/api-error';

// GET /api/problems/[id]/incidents — list linked tickets (Agent+)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireRole(session, 'Agent');

    const { id } = await params;
    const problemId = parseInt(id, 10);
    if (isNaN(problemId)) throw new APIError(400, 'bad_request', 'Invalid ID');

    const [problem] = await db.select({ id: problems.id }).from(problems).where(eq(problems.id, problemId)).limit(1);
    if (!problem) throw new APIError(404, 'not_found', 'Problem not found');

    const rows = await db
      .select({
        linkId: problemIncidents.id,
        linkedAt: problemIncidents.linkedAt,
        ticket: {
          id: tickets.id,
          ticketNumber: tickets.ticketNumber,
          title: tickets.title,
          status: tickets.status,
          priority: tickets.priority,
          createdAt: tickets.createdAt
        }
      })
      .from(problemIncidents)
      .innerJoin(tickets, eq(problemIncidents.ticketId, tickets.id))
      .where(eq(problemIncidents.problemId, problemId))
      .orderBy(asc(problemIncidents.linkedAt));

    return NextResponse.json({ incidents: rows });
  } catch (error) {
    return handleAPIError(error);
  }
}

// POST /api/problems/[id]/incidents — link a ticket (TeamLead+)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireRole(session, 'TeamLead');

    const { id } = await params;
    const problemId = parseInt(id, 10);
    if (isNaN(problemId)) throw new APIError(400, 'bad_request', 'Invalid ID');

    const [problem] = await db.select({ id: problems.id }).from(problems).where(eq(problems.id, problemId)).limit(1);
    if (!problem) throw new APIError(404, 'not_found', 'Problem not found');

    const body = await req.json() as { ticketId: number };
    if (!Number.isInteger(body.ticketId) || body.ticketId <= 0) {
      throw new APIError(400, 'bad_request', 'ticketId must be a positive integer');
    }

    // Check ticket exists
    const [ticket] = await db.select({ id: tickets.id }).from(tickets).where(eq(tickets.id, body.ticketId)).limit(1);
    if (!ticket) throw new APIError(404, 'not_found', 'Ticket not found');

    // Check not already linked
    const [existing] = await db
      .select({ id: problemIncidents.id })
      .from(problemIncidents)
      .where(and(eq(problemIncidents.problemId, problemId), eq(problemIncidents.ticketId, body.ticketId)))
      .limit(1);
    if (existing) throw new APIError(409, 'conflict', 'Ticket is already linked to this problem');

    const [link] = await db
      .insert(problemIncidents)
      .values({ problemId, ticketId: body.ticketId })
      .returning();

    return NextResponse.json({ link }, { status: 201 });
  } catch (error) {
    return handleAPIError(error);
  }
}

// DELETE /api/problems/[id]/incidents — unlink a ticket (TeamLead+)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireRole(session, 'TeamLead');

    const { id } = await params;
    const problemId = parseInt(id, 10);
    if (isNaN(problemId)) throw new APIError(400, 'bad_request', 'Invalid ID');

    const body = await req.json() as { ticketId: number };
    if (!Number.isInteger(body.ticketId) || body.ticketId <= 0) {
      throw new APIError(400, 'bad_request', 'ticketId must be a positive integer');
    }

    await db
      .delete(problemIncidents)
      .where(and(eq(problemIncidents.problemId, problemId), eq(problemIncidents.ticketId, body.ticketId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAPIError(error);
  }
}
