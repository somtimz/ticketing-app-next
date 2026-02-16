import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { categories } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, requireRole, handleAPIError, APIError } from '@/lib/api-error';
import { z } from 'zod';

const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  parentCategoryId: z.number().int().nullable().optional(),
  defaultAgentId: z.number().int().nullable().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/categories/[id]
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
      .from(categories)
      .where(eq(categories.id, parseInt(id)))
      .limit(1);

    if (!result.length) {
      throw new APIError(404, 'not_found', 'Category not found');
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    return handleAPIError(error);
  }
}

// PATCH /api/categories/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireRole(session, 'Admin');
    const { id } = await params;

    const body = await req.json();
    const data = updateCategorySchema.parse(body);

    const result = await db
      .update(categories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(categories.id, parseInt(id)))
      .returning() as any[];

    if (!result.length) {
      throw new APIError(404, 'not_found', 'Category not found');
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    return handleAPIError(error);
  }
}

// DELETE /api/categories/[id] - Soft delete
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireRole(session, 'Admin');
    const { id } = await params;

    const result = await db
      .update(categories)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(categories.id, parseInt(id)))
      .returning() as any[];

    if (!result.length) {
      throw new APIError(404, 'not_found', 'Category not found');
    }

    return NextResponse.json({ message: 'Category deactivated' });
  } catch (error) {
    return handleAPIError(error);
  }
}
