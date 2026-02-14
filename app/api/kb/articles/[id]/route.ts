import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { knowledgeBaseArticles, categories, users } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth, requireRole, handleAPIError, APIError } from '@/lib/api-error';
import { hasRole } from '@/lib/rbac';
import { updateKBArticleSchema } from '@/lib/validators';

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function getArticle(id: number, isAgent: boolean) {
  const [article] = await db
    .select({
      id: knowledgeBaseArticles.id,
      title: knowledgeBaseArticles.title,
      content: knowledgeBaseArticles.content,
      categoryId: knowledgeBaseArticles.categoryId,
      categoryName: categories.name,
      createdBy: knowledgeBaseArticles.createdBy,
      authorName: users.fullName,
      viewCount: knowledgeBaseArticles.viewCount,
      helpfulCount: knowledgeBaseArticles.helpfulCount,
      notHelpfulCount: knowledgeBaseArticles.notHelpfulCount,
      isPublished: knowledgeBaseArticles.isPublished,
      createdAt: knowledgeBaseArticles.createdAt,
      updatedAt: knowledgeBaseArticles.updatedAt
    })
    .from(knowledgeBaseArticles)
    .leftJoin(categories, eq(knowledgeBaseArticles.categoryId, categories.id))
    .leftJoin(users, eq(knowledgeBaseArticles.createdBy, users.id))
    .where(
      isAgent
        ? eq(knowledgeBaseArticles.id, id)
        : and(eq(knowledgeBaseArticles.id, id), eq(knowledgeBaseArticles.isPublished, true))
    );

  return article ?? null;
}

// GET /api/kb/articles/[id]
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    requireAuth(session);

    const { id } = await params;
    const articleId = parseInt(id);
    if (isNaN(articleId)) throw new APIError(400, 'invalid_id', 'Invalid article ID');

    const isAgent = hasRole(session, 'Agent');
    const article = await getArticle(articleId, isAgent);

    if (!article) throw new APIError(404, 'not_found', 'Article not found');

    // Fire-and-forget view count increment
    void db
      .update(knowledgeBaseArticles)
      .set({ viewCount: sql`${knowledgeBaseArticles.viewCount} + 1` })
      .where(eq(knowledgeBaseArticles.id, articleId));

    return NextResponse.json(article);
  } catch (error) {
    return handleAPIError(error);
  }
}

// PATCH /api/kb/articles/[id] - Agent+ who is author, or Admin
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    requireRole(session, 'Agent');

    const { id } = await params;
    const articleId = parseInt(id);
    if (isNaN(articleId)) throw new APIError(400, 'invalid_id', 'Invalid article ID');

    const [existing] = await db
      .select({ createdBy: knowledgeBaseArticles.createdBy })
      .from(knowledgeBaseArticles)
      .where(eq(knowledgeBaseArticles.id, articleId));

    if (!existing) throw new APIError(404, 'not_found', 'Article not found');

    const userId = parseInt(session!.user!.id);
    const isAdmin = hasRole(session, 'Admin');

    if (!isAdmin && existing.createdBy !== userId) {
      throw new APIError(403, 'forbidden', 'You can only edit your own articles');
    }

    const body = await req.json();
    const data = updateKBArticleSchema.parse(body);

    const [updated] = await db
      .update(knowledgeBaseArticles)
      .set({
        ...data,
        categoryId: data.categoryId ?? null,
        updatedAt: new Date()
      })
      .where(eq(knowledgeBaseArticles.id, articleId))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    return handleAPIError(error);
  }
}

// DELETE /api/kb/articles/[id] - Admin only
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    requireRole(session, 'Admin');

    const { id } = await params;
    const articleId = parseInt(id);
    if (isNaN(articleId)) throw new APIError(400, 'invalid_id', 'Invalid article ID');

    const [deleted] = await db
      .delete(knowledgeBaseArticles)
      .where(eq(knowledgeBaseArticles.id, articleId))
      .returning({ id: knowledgeBaseArticles.id });

    if (!deleted) throw new APIError(404, 'not_found', 'Article not found');

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAPIError(error);
  }
}
