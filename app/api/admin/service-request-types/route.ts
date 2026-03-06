import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { serviceRequestTypes, categories } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { hasRole } from '@/lib/rbac';
import { z } from 'zod';

const createSchema = z.object({
  categoryId: z.number().int().optional().nullable(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  defaultImpact: z.enum(['Low', 'Medium', 'High']).default('Medium'),
  defaultUrgency: z.enum(['Low', 'Medium', 'High']).default('Medium'),
  formFields: z.array(z.object({
    name: z.string(),
    label: z.string(),
    type: z.enum(['text', 'textarea', 'select']),
    required: z.boolean().default(false),
    options: z.array(z.string()).optional()
  })).optional(),
  sortOrder: z.number().int().default(0)
});

// GET /api/admin/service-request-types
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || !hasRole(session, 'Admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const categoryId = req.nextUrl.searchParams.get('categoryId');

  const rows = await db
    .select({
      id: serviceRequestTypes.id,
      name: serviceRequestTypes.name,
      description: serviceRequestTypes.description,
      defaultImpact: serviceRequestTypes.defaultImpact,
      defaultUrgency: serviceRequestTypes.defaultUrgency,
      formFields: serviceRequestTypes.formFields,
      isActive: serviceRequestTypes.isActive,
      sortOrder: serviceRequestTypes.sortOrder,
      categoryId: serviceRequestTypes.categoryId,
      category: { id: categories.id, name: categories.name }
    })
    .from(serviceRequestTypes)
    .leftJoin(categories, eq(serviceRequestTypes.categoryId, categories.id))
    .where(categoryId ? eq(serviceRequestTypes.categoryId, parseInt(categoryId, 10)) : undefined)
    .orderBy(asc(serviceRequestTypes.sortOrder), asc(serviceRequestTypes.name));

  return NextResponse.json({ serviceRequestTypes: rows });
}

// POST /api/admin/service-request-types
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !hasRole(session, 'Admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const [row] = await db
      .insert(serviceRequestTypes)
      .values({
        categoryId: data.categoryId ?? null,
        name: data.name,
        description: data.description ?? null,
        defaultImpact: data.defaultImpact,
        defaultUrgency: data.defaultUrgency,
        formFields: data.formFields ? JSON.stringify(data.formFields) : null,
        sortOrder: data.sortOrder
      })
      .returning();

    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 });
    }
    console.error('Error creating service request type:', error);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}
