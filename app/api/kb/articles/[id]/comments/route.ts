import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { knowledgeBaseArticles, kbComments, users } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { requireRole, handleAPIError, APIError } from '@/lib/api-error';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const createCommentSchema = z.object({
  content: z.string().min(1, 'Content is required').max(5000, 'Comment is too long')
});

// GET /api/kb/articles/[id]/comments - List comments (Agent+ only, paginated)
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    requireRole(session, 'Agent');

    const { id } = await params;
    const articleId = parseInt(id);
    if (isNaN(articleId)) throw new APIError(400, 'invalid_id', 'Invalid article ID');

    // Verify article exists
    const [article] = await db
      .select({ id: knowledgeBaseArticles.id })
      .from(knowledgeBaseArticles)
      .where(eq(knowledgeBaseArticles.id, articleId));

    if (!article) throw new APIError(404, 'not_found', 'Article not found');

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const offset = (page - 1) * limit;

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(kbComments)
      .where(eq(kbComments.articleId, articleId));

    const comments = await db
      .select({
        id: kbComments.id,
        articleId: kbComments.articleId,
        authorId: kbComments.authorId,
        authorName: users.fullName,
        content: kbComments.content,
        createdAt: kbComments.createdAt,
        updatedAt: kbComments.updatedAt
      })
      .from(kbComments)
      .leftJoin(users, eq(kbComments.authorId, users.id))
      .where(eq(kbComments.articleId, articleId))
      .orderBy(desc(kbComments.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      comments,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

// POST /api/kb/articles/[id]/comments - Create a comment (Agent+ only)
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    requireRole(session, 'Agent');

    const { id } = await params;
    const articleId = parseInt(id);
    if (isNaN(articleId)) throw new APIError(400, 'invalid_id', 'Invalid article ID');

    // Verify article exists
    const [article] = await db
      .select({ id: knowledgeBaseArticles.id })
      .from(knowledgeBaseArticles)
      .where(eq(knowledgeBaseArticles.id, articleId));

    if (!article) throw new APIError(404, 'not_found', 'Article not found');

    const body = await req.json();
    const { content } = createCommentSchema.parse(body);

    const authorId = parseInt(session!.user!.id);

    const [comment] = await db
      .insert(kbComments)
      .values({
        articleId,
        authorId,
        content
      })
      .returning();

    // Fetch author name for response
    const [author] = await db
      .select({ fullName: users.fullName })
      .from(users)
      .where(eq(users.id, authorId));

    return NextResponse.json(
      { ...comment, authorName: author?.fullName ?? null },
      { status: 201 }
    );
  } catch (error) {
    return handleAPIError(error);
  }
}
