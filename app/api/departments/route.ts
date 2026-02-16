import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { departments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, requireRole, handleAPIError } from '@/lib/api-error';
import { z } from 'zod';

const createDepartmentSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(10).toUpperCase(),
  description: z.string().max(500).optional(),
});

// GET /api/departments - List all departments
export async function GET() {
  try {
    const session = await auth();
    requireAuth(session);

    const results = await db
      .select()
      .from(departments)
      .orderBy(departments.name);

    return NextResponse.json({ departments: results });
  } catch (error) {
    return handleAPIError(error);
  }
}

// POST /api/departments - Create a department (Admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    requireRole(session, 'Admin');

    const body = await req.json();
    const data = createDepartmentSchema.parse(body);

    const result = await db
      .insert(departments)
      .values({
        name: data.name,
        code: data.code,
        description: data.description || null,
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    return handleAPIError(error);
  }
}
