import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { changes, users } from '@/lib/db/schema';
import { eq, desc, ilike, and, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { requireRole, APIError, handleAPIError } from '@/lib/api-error';

const creator = alias(users, 'creator');
const assignee = alias(users, 'assignee');

// GET /api/changes
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    requireRole(session, 'Agent');

    const sp = req.nextUrl.searchParams;
    const status = sp.get('status');
    const changeType = sp.get('changeType');
    const q = sp.get('q');
    const limit = Math.min(parseInt(sp.get('limit') ?? '20', 10), 100);
    const page = Math.max(parseInt(sp.get('page') ?? '1', 10), 1);
    const offset = (page - 1) * limit;

    const conditions = and(
      status ? eq(changes.status, status as typeof changes.status._.data) : undefined,
      changeType ? eq(changes.changeType, changeType as typeof changes.changeType._.data) : undefined,
      q ? or(
        ilike(changes.title, `%${q}%`),
        ilike(changes.changeNumber, `%${q}%`)
      ) : undefined
    );

    const rows = await db
      .select({
        id: changes.id,
        changeNumber: changes.changeNumber,
        title: changes.title,
        changeType: changes.changeType,
        status: changes.status,
        riskLevel: changes.riskLevel,
        impactLevel: changes.impactLevel,
        scheduledStart: changes.scheduledStart,
        scheduledEnd: changes.scheduledEnd,
        createdAt: changes.createdAt,
        updatedAt: changes.updatedAt,
        createdById: changes.createdById,
        assignedAgentId: changes.assignedAgentId,
        creatorName: creator.fullName,
        assigneeName: assignee.fullName,
      })
      .from(changes)
      .leftJoin(creator, eq(changes.createdById, creator.id))
      .leftJoin(assignee, eq(changes.assignedAgentId, assignee.id))
      .where(conditions)
      .orderBy(desc(changes.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(changes)
      .where(conditions);

    return NextResponse.json({ changes: rows, total: Number(count), page, limit });
  } catch (error) {
    return handleAPIError(error);
  }
}

// POST /api/changes
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    requireRole(session, 'Agent');
    const userId = parseInt(session!.user.id, 10);

    const body = await req.json() as {
      title: string;
      description: string;
      changeType?: string;
      riskLevel?: string;
      impactLevel?: string;
      implementationPlan?: string;
      backoutPlan?: string;
      scheduledStart?: string;
      scheduledEnd?: string;
    };

    if (!body.title?.trim()) throw new APIError(400, 'bad_request', 'title is required');
    if (!body.description?.trim()) throw new APIError(400, 'bad_request', 'description is required');

    // Generate CHG number safely
    const [{ maxNum }] = await db
      .select({ maxNum: sql<number>`coalesce(max(cast(substring(change_number from 5) as integer)), 0)` })
      .from(changes);
    const sequence = String(Number(maxNum) + 1).padStart(4, '0');
    const changeNumber = `CHG-${sequence}`;

    const [change] = await db
      .insert(changes)
      .values({
        changeNumber,
        title: body.title.trim(),
        description: body.description.trim(),
        changeType: (body.changeType as 'Standard' | 'Normal' | 'Emergency') ?? 'Normal',
        riskLevel: (body.riskLevel as 'Low' | 'Medium' | 'High' | 'Critical') ?? 'Medium',
        impactLevel: (body.impactLevel as 'Low' | 'Medium' | 'High') ?? 'Medium',
        implementationPlan: body.implementationPlan?.trim() ?? null,
        backoutPlan: body.backoutPlan?.trim() ?? null,
        scheduledStart: body.scheduledStart ? new Date(body.scheduledStart) : null,
        scheduledEnd: body.scheduledEnd ? new Date(body.scheduledEnd) : null,
        createdById: userId,
        status: 'Draft',
      })
      .returning();

    return NextResponse.json({ change }, { status: 201 });
  } catch (error) {
    return handleAPIError(error);
  }
}
