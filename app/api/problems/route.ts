import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { problems, problemIncidents, users } from '@/lib/db/schema';
import { eq, desc, ilike, and, or, sql } from 'drizzle-orm';
import { requireRole, handleAPIError, APIError } from '@/lib/api-error';

// GET /api/problems — list problems (Agent+)
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    requireRole(session, 'Agent');

    const { searchParams } = req.nextUrl;
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const q = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') ?? '20', 10);
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];
    if (status) conditions.push(eq(problems.status, status as any));
    if (priority) conditions.push(eq(problems.priority, priority as any));
    if (q) {
      conditions.push(
        or(
          ilike(problems.title, `%${q}%`),
          ilike(problems.description, `%${q}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : sql`1=1`;

    // Alias for assigned agent join
    const assignedAgent = {
      id: users.id,
      fullName: users.fullName,
      email: users.email
    };

    const rows = await db
      .select({
        id: problems.id,
        problemNumber: problems.problemNumber,
        title: problems.title,
        status: problems.status,
        priority: problems.priority,
        rootCause: problems.rootCause,
        workaround: problems.workaround,
        resolvedAt: problems.resolvedAt,
        closedAt: problems.closedAt,
        createdAt: problems.createdAt,
        updatedAt: problems.updatedAt,
        assignedAgentId: problems.assignedAgentId,
        createdById: problems.createdById,
        assignedAgent: assignedAgent
      })
      .from(problems)
      .leftJoin(users, eq(problems.assignedAgentId, users.id))
      .where(whereClause)
      .orderBy(desc(problems.createdAt))
      .limit(limit)
      .offset(offset);

    // Get incident counts per problem
    const incidentCounts = await db
      .select({
        problemId: problemIncidents.problemId,
        count: sql<number>`count(*)::int`
      })
      .from(problemIncidents)
      .groupBy(problemIncidents.problemId);

    const countMap = new Map(incidentCounts.map(r => [r.problemId, r.count]));

    const result = rows.map(row => ({
      ...row,
      linkedIncidentCount: countMap.get(row.id) ?? 0
    }));

    return NextResponse.json({ problems: result });
  } catch (error) {
    return handleAPIError(error);
  }
}

// POST /api/problems — create problem (TeamLead+)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    requireRole(session, 'TeamLead');

    const body = await req.json() as {
      title: string;
      description: string;
      priority?: string;
      assignedAgentId?: number | null;
    };

    if (!body.title?.trim()) throw new APIError(400, 'bad_request', 'Title is required');
    if (!body.description?.trim()) throw new APIError(400, 'bad_request', 'Description is required');

    // Generate problem number PRB-XXXX
    const countResult = await db.select({ id: problems.id }).from(problems);
    const sequence = String(countResult.length + 1).padStart(4, '0');
    const problemNumber = `PRB-${sequence}`;

    const [created] = await db
      .insert(problems)
      .values({
        problemNumber,
        title: body.title.trim(),
        description: body.description.trim(),
        priority: (body.priority as any) ?? 'P3',
        assignedAgentId: body.assignedAgentId ?? null,
        createdById: parseInt(session!.user.id, 10),
        status: 'New'
      })
      .returning();

    return NextResponse.json({ problem: created }, { status: 201 });
  } catch (error) {
    return handleAPIError(error);
  }
}
