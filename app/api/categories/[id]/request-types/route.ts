import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { serviceRequestTypes } from '@/lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';

// GET /api/categories/[id]/request-types - Public to all authenticated users
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const categoryId = parseInt(id, 10);
  if (isNaN(categoryId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const rows = await db
    .select()
    .from(serviceRequestTypes)
    .where(and(
      eq(serviceRequestTypes.categoryId, categoryId),
      eq(serviceRequestTypes.isActive, true)
    ))
    .orderBy(asc(serviceRequestTypes.sortOrder), asc(serviceRequestTypes.name));

  return NextResponse.json({
    requestTypes: rows.map(r => ({
      ...r,
      formFields: r.formFields ? JSON.parse(r.formFields) : []
    }))
  });
}
