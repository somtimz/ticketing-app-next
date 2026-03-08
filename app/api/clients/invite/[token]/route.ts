import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, clientInvites } from '@/lib/db/schema';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import type { ClientInvite } from '@/lib/db/schema';

async function findValidInvite(token: string): Promise<ClientInvite | null> {
  const rows = await db
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
  return rows[0] ?? null;
}

const INVALID_TOKEN = { error: 'INVALID_TOKEN', message: 'Token is invalid or expired' } as const;

// GET — validate token
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await findValidInvite(token);
  if (!invite) return NextResponse.json(INVALID_TOKEN, { status: 400 });
  return NextResponse.json({ email: invite.email });
}

// POST — accept invite (set password)
const acceptSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters')
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await findValidInvite(token);
  if (!invite) return NextResponse.json(INVALID_TOKEN, { status: 400 });

  const body = await req.json() as unknown;
  const parsed = acceptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_INPUT', message: parsed.error.message }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  // Set password on user + mark token claimed (parallel, independent updates)
  await Promise.all([
    db.update(users).set({ passwordHash, isActive: true }).where(eq(users.id, invite.userId)),
    db.update(clientInvites).set({ claimedAt: new Date() }).where(eq(clientInvites.id, invite.id)),
  ]);

  return NextResponse.json({ success: true });
}
