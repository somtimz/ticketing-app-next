/**
 * Knowledge base search API
 * Provides full-text search for KB articles
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { knowledgeBaseArticles, categories } from '@/lib/db/schema';
import { eq, and, or, ilike, sql, desc } from 'drizzle-orm';
import { handleAPIError } from '@/lib/api-error';

// GET /api/kb/search?q=term - Search knowledge base articles
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'You must be logged in' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const categoryId = searchParams.get('categoryId');
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;

    if (!query || query.trim().length === 0) {
      return NextResponse.json({
        articles: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0
        }
      });
    }

    // Build search conditions
    const searchTerms = query.trim().split(/\s+/).filter(term => term.length > 2);
    const searchConditions = searchTerms.flatMap(term => [
      ilike(knowledgeBaseArticles.title, `%${term}%`),
      ilike(knowledgeBaseArticles.content, `%${term}%`)
    ]);

    const whereConditions = [
      eq(knowledgeBaseArticles.isPublished, true),
      ...(searchConditions.length > 0 ? [or(...searchConditions)] : []),
      ...(categoryId ? [eq(knowledgeBaseArticles.categoryId, parseInt(categoryId))] : [])
    ];

    // Get total count
    const { count } = await db
      .select({ count: sql<number>`count(*)` })
      .from(knowledgeBaseArticles)
      .where(and(...whereConditions));

    // Search articles
    const articles = await db
      .select({
        id: knowledgeBaseArticles.id,
        title: knowledgeBaseArticles.title,
        content: knowledgeBaseArticles.content,
        categoryId: knowledgeBaseArticles.categoryId,
        categoryName: categories.name,
        viewCount: knowledgeBaseArticles.viewCount,
        helpfulCount: knowledgeBaseArticles.helpfulCount,
        notHelpfulCount: knowledgeBaseArticles.notHelpfulCount,
        createdAt: knowledgeBaseArticles.createdAt,
        updatedAt: knowledgeBaseArticles.updatedAt
      })
      .from(knowledgeBaseArticles)
      .leftJoin(categories, eq(knowledgeBaseArticles.categoryId, categories.id))
      .where(and(...whereConditions))
      .orderBy(desc(knowledgeBaseArticles.helpfulCount))
      .limit(limit)
      .offset(offset);

    // Calculate relevance score and sort
    const scoredArticles = articles.map(article => {
      let score = 0;
      const titleLower = article.title.toLowerCase();
      const contentLower = article.content.toLowerCase();
      const queryLower = query.toLowerCase();

      // Exact title match
      if (titleLower === queryLower) score += 100;
      // Title starts with query
      else if (titleLower.startsWith(queryLower)) score += 50;
      // Title contains query
      else if (titleLower.includes(queryLower)) score += 25;
      // Content contains query
      if (contentLower.includes(queryLower)) score += 10;

      // Bonus for helpful articles
      score += (article.helpfulCount - (article.notHelpfulCount || 0)) * 2;

      return { ...article, score };
    });

    // Sort by score (descending) then by helpful count
    scoredArticles.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.helpfulCount - a.helpfulCount;
    });

    return NextResponse.json({
      articles: scoredArticles.map(({ score, ...article }) => article),
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
