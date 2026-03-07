import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { knowledgeBaseArticles, categories, users, articleTags, kbTags } from '@/lib/db/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';
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
      isAgentOnly: knowledgeBaseArticles.isAgentOnly,
      createdAt: knowledgeBaseArticles.createdAt,
      updatedAt: knowledgeBaseArticles.updatedAt,
      publishedAt: knowledgeBaseArticles.publishedAt,
      articleType: knowledgeBaseArticles.articleType,
      expiresAt: knowledgeBaseArticles.expiresAt,
      reviewStatus: knowledgeBaseArticles.reviewStatus,
      reviewedById: knowledgeBaseArticles.reviewedById,
      reviewedAt: knowledgeBaseArticles.reviewedAt
    })
    .from(knowledgeBaseArticles)
    .leftJoin(categories, eq(knowledgeBaseArticles.categoryId, categories.id))
    .leftJoin(users, eq(knowledgeBaseArticles.createdBy, users.id))
    .where(
      isAgent
        ? eq(knowledgeBaseArticles.id, id)
        : and(
            eq(knowledgeBaseArticles.id, id),
            eq(knowledgeBaseArticles.isPublished, true),
            eq(knowledgeBaseArticles.isAgentOnly, false)
          )
    );

  if (!article) return null;

  // Fetch reviewer name separately to avoid self-join complexity
  let reviewerName: string | null = null;
  if (article.reviewedById) {
    const [reviewer] = await db
      .select({ fullName: users.fullName })
      .from(users)
      .where(eq(users.id, article.reviewedById));
    reviewerName = reviewer?.fullName ?? null;
  }

  return { ...article, reviewerName };
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

    if (article.isAgentOnly && !isAgent) {
      throw new APIError(403, 'forbidden', 'This article is restricted to agents');
    }

    // Fire-and-forget view count increment
    void db
      .update(knowledgeBaseArticles)
      .set({ viewCount: sql`${knowledgeBaseArticles.viewCount} + 1` })
      .where(eq(knowledgeBaseArticles.id, articleId));

    const tagRows = await db
      .select({ id: kbTags.id, name: kbTags.name })
      .from(articleTags)
      .innerJoin(kbTags, eq(articleTags.tagId, kbTags.id))
      .where(eq(articleTags.articleId, articleId));

    return NextResponse.json({ ...article, tags: tagRows });
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

    // Set publishedAt on first publish
    let publishedAt: Date | null | undefined = undefined;
    if (data.isPublished === true) {
      const [currentArticle] = await db
        .select({ publishedAt: knowledgeBaseArticles.publishedAt })
        .from(knowledgeBaseArticles)
        .where(eq(knowledgeBaseArticles.id, articleId));
      if (currentArticle && !currentArticle.publishedAt) {
        publishedAt = new Date();
      }
    }

    const { tagIds, expiresAt, ...articleData } = data;
    const [updated] = await db
      .update(knowledgeBaseArticles)
      .set({
        ...articleData,
        categoryId: data.categoryId ?? null,
        ...(publishedAt !== undefined ? { publishedAt } : {}),
        ...(expiresAt !== undefined ? { expiresAt: expiresAt ? new Date(expiresAt) : null } : {}),
        updatedAt: new Date()
      })
      .where(eq(knowledgeBaseArticles.id, articleId))
      .returning();

    if (tagIds !== undefined) {
      await db.delete(articleTags).where(eq(articleTags.articleId, articleId));
      if (tagIds.length > 0) {
        await db.insert(articleTags).values(
          tagIds.map(tagId => ({ articleId, tagId }))
        );
      }
    }

    const tagRows = await db
      .select({ id: kbTags.id, name: kbTags.name })
      .from(articleTags)
      .innerJoin(kbTags, eq(articleTags.tagId, kbTags.id))
      .where(eq(articleTags.articleId, articleId));

    return NextResponse.json({ ...updated, tags: tagRows });
  } catch (error) {
    return handleAPIError(error);
  }
}

// DELETE /api/kb/articles/[id] - Admin or article author (Agent+)
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
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
      throw new APIError(403, 'forbidden', 'You can only delete your own articles');
    }

    await db
      .delete(knowledgeBaseArticles)
      .where(eq(knowledgeBaseArticles.id, articleId));

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAPIError(error);
  }
}
