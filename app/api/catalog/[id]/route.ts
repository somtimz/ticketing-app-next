import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { catalogItems } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireRole, APIError, handleAPIError } from '@/lib/api-error';
import { z } from 'zod';

const SERVICE_REQUEST_CATEGORIES = [
  'New Equipment',
  'Software Access',
  'Account Setup',
  'Hardware Repair',
  'Other',
] as const;

const updateCatalogItemSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(2000).optional(),
  category: z.enum(SERVICE_REQUEST_CATEGORIES).optional(),
  estimatedSLAHours: z.number().int().positive().optional(),
  eligibleRoles: z.array(z.string()).optional(),
  icon: z.string().max(10).optional().nullable(),
  isActive: z.boolean().optional(),
});

// GET /api/catalog/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const itemId = parseInt(id, 10);
    if (isNaN(itemId)) throw new APIError(400, 'bad_request', 'Invalid ID');

    const [item] = await db
      .select()
      .from(catalogItems)
      .where(eq(catalogItems.id, itemId))
      .limit(1);

    if (!item) throw new APIError(404, 'not_found', 'Catalog item not found');

    return NextResponse.json({ catalogItem: item });
  } catch (error) {
    return handleAPIError(error);
  }
}

// PATCH /api/catalog/[id] — Admin only
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireRole(session, 'Admin');

    const { id } = await params;
    const itemId = parseInt(id, 10);
    if (isNaN(itemId)) throw new APIError(400, 'bad_request', 'Invalid ID');

    const [existing] = await db
      .select()
      .from(catalogItems)
      .where(eq(catalogItems.id, itemId))
      .limit(1);
    if (!existing) throw new APIError(404, 'not_found', 'Catalog item not found');

    const body = await req.json();
    const data = updateCatalogItemSchema.parse(body);

    const updates: Partial<typeof catalogItems.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (data.title !== undefined) updates.title = data.title;
    if (data.description !== undefined) updates.description = data.description;
    if (data.category !== undefined) updates.category = data.category;
    if (data.estimatedSLAHours !== undefined) updates.estimatedSLAHours = data.estimatedSLAHours;
    if (data.eligibleRoles !== undefined) updates.eligibleRoles = JSON.stringify(data.eligibleRoles);
    if ('icon' in data) updates.icon = data.icon ?? null;
    if (data.isActive !== undefined) updates.isActive = data.isActive;

    const [updated] = await db
      .update(catalogItems)
      .set(updates)
      .where(eq(catalogItems.id, itemId))
      .returning();

    return NextResponse.json({ catalogItem: updated });
  } catch (error) {
    return handleAPIError(error);
  }
}

// DELETE /api/catalog/[id] — Admin only (soft delete: set isActive=false)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireRole(session, 'Admin');

    const { id } = await params;
    const itemId = parseInt(id, 10);
    if (isNaN(itemId)) throw new APIError(400, 'bad_request', 'Invalid ID');

    const [existing] = await db
      .select()
      .from(catalogItems)
      .where(eq(catalogItems.id, itemId))
      .limit(1);
    if (!existing) throw new APIError(404, 'not_found', 'Catalog item not found');

    await db
      .update(catalogItems)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(catalogItems.id, itemId));

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAPIError(error);
  }
}
