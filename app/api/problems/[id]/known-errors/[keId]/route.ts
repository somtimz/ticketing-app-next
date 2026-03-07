import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { knownErrors } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireRole, handleAPIError, APIError } from '@/lib/api-error';

// PATCH /api/problems/[id]/known-errors/[keId] — update a known error (Agent+)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; keId: string }> }
) {
  try {
    const session = await auth();
    requireRole(session, 'Agent');

    const { id, keId } = await params;
    const problemId = parseInt(id, 10);
    const knownErrorId = parseInt(keId, 10);
    if (isNaN(problemId) || isNaN(knownErrorId)) throw new APIError(400, 'bad_request', 'Invalid ID');

    const [existing] = await db
      .select()
      .from(knownErrors)
      .where(and(eq(knownErrors.id, knownErrorId), eq(knownErrors.problemId, problemId)))
      .limit(1);
    if (!existing) throw new APIError(404, 'not_found', 'Known error not found');

    const body = await req.json() as {
      title?: string;
      workaroundDescription?: string;
      linkedArticleId?: number | null;
      isActive?: boolean;
    };

    const updates: Partial<typeof existing> = { updatedAt: new Date() };
    if (body.title !== undefined) updates.title = body.title.trim();
    if (body.workaroundDescription !== undefined) updates.workaroundDescription = body.workaroundDescription.trim();
    if (body.linkedArticleId !== undefined) updates.linkedArticleId = body.linkedArticleId;
    if (body.isActive !== undefined) updates.isActive = body.isActive;

    const [updated] = await db
      .update(knownErrors)
      .set(updates)
      .where(eq(knownErrors.id, knownErrorId))
      .returning();

    return NextResponse.json({ knownError: updated });
  } catch (err) {
    return handleAPIError(err);
  }
}

// DELETE /api/problems/[id]/known-errors/[keId] — delete a known error (TeamLead+)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; keId: string }> }
) {
  try {
    const session = await auth();
    requireRole(session, 'TeamLead');

    const { id, keId } = await params;
    const problemId = parseInt(id, 10);
    const knownErrorId = parseInt(keId, 10);
    if (isNaN(problemId) || isNaN(knownErrorId)) throw new APIError(400, 'bad_request', 'Invalid ID');

    const [existing] = await db
      .select({ id: knownErrors.id })
      .from(knownErrors)
      .where(and(eq(knownErrors.id, knownErrorId), eq(knownErrors.problemId, problemId)))
      .limit(1);
    if (!existing) throw new APIError(404, 'not_found', 'Known error not found');

    await db.delete(knownErrors).where(eq(knownErrors.id, knownErrorId));

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleAPIError(err);
  }
}
