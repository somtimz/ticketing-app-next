import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notificationPrefsSchema, parseNotificationPreferences } from '@/lib/notification-preferences';
import type { ApiErrorResponse } from '@/types';

// GET /api/users/me/preferences
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json<ApiErrorResponse>({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, parseInt(session.user.id, 10)),
    columns: { emailNotificationsEnabled: true, notificationPreferences: true }
  });

  if (!user) {
    return NextResponse.json<ApiErrorResponse>({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    preferences: parseNotificationPreferences(user.notificationPreferences, user.emailNotificationsEnabled)
  });
}

// PUT /api/users/me/preferences
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json<ApiErrorResponse>({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const prefs = notificationPrefsSchema.parse(body);
    const anyEnabled = prefs.statusChange || prefs.commentAdded || prefs.resolved;

    await db
      .update(users)
      .set({
        emailNotificationsEnabled: anyEnabled,
        notificationPreferences: JSON.stringify(prefs),
        updatedAt: new Date()
      })
      .where(eq(users.id, parseInt(session.user.id, 10)));

    return NextResponse.json({ preferences: prefs });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json<ApiErrorResponse>({ error: 'Validation error' }, { status: 400 });
    }
    console.error('Error updating preferences:', error);
    return NextResponse.json<ApiErrorResponse>({ error: 'Failed to update preferences' }, { status: 500 });
  }
}
