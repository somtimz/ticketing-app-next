import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { serviceRequestTypes } from '@/lib/db/schema';
import type { NewServiceRequestType } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { hasRole } from '@/lib/rbac';
import { updateServiceRequestTypeSchema } from '@/lib/validators';

// PUT /api/admin/service-request-types/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !hasRole(session, 'Admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const typeId = parseInt(id, 10);
  if (isNaN(typeId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  try {
    const body = await req.json();
    const data = updateServiceRequestTypeSchema.parse(body);

    const updateData: Partial<NewServiceRequestType> & { updatedAt: Date } = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.defaultImpact !== undefined) updateData.defaultImpact = data.defaultImpact;
    if (data.defaultUrgency !== undefined) updateData.defaultUrgency = data.defaultUrgency;
    if (data.formFields !== undefined) updateData.formFields = data.formFields ? JSON.stringify(data.formFields) : null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

    const [updated] = await db
      .update(serviceRequestTypes)
      .set(updateData)
      .where(eq(serviceRequestTypes.id, typeId))
      .returning();

    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

// DELETE /api/admin/service-request-types/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !hasRole(session, 'Admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const typeId = parseInt(id, 10);
  if (isNaN(typeId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  await db.delete(serviceRequestTypes).where(eq(serviceRequestTypes.id, typeId));

  return NextResponse.json({ success: true });
}
