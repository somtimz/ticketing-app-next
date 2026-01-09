import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { categories } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { ApiErrorResponse } from '@/types';

// GET /api/categories - List all active categories
export async function GET() {
  const session = await auth();

  if (!session) {
    return NextResponse.json<ApiErrorResponse>(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const results = await db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(categories.name);

    return NextResponse.json({ categories: results });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json<ApiErrorResponse>(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
