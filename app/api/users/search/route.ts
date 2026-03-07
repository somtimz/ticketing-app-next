import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { or, ilike, inArray, and } from 'drizzle-orm';
import { requireRole, handleAPIError } from '@/lib/api-error';

/**
 * GET /api/users/search
 * Search the users table (agents, team leads, admins, employees).
 *
 * Query params:
 *   - q:    search query (name or email), required, min 2 chars
 *   - role: comma-separated roles to filter by (e.g. "Agent,TeamLead")
 *           defaults to all roles
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    requireRole(session, 'Agent');

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() ?? '';
    const roleFilter = searchParams.get('role');

    if (q.length < 2) {
      return NextResponse.json({ users: [] });
    }

    const roleList = roleFilter
      ? (roleFilter.split(',').map(r => r.trim()).filter(Boolean) as Array<typeof users.role._.data>)
      : null;

    const conditions = and(
      or(
        ilike(users.fullName, `%${q}%`),
        ilike(users.email, `%${q}%`)
      ),
      roleList && roleList.length > 0
        ? inArray(users.role, roleList)
        : undefined
    );

    const results = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(conditions)
      .limit(15);

    return NextResponse.json({ users: results });
  } catch (err) {
    return handleAPIError(err);
  }
}
