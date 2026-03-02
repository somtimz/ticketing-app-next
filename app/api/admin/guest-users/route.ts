import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { guestUsers, callers, tickets, users } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { requireRole, handleAPIError } from '@/lib/api-error';

// GET /api/admin/guest-users — list all guest users (Admin only)
export async function GET() {
  try {
    const session = await auth();
    requireRole(session, 'Admin');

    const rows = await db
      .select({
        id: guestUsers.id,
        name: guestUsers.name,
        email: guestUsers.email,
        company: guestUsers.company,
        phone: guestUsers.phone,
        isActive: guestUsers.isActive,
        notes: guestUsers.notes,
        createdAt: guestUsers.createdAt,
        sponsorName: users.fullName,
        callerName: callers.fullName,
        callerEmail: callers.email,
        ticketCount: sql<number>`(
          SELECT COUNT(*) FROM ${tickets} WHERE ${tickets.callerId} = ${callers.id}
        )`
      })
      .from(guestUsers)
      .leftJoin(users, eq(guestUsers.sponsorId, users.id))
      .leftJoin(callers, eq(callers.guestUserId, guestUsers.id))
      .orderBy(guestUsers.createdAt);

    return NextResponse.json({ guestUsers: rows });
  } catch (error) {
    return handleAPIError(error);
  }
}
