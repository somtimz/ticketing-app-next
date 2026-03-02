import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { guestUsers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireRole, APIError, handleAPIError } from '@/lib/api-error';
import { z } from 'zod';

const updateGuestUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
  company: z.string().optional(),
  notes: z.string().nullable().optional(),
  isActive: z.boolean().optional()
});

// PATCH /api/admin/guest-users/[id] — update guest user (Admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireRole(session, 'Admin');

    const { id } = await params;
    const guestId = parseInt(id, 10);
    if (isNaN(guestId)) throw new APIError(400, 'bad_request', 'Invalid ID');

    const [existing] = await db.select({ id: guestUsers.id })
      .from(guestUsers).where(eq(guestUsers.id, guestId)).limit(1);
    if (!existing) throw new APIError(404, 'not_found', 'Guest user not found');

    const body = await req.json();
    const data = updateGuestUserSchema.parse(body);

    const [updated] = await db
      .update(guestUsers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(guestUsers.id, guestId))
      .returning();

    return NextResponse.json({ guestUser: updated });
  } catch (error) {
    return handleAPIError(error);
  }
}
