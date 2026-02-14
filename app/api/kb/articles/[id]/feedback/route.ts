import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { knowledgeBaseArticles } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { requireAuth, handleAPIError, APIError } from '@/lib/api-error';
import { z } from 'zod';

const feedbackSchema = z.object({
  vote: z.enum(['helpful', 'not_helpful'])
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/kb/articles/[id]/feedback
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    requireAuth(session);

    const { id } = await params;
    const articleId = parseInt(id);
    if (isNaN(articleId)) throw new APIError(400, 'invalid_id', 'Invalid article ID');

    const body = await req.json();
    const { vote } = feedbackSchema.parse(body);

    const [updated] = await db
      .update(knowledgeBaseArticles)
      .set(
        vote === 'helpful'
          ? { helpfulCount: sql`${knowledgeBaseArticles.helpfulCount} + 1` }
          : { notHelpfulCount: sql`${knowledgeBaseArticles.notHelpfulCount} + 1` }
      )
      .where(eq(knowledgeBaseArticles.id, articleId))
      .returning({
        helpfulCount: knowledgeBaseArticles.helpfulCount,
        notHelpfulCount: knowledgeBaseArticles.notHelpfulCount
      });

    if (!updated) throw new APIError(404, 'not_found', 'Article not found');

    return NextResponse.json({
      helpfulCount: updated.helpfulCount,
      notHelpfulCount: updated.notHelpfulCount
    });
  } catch (error) {
    return handleAPIError(error);
  }
}
