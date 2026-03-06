import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { updateUserPreferencesSchema } from '@/lib/validators';
import type { ApiErrorResponse } from '@/types';

// GET /api/users/me/preferences
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json<ApiErrorResponse>({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, parseInt(session.user.id, 10)),
    columns: { emailNotificationsEnabled: true }
  });

  if (!user) {
    return NextResponse.json<ApiErrorResponse>({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ emailNotificationsEnabled: user.emailNotificationsEnabled });
}

// PUT /api/users/me/preferences
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json<ApiErrorResponse>({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = updateUserPreferencesSchema.parse(body);

    await db
      .update(users)
      .set({ emailNotificationsEnabled: validated.emailNotificationsEnabled, updatedAt: new Date() })
      .where(eq(users.id, parseInt(session.user.id, 10)));

    return NextResponse.json({ emailNotificationsEnabled: validated.emailNotificationsEnabled });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json<ApiErrorResponse>({ error: 'Validation error' }, { status: 400 });
    }
    console.error('Error updating preferences:', error);
    return NextResponse.json<ApiErrorResponse>({ error: 'Failed to update preferences' }, { status: 500 });
  }
}
