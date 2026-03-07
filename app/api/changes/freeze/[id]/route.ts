import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { changeFreeze } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireRole, handleAPIError, APIError } from '@/lib/api-error';

// PATCH /api/changes/freeze/[id] — update a freeze window (Admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireRole(session, 'Admin');

    const { id } = await params;
    const freezeId = parseInt(id, 10);
    if (isNaN(freezeId)) throw new APIError(400, 'bad_request', 'Invalid ID');

    const [existing] = await db
      .select()
      .from(changeFreeze)
      .where(eq(changeFreeze.id, freezeId))
      .limit(1);
    if (!existing) throw new APIError(404, 'not_found', 'Freeze window not found');

    const body = await req.json() as {
      name?: string;
      startDate?: string;
      endDate?: string;
      reason?: string;
    };

    const updates: Partial<typeof existing> = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.reason !== undefined) updates.reason = body.reason.trim() || null;
    if (body.startDate !== undefined) {
      const d = new Date(body.startDate);
      if (isNaN(d.getTime())) throw new APIError(400, 'bad_request', 'Invalid startDate');
      updates.startDate = d;
    }
    if (body.endDate !== undefined) {
      const d = new Date(body.endDate);
      if (isNaN(d.getTime())) throw new APIError(400, 'bad_request', 'Invalid endDate');
      updates.endDate = d;
    }

    const start = updates.startDate ?? existing.startDate;
    const end = updates.endDate ?? existing.endDate;
    if (end <= start) throw new APIError(400, 'bad_request', 'endDate must be after startDate');

    const [updated] = await db
      .update(changeFreeze)
      .set(updates)
      .where(eq(changeFreeze.id, freezeId))
      .returning();

    return NextResponse.json({ freezeWindow: updated });
  } catch (err) {
    return handleAPIError(err);
  }
}

// DELETE /api/changes/freeze/[id] — delete a freeze window (Admin only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireRole(session, 'Admin');

    const { id } = await params;
    const freezeId = parseInt(id, 10);
    if (isNaN(freezeId)) throw new APIError(400, 'bad_request', 'Invalid ID');

    const [existing] = await db
      .select({ id: changeFreeze.id })
      .from(changeFreeze)
      .where(eq(changeFreeze.id, freezeId))
      .limit(1);
    if (!existing) throw new APIError(404, 'not_found', 'Freeze window not found');

    await db.delete(changeFreeze).where(eq(changeFreeze.id, freezeId));

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleAPIError(err);
  }
}
