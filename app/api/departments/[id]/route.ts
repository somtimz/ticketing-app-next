import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { departments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, requireRole, handleAPIError, APIError } from '@/lib/api-error';
import { z } from 'zod';

const updateDepartmentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  code: z.string().min(1).max(10).toUpperCase().optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

// GET /api/departments/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireAuth(session);
    const { id } = await params;

    const result = await db
      .select()
      .from(departments)
      .where(eq(departments.id, parseInt(id)))
      .limit(1);

    if (!result.length) {
      throw new APIError(404, 'not_found', 'Department not found');
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    return handleAPIError(error);
  }
}

// PATCH /api/departments/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireRole(session, 'Admin');
    const { id } = await params;

    const body = await req.json();
    const data = updateDepartmentSchema.parse(body);

    const result = await db
      .update(departments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(departments.id, parseInt(id)))
      .returning();

    if (!result.length) {
      throw new APIError(404, 'not_found', 'Department not found');
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    return handleAPIError(error);
  }
}

// DELETE /api/departments/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireRole(session, 'Admin');
    const { id } = await params;

    const result = await db
      .update(departments)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(departments.id, parseInt(id)))
      .returning();

    if (!result.length) {
      throw new APIError(404, 'not_found', 'Department not found');
    }

    return NextResponse.json({ message: 'Department deactivated' });
  } catch (error) {
    return handleAPIError(error);
  }
}
