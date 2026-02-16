import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { ticketStatusHistory, comments, calls, attachments, users, callers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, handleAPIError } from '@/lib/api-error';

interface TimelineEvent {
  id: string;
  type: 'status_change' | 'comment' | 'call' | 'attachment';
  timestamp: Date;
  actor: { id: number; fullName: string } | null;
  data: Record<string, unknown>;
}

// GET /api/tickets/[id]/history - Unified activity timeline
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireAuth(session);
    const { id } = await params;
    const ticketId = parseInt(id);

    // Fetch all activity types in parallel
    const [statusChanges, ticketComments, ticketCalls, ticketAttachments] = await Promise.all([
      db
        .select({
          id: ticketStatusHistory.id,
          fromStatus: ticketStatusHistory.fromStatus,
          toStatus: ticketStatusHistory.toStatus,
          notes: ticketStatusHistory.notes,
          changedAt: ticketStatusHistory.changedAt,
          changedById: ticketStatusHistory.changedBy,
          actorName: users.fullName,
        })
        .from(ticketStatusHistory)
        .leftJoin(users, eq(ticketStatusHistory.changedBy, users.id))
        .where(eq(ticketStatusHistory.ticketId, ticketId)),

      db
        .select({
          id: comments.id,
          body: comments.body,
          isInternal: comments.isInternal,
          createdAt: comments.createdAt,
          authorId: comments.authorId,
          authorName: users.fullName,
        })
        .from(comments)
        .leftJoin(users, eq(comments.authorId, users.id))
        .where(eq(comments.ticketId, ticketId)),

      db
        .select({
          id: calls.id,
          callDirection: calls.callDirection,
          duration: calls.duration,
          notes: calls.notes,
          callOutcome: calls.callOutcome,
          createdAt: calls.createdAt,
          agentId: calls.agentId,
          agentName: users.fullName,
        })
        .from(calls)
        .leftJoin(users, eq(calls.agentId, users.id))
        .where(eq(calls.ticketId, ticketId)),

      db
        .select({
          id: attachments.id,
          filename: attachments.filename,
          fileSize: attachments.fileSize,
          createdAt: attachments.createdAt,
          uploadedById: attachments.uploadedBy,
          uploaderName: users.fullName,
        })
        .from(attachments)
        .leftJoin(users, eq(attachments.uploadedBy, users.id))
        .where(eq(attachments.ticketId, ticketId)),
    ]);

    // Build unified timeline
    const timeline: TimelineEvent[] = [];

    for (const sc of statusChanges) {
      timeline.push({
        id: `status-${sc.id}`,
        type: 'status_change',
        timestamp: sc.changedAt,
        actor: sc.changedById ? { id: sc.changedById, fullName: sc.actorName || 'Unknown' } : null,
        data: { fromStatus: sc.fromStatus, toStatus: sc.toStatus, notes: sc.notes },
      });
    }

    for (const c of ticketComments) {
      timeline.push({
        id: `comment-${c.id}`,
        type: 'comment',
        timestamp: c.createdAt,
        actor: { id: c.authorId, fullName: c.authorName || 'Unknown' },
        data: { body: c.body, isInternal: c.isInternal },
      });
    }

    for (const cl of ticketCalls) {
      timeline.push({
        id: `call-${cl.id}`,
        type: 'call',
        timestamp: cl.createdAt,
        actor: { id: cl.agentId, fullName: cl.agentName || 'Unknown' },
        data: { callDirection: cl.callDirection, duration: cl.duration, notes: cl.notes, callOutcome: cl.callOutcome },
      });
    }

    for (const a of ticketAttachments) {
      timeline.push({
        id: `attachment-${a.id}`,
        type: 'attachment',
        timestamp: a.createdAt,
        actor: a.uploadedById ? { id: a.uploadedById, fullName: a.uploaderName || 'Unknown' } : null,
        data: { filename: a.filename, fileSize: a.fileSize },
      });
    }

    // Sort by timestamp descending (newest first)
    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({ timeline });
  } catch (error) {
    return handleAPIError(error);
  }
}
