import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { ApiErrorResponse } from '@/types';

export interface NotificationPreferences {
  statusChange: boolean;
  commentAdded: boolean;
  resolved: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = {
  statusChange: true,
  commentAdded: true,
  resolved: true
};

const prefsSchema = z.object({
  statusChange: z.boolean(),
  commentAdded: z.boolean(),
  resolved: z.boolean()
});

export function parseNotificationPreferences(raw: string | null, fallback: boolean): NotificationPreferences {
  if (!raw) {
    return { statusChange: fallback, commentAdded: fallback, resolved: fallback };
  }
  try {
    const parsed = JSON.parse(raw);
    return prefsSchema.parse(parsed);
  } catch {
    return { statusChange: fallback, commentAdded: fallback, resolved: fallback };
  }
}

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

  const prefs = parseNotificationPreferences(user.notificationPreferences, user.emailNotificationsEnabled);

  return NextResponse.json({ preferences: prefs });
}

// PUT /api/users/me/preferences
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json<ApiErrorResponse>({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const prefs = prefsSchema.parse(body);

    // Keep emailNotificationsEnabled in sync (true if any pref is enabled)
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
