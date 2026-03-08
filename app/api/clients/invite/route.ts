import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, customers, clientInvites } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireRole, handleAPIError } from '@/lib/api-error';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import crypto from 'crypto';

const inviteSchema = z.object({
  customerId: z.number().int().positive(),
  email: z.string().email(),
  name: z.string().min(1)
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    requireRole(session, 'Admin');

    const body = await req.json() as unknown;
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT', message: parsed.error.message }, { status: 400 });
    }

    const { customerId, email, name } = parsed.data;

    // Verify customer exists
    const customer = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
    if (!customer.length) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Customer not found' }, { status: 404 });
    }

    // Check if user already exists for this email
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    let userId: number;

    if (existing.length) {
      userId = existing[0].id;
    } else {
      // Create user account (no password yet)
      const [newUser] = await db.insert(users).values({
        fullName: name,
        email,
        role: 'Client',
        customerId,
        isActive: true,
        passwordHash: null
      }).returning({ id: users.id });
      userId = newUser.id;
    }

    // Generate invite token (72hr expiry)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

    await db.insert(clientInvites).values({ email, token, userId, expiresAt });

    // TODO: Send email via Resend — for now return token in response (dev only)
    const inviteUrl = `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/portal/accept-invite?token=${token}`;

    return NextResponse.json({ success: true, inviteUrl }, { status: 201 });
  } catch (error) {
    return handleAPIError(error);
  }
}
