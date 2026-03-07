import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { knowledgeBaseArticles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireRole, handleAPIError, APIError } from '@/lib/api-error';
import { hasRole } from '@/lib/rbac';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const reviewActionSchema = z.object({
  action: z.enum(['submit', 'approve', 'reject']),
  notes: z.string().optional()
});

// POST /api/kb/articles/[id]/review
// - Agent+ can submit for review (sets reviewStatus='InReview')
// - TeamLead+ can approve (sets reviewStatus='Published', isPublished=true) or reject (sets reviewStatus='Draft')
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    requireRole(session, 'Agent');

    const { id } = await params;
    const articleId = parseInt(id);
    if (isNaN(articleId)) throw new APIError(400, 'invalid_id', 'Invalid article ID');

    const body = await req.json();
    const { action } = reviewActionSchema.parse(body);

    // Load existing article
    const [existing] = await db
      .select({
        id: knowledgeBaseArticles.id,
        createdBy: knowledgeBaseArticles.createdBy,
        reviewStatus: knowledgeBaseArticles.reviewStatus,
        isPublished: knowledgeBaseArticles.isPublished
      })
      .from(knowledgeBaseArticles)
      .where(eq(knowledgeBaseArticles.id, articleId));

    if (!existing) throw new APIError(404, 'not_found', 'Article not found');

    const userId = parseInt(session!.user!.id);
    const isTeamLead = hasRole(session, 'TeamLead');

    if (action === 'submit') {
      // Agent+ can submit their own article for review (or Admin can submit any)
      const isAdmin = hasRole(session, 'Admin');
      if (!isAdmin && existing.createdBy !== userId) {
        throw new APIError(403, 'forbidden', 'You can only submit your own articles for review');
      }
      if (existing.reviewStatus === 'InReview') {
        throw new APIError(400, 'already_in_review', 'Article is already in review');
      }

      const [updated] = await db
        .update(knowledgeBaseArticles)
        .set({
          reviewStatus: 'InReview',
          updatedAt: new Date()
        })
        .where(eq(knowledgeBaseArticles.id, articleId))
        .returning();

      return NextResponse.json(updated);
    }

    if (action === 'approve') {
      if (!isTeamLead) {
        throw new APIError(403, 'forbidden', 'Only Team Leads and Admins can approve articles');
      }
      if (existing.reviewStatus !== 'InReview') {
        throw new APIError(400, 'not_in_review', 'Article must be in review to be approved');
      }

      const now = new Date();
      const [updated] = await db
        .update(knowledgeBaseArticles)
        .set({
          reviewStatus: 'Published',
          isPublished: true,
          publishedAt: existing.isPublished ? undefined : now,
          reviewedById: userId,
          reviewedAt: now,
          updatedAt: now
        })
        .where(eq(knowledgeBaseArticles.id, articleId))
        .returning();

      return NextResponse.json(updated);
    }

    if (action === 'reject') {
      if (!isTeamLead) {
        throw new APIError(403, 'forbidden', 'Only Team Leads and Admins can reject articles');
      }
      if (existing.reviewStatus !== 'InReview') {
        throw new APIError(400, 'not_in_review', 'Article must be in review to be rejected');
      }

      const now = new Date();
      const [updated] = await db
        .update(knowledgeBaseArticles)
        .set({
          reviewStatus: 'Draft',
          reviewedById: userId,
          reviewedAt: now,
          updatedAt: now
        })
        .where(eq(knowledgeBaseArticles.id, articleId))
        .returning();

      return NextResponse.json(updated);
    }

    throw new APIError(400, 'invalid_action', 'Invalid action');
  } catch (error) {
    return handleAPIError(error);
  }
}
