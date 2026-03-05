import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, handleAPIError, APIError } from '@/lib/api-error';

// PATCH /api/notifications/[id] — mark single notification as read
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireAuth(session);
    const userId = parseInt(session!.user.id, 10);

    const { id } = await params;
    const notifId = parseInt(id, 10);
    if (isNaN(notifId)) throw new APIError(400, 'bad_request', 'Invalid ID');

    const [updated] = await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, notifId), eq(notifications.userId, userId)))
      .returning();

    if (!updated) throw new APIError(404, 'not_found', 'Notification not found');

    return NextResponse.json({ notification: updated });
  } catch (error) {
    return handleAPIError(error);
  }
}

// DELETE /api/notifications/[id] — delete a notification
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireAuth(session);
    const userId = parseInt(session!.user.id, 10);

    const { id } = await params;
    const notifId = parseInt(id, 10);
    if (isNaN(notifId)) throw new APIError(400, 'bad_request', 'Invalid ID');

    await db
      .delete(notifications)
      .where(and(eq(notifications.id, notifId), eq(notifications.userId, userId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAPIError(error);
  }
}
