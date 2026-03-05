import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { inArray, eq, and, or, ilike } from 'drizzle-orm';
import { requireAuth, handleAPIError } from '@/lib/api-error';

// GET /api/agents - List active agents/team leads for ticket assignment (any authenticated user)
// Supports optional ?q= search for @mention autocomplete
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    requireAuth(session);

    const q = req.nextUrl.searchParams.get('q');

    const conditions = and(
      inArray(users.role, ['Agent', 'TeamLead', 'Admin']),
      eq(users.isActive, true),
      q ? or(
        ilike(users.fullName, `%${q}%`),
        ilike(users.email, `%${q}%`)
      ) : undefined
    );

    const agents = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: users.role
      })
      .from(users)
      .where(conditions)
      .orderBy(users.fullName)
      .limit(20);

    return NextResponse.json({ agents });
  } catch (error) {
    return handleAPIError(error);
  }
}
