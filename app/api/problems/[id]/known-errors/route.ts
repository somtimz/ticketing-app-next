import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { knownErrors, problems, knowledgeBaseArticles } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { requireRole, handleAPIError, APIError } from '@/lib/api-error';

// GET /api/problems/[id]/known-errors — list known errors for a problem (Agent+)
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

    // Verify problem exists
    const [problem] = await db.select({ id: problems.id }).from(problems).where(eq(problems.id, problemId)).limit(1);
    if (!problem) throw new APIError(404, 'not_found', 'Problem not found');

    const rows = await db
      .select({
        id: knownErrors.id,
        title: knownErrors.title,
        workaroundDescription: knownErrors.workaroundDescription,
        isActive: knownErrors.isActive,
        createdAt: knownErrors.createdAt,
        updatedAt: knownErrors.updatedAt,
        linkedArticleId: knownErrors.linkedArticleId,
        articleTitle: knowledgeBaseArticles.title,
      })
      .from(knownErrors)
      .leftJoin(knowledgeBaseArticles, eq(knownErrors.linkedArticleId, knowledgeBaseArticles.id))
      .where(eq(knownErrors.problemId, problemId))
      .orderBy(asc(knownErrors.createdAt));

    return NextResponse.json({ knownErrors: rows });
  } catch (err) {
    return handleAPIError(err);
  }
}

// POST /api/problems/[id]/known-errors — create a known error (Agent+)
export async function POST(
  req: NextRequest,
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

    const body = await req.json() as {
      title?: string;
      workaroundDescription?: string;
      linkedArticleId?: number | null;
      isActive?: boolean;
    };

    const title = body.title?.trim();
    const workaroundDescription = body.workaroundDescription?.trim();

    if (!title) throw new APIError(400, 'bad_request', 'title is required');
    if (!workaroundDescription) throw new APIError(400, 'bad_request', 'workaroundDescription is required');

    const [created] = await db
      .insert(knownErrors)
      .values({
        problemId,
        title,
        workaroundDescription,
        linkedArticleId: body.linkedArticleId ?? null,
        isActive: body.isActive ?? true,
      })
      .returning();

    return NextResponse.json({ knownError: created }, { status: 201 });
  } catch (err) {
    return handleAPIError(err);
  }
}
