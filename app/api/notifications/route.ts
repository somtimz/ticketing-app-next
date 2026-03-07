import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { eq, desc, isNull, and, sql } from 'drizzle-orm';
import { requireAuth, handleAPIError } from '@/lib/api-error';

// GET /api/notifications — current user's notifications
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    requireAuth(session);
    const userId = parseInt(session!.user.id, 10);

    const sp = req.nextUrl.searchParams;
    const unreadOnly = sp.get('unreadOnly') === 'true';
    const limit = Math.min(parseInt(sp.get('limit') ?? '30', 10), 100);

    const condition = and(
      eq(notifications.userId, userId),
      unreadOnly ? isNull(notifications.readAt) : undefined
    );

    const rows = await db
      .select()
      .from(notifications)
      .where(condition)
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    const [{ unreadCount }] = await db
      .select({ unreadCount: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));

    return NextResponse.json({ notifications: rows, unreadCount: Number(unreadCount) });
  } catch (error) {
    return handleAPIError(error);
  }
}

// PATCH /api/notifications — mark all as read
export async function PATCH(_req: NextRequest) {
  try {
    const session = await auth();
    requireAuth(session);
    const userId = parseInt(session!.user.id, 10);

    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAPIError(error);
  }
}
