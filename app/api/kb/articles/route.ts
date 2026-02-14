import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { knowledgeBaseArticles, categories } from '@/lib/db/schema';
import { eq, and, or, ilike, sql, desc } from 'drizzle-orm';
import { requireAuth, requireRole, handleAPIError } from '@/lib/api-error';
import { hasRole } from '@/lib/rbac';
import { createKBArticleSchema } from '@/lib/validators';

// GET /api/kb/articles - List KB articles (paginated, filterable)
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    requireAuth(session);

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');
    const categoryId = searchParams.get('categoryId');
    const published = searchParams.get('published');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const offset = (page - 1) * limit;

    const isAgent = hasRole(session, 'Agent');

    // Build where conditions
    const conditions = [];

    // Employees can only see published articles
    if (!isAgent) {
      conditions.push(eq(knowledgeBaseArticles.isPublished, true));
    } else if (published === 'true') {
      conditions.push(eq(knowledgeBaseArticles.isPublished, true));
    }

    if (categoryId) {
      conditions.push(eq(knowledgeBaseArticles.categoryId, parseInt(categoryId)));
    }

    if (q && q.trim()) {
      const terms = q.trim().split(/\s+/).filter(t => t.length > 1);
      if (terms.length > 0) {
        const searchConds = terms.flatMap(term => [
          ilike(knowledgeBaseArticles.title, `%${term}%`),
          ilike(knowledgeBaseArticles.content, `%${term}%`)
        ]);
        conditions.push(or(...searchConds));
      }
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(knowledgeBaseArticles)
      .where(where);

    const articles = await db
      .select({
        id: knowledgeBaseArticles.id,
        title: knowledgeBaseArticles.title,
        categoryId: knowledgeBaseArticles.categoryId,
        categoryName: categories.name,
        createdBy: knowledgeBaseArticles.createdBy,
        viewCount: knowledgeBaseArticles.viewCount,
        helpfulCount: knowledgeBaseArticles.helpfulCount,
        notHelpfulCount: knowledgeBaseArticles.notHelpfulCount,
        isPublished: knowledgeBaseArticles.isPublished,
        createdAt: knowledgeBaseArticles.createdAt,
        updatedAt: knowledgeBaseArticles.updatedAt
      })
      .from(knowledgeBaseArticles)
      .leftJoin(categories, eq(knowledgeBaseArticles.categoryId, categories.id))
      .where(where)
      .orderBy(desc(knowledgeBaseArticles.updatedAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      articles,
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

// POST /api/kb/articles - Create a new KB article (Agent+)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    requireRole(session, 'Agent');

    const body = await req.json();
    const data = createKBArticleSchema.parse(body);

    const [article] = await db
      .insert(knowledgeBaseArticles)
      .values({
        title: data.title,
        content: data.content,
        categoryId: data.categoryId ?? null,
        isPublished: data.isPublished,
        createdBy: parseInt(session!.user!.id)
      })
      .returning();

    return NextResponse.json(article, { status: 201 });
  } catch (error) {
    return handleAPIError(error);
  }
}
