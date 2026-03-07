import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { problems, problemIncidents, knownErrors, tickets, users } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { requireRole, handleAPIError, APIError } from '@/lib/api-error';

async function getProblem(id: number) {
  const [row] = await db
    .select()
    .from(problems)
    .where(eq(problems.id, id))
    .limit(1);
  return row ?? null;
}

// GET /api/problems/[id] — full problem detail (Agent+)
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

    const problem = await getProblem(problemId);
    if (!problem) throw new APIError(404, 'not_found', 'Problem not found');

    // Assigned agent
    let assignedAgent = null;
    if (problem.assignedAgentId) {
      const [agent] = await db
        .select({ id: users.id, fullName: users.fullName, email: users.email })
        .from(users)
        .where(eq(users.id, problem.assignedAgentId))
        .limit(1);
      assignedAgent = agent ?? null;
    }

    // Created by user
    const [createdBy] = await db
      .select({ id: users.id, fullName: users.fullName, email: users.email })
      .from(users)
      .where(eq(users.id, problem.createdById))
      .limit(1);

    // Linked incidents (join to tickets)
    const linkedIncidents = await db
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

    // Known errors
    const errors = await db
      .select()
      .from(knownErrors)
      .where(eq(knownErrors.problemId, problemId))
      .orderBy(asc(knownErrors.createdAt));

    return NextResponse.json({
      problem: { ...problem, assignedAgent, createdBy },
      linkedIncidents,
      knownErrors: errors
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

// PATCH /api/problems/[id] — update problem (TeamLead+)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireRole(session, 'TeamLead');

    const { id } = await params;
    const problemId = parseInt(id, 10);
    if (isNaN(problemId)) throw new APIError(400, 'bad_request', 'Invalid ID');

    const problem = await getProblem(problemId);
    if (!problem) throw new APIError(404, 'not_found', 'Problem not found');

    const body = await req.json() as {
      title?: string;
      description?: string;
      priority?: string;
      assignedAgentId?: number | null;
      rootCause?: string | null;
      workaround?: string | null;
      status?: string;
    };

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (body.title !== undefined) updates.title = body.title.trim();
    if (body.description !== undefined) updates.description = body.description.trim();
    if (body.priority !== undefined) updates.priority = body.priority;
    if ('assignedAgentId' in body) updates.assignedAgentId = body.assignedAgentId ?? null;
    if ('rootCause' in body) updates.rootCause = body.rootCause ?? null;
    if ('workaround' in body) updates.workaround = body.workaround ?? null;

    if (body.status !== undefined) {
      updates.status = body.status;
      if (body.status === 'Resolved') {
        updates.resolvedAt = new Date();
      } else if (body.status === 'Closed') {
        updates.closedAt = new Date();
      }
    }

    const [updated] = await db
      .update(problems)
      .set(updates as any)
      .where(eq(problems.id, problemId))
      .returning();

    return NextResponse.json({ problem: updated });
  } catch (error) {
    return handleAPIError(error);
  }
}
