import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, clientInvites } from '@/lib/db/schema';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

// GET — validate token
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const invite = await db
    .select()
    .from(clientInvites)
    .where(
      and(
        eq(clientInvites.token, token),
        isNull(clientInvites.claimedAt),
        gt(clientInvites.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!invite.length) {
    return NextResponse.json({ error: 'INVALID_TOKEN', message: 'Token is invalid or expired' }, { status: 400 });
  }

  return NextResponse.json({ email: invite[0].email });
}

// POST — accept invite (set password)
const acceptSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters')
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const invite = await db
    .select()
    .from(clientInvites)
    .where(
      and(
        eq(clientInvites.token, token),
        isNull(clientInvites.claimedAt),
        gt(clientInvites.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!invite.length) {
    return NextResponse.json({ error: 'INVALID_TOKEN', message: 'Token is invalid or expired' }, { status: 400 });
  }

  const body = await req.json() as unknown;
  const parsed = acceptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_INPUT', message: parsed.error.message }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  // Set password on user + mark token claimed
  await db.update(users)
    .set({ passwordHash, isActive: true })
    .where(eq(users.id, invite[0].userId));

  await db.update(clientInvites)
    .set({ claimedAt: new Date() })
    .where(eq(clientInvites.id, invite[0].id));

  return NextResponse.json({ success: true });
}
