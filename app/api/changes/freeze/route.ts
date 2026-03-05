import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { changeFreeze, users } from '@/lib/db/schema';
import { eq, asc, gte, lte, or, and } from 'drizzle-orm';
import { requireRole, handleAPIError, APIError } from '@/lib/api-error';

// GET /api/changes/freeze — list all freeze windows (Agent+)
export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    requireRole(session, 'Agent');

    const rows = await db
      .select({
        id: changeFreeze.id,
        name: changeFreeze.name,
        startDate: changeFreeze.startDate,
        endDate: changeFreeze.endDate,
        reason: changeFreeze.reason,
        createdAt: changeFreeze.createdAt,
        createdBy: {
          id: users.id,
          fullName: users.fullName,
        },
      })
      .from(changeFreeze)
      .leftJoin(users, eq(changeFreeze.createdById, users.id))
      .orderBy(asc(changeFreeze.startDate));

    // Flag which windows are currently active
    const now = new Date();
    const freezeWindows = rows.map(r => ({
      ...r,
      isActive: new Date(r.startDate) <= now && new Date(r.endDate) >= now,
    }));

    return NextResponse.json({ freezeWindows });
  } catch (err) {
    return handleAPIError(err);
  }
}

// POST /api/changes/freeze — create a freeze window (Admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    requireRole(session, 'Admin');

    const userId = (session as any)?.user?.id;
    if (!userId) throw new APIError(401, 'unauthorized', 'Not authenticated');

    const body = await req.json() as {
      name?: string;
      startDate?: string;
      endDate?: string;
      reason?: string;
    };

    const name = body.name?.trim();
    const reason = body.reason?.trim() || null;

    if (!name) throw new APIError(400, 'bad_request', 'name is required');
    if (!body.startDate) throw new APIError(400, 'bad_request', 'startDate is required');
    if (!body.endDate) throw new APIError(400, 'bad_request', 'endDate is required');

    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);

    if (isNaN(startDate.getTime())) throw new APIError(400, 'bad_request', 'Invalid startDate');
    if (isNaN(endDate.getTime())) throw new APIError(400, 'bad_request', 'Invalid endDate');
    if (endDate <= startDate) throw new APIError(400, 'bad_request', 'endDate must be after startDate');

    const [created] = await db
      .insert(changeFreeze)
      .values({
        name,
        startDate,
        endDate,
        reason,
        createdById: parseInt(userId, 10),
      })
      .returning();

    return NextResponse.json({ freezeWindow: created }, { status: 201 });
  } catch (err) {
    return handleAPIError(err);
  }
}
