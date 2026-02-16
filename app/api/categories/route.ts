import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { categories } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, requireRole, handleAPIError } from '@/lib/api-error';
import { z } from 'zod';

const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  parentCategoryId: z.number().int().nullable().optional(),
  defaultAgentId: z.number().int().nullable().optional(),
});

// GET /api/categories - List all active categories
export async function GET() {
  try {
    const session = await auth();
    requireAuth(session);

    const results = await db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(categories.name);

    return NextResponse.json({ categories: results });
  } catch (error) {
    return handleAPIError(error);
  }
}

// POST /api/categories - Create a category (Admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    requireRole(session, 'Admin');

    const body = await req.json();
    const data = createCategorySchema.parse(body);

    const result = await db
      .insert(categories)
      .values({
        name: data.name,
        description: data.description || null,
        parentCategoryId: data.parentCategoryId || null,
        defaultAgentId: data.defaultAgentId || null,
      })
      .returning() as any[];

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    return handleAPIError(error);
  }
}
