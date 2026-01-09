import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { employees } from '@/lib/db/schema';
import { or, like } from 'drizzle-orm';
import type { ApiErrorResponse } from '@/types';

// GET /api/employees/search - Search employee directory
export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json<ApiErrorResponse>(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json<ApiErrorResponse>(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Search by employee ID, name, or email
    const results = await db
      .select()
      .from(employees)
      .where(
        or(
          like(employees.employeeId, `%${query}%`),
          like(employees.fullName, `%${query}%`),
          like(employees.email, `%${query}%`)
        )
      )
      .limit(10);

    return NextResponse.json({ employees: results });
  } catch (error) {
    console.error('Error searching employees:', error);
    return NextResponse.json<ApiErrorResponse>(
      { error: 'Failed to search employees' },
      { status: 500 }
    );
  }
}
