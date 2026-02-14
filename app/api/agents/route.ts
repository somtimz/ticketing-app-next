import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { inArray, eq, and } from 'drizzle-orm';
import { requireRole, handleAPIError } from '@/lib/api-error';

// GET /api/agents - List active agents/team leads for ticket assignment (Agent+)
export async function GET() {
  try {
    const session = await auth();
    requireRole(session, 'Agent');

    const agents = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: users.role
      })
      .from(users)
      .where(
        and(
          inArray(users.role, ['Agent', 'TeamLead', 'Admin']),
          eq(users.isActive, true)
        )
      )
      .orderBy(users.fullName);

    return NextResponse.json({ agents });
  } catch (error) {
    return handleAPIError(error);
  }
}
