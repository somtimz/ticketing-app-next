import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { responseTemplates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { APIError, requireRole, handleAPIError } from '@/lib/api-error';
import { hasRole } from '@/lib/rbac';

const patchTemplateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(10000).optional(),
  category: z.string().max(100).nullable().optional(),
  isGlobal: z.boolean().optional()
});

async function getTemplateOrThrow(id: number) {
  const [template] = await db
    .select()
    .from(responseTemplates)
    .where(eq(responseTemplates.id, id))
    .limit(1);
  if (!template) throw new APIError(404, 'not_found', 'Template not found');
  return template;
}

// DELETE /api/templates/[id] — Agent+ (own); Admin can delete any
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireRole(session, 'Agent');

    const { id } = await params;
    const templateId = Number.parseInt(id, 10);
    if (Number.isNaN(templateId)) throw new APIError(400, 'invalid_id', 'Invalid template ID');

    const template = await getTemplateOrThrow(templateId);
    const userId = Number.parseInt(session!.user.id, 10);
    const isAdmin = hasRole(session, 'Admin');

    if (!isAdmin && template.createdById !== userId) {
      throw new APIError(403, 'forbidden', 'You can only delete your own templates');
    }

    await db.delete(responseTemplates).where(eq(responseTemplates.id, templateId));
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAPIError(error);
  }
}

// PATCH /api/templates/[id] — Agent+ (own); Admin can edit any
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireRole(session, 'Agent');

    const { id } = await params;
    const templateId = Number.parseInt(id, 10);
    if (Number.isNaN(templateId)) throw new APIError(400, 'invalid_id', 'Invalid template ID');

    const template = await getTemplateOrThrow(templateId);
    const userId = Number.parseInt(session!.user.id, 10);
    const isAdmin = hasRole(session, 'Admin');

    if (!isAdmin && template.createdById !== userId) {
      throw new APIError(403, 'forbidden', 'You can only edit your own templates');
    }

    const body = await req.json();
    const validated = patchTemplateSchema.parse(body);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (validated.title !== undefined) updateData.title = validated.title;
    if (validated.body !== undefined) updateData.body = validated.body;
    if (validated.category !== undefined) updateData.category = validated.category;
    if (validated.isGlobal !== undefined) updateData.isGlobal = validated.isGlobal;

    const [updated] = await db
      .update(responseTemplates)
      .set(updateData)
      .where(eq(responseTemplates.id, templateId))
      .returning();

    return NextResponse.json({ template: updated });
  } catch (error) {
    return handleAPIError(error);
  }
}
