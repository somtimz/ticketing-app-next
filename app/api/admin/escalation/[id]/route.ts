import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { escalationRules } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { ApiErrorResponse } from '@/types';

const updateEscalationRuleSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  priority: z.enum(['P1', 'P2', 'P3', 'P4']).optional(),
  minutesBeforeBreach: z.number().int().optional(),
  action: z.enum(['notify_teamlead', 'notify_admin', 'reassign']).optional(),
  reassignToAgentId: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional()
});

// PATCH /api/admin/escalation/[id] - Update escalation rule
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json<ApiErrorResponse>({ error: 'Unauthorized' }, { status: 401 });
  }

  const userRole = session.user.role as string;
  if (userRole !== 'Admin') {
    return NextResponse.json<ApiErrorResponse>({ error: 'Forbidden — Admin only' }, { status: 403 });
  }

  const { id } = await params;
  const ruleId = parseInt(id, 10);
  if (isNaN(ruleId)) {
    return NextResponse.json<ApiErrorResponse>({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const data = updateEscalationRuleSchema.parse(body);

    const [updated] = await db
      .update(escalationRules)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(escalationRules.id, ruleId))
      .returning();

    if (!updated) {
      return NextResponse.json<ApiErrorResponse>({ error: 'Rule not found' }, { status: 404 });
    }

    return NextResponse.json({ rule: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json<ApiErrorResponse>(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating escalation rule:', error);
    return NextResponse.json<ApiErrorResponse>({ error: 'Failed to update rule' }, { status: 500 });
  }
}

// DELETE /api/admin/escalation/[id] - Delete escalation rule
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json<ApiErrorResponse>({ error: 'Unauthorized' }, { status: 401 });
  }

  const userRole = session.user.role as string;
  if (userRole !== 'Admin') {
    return NextResponse.json<ApiErrorResponse>({ error: 'Forbidden — Admin only' }, { status: 403 });
  }

  const { id } = await params;
  const ruleId = parseInt(id, 10);
  if (isNaN(ruleId)) {
    return NextResponse.json<ApiErrorResponse>({ error: 'Invalid ID' }, { status: 400 });
  }

  const [deleted] = await db
    .delete(escalationRules)
    .where(eq(escalationRules.id, ruleId))
    .returning();

  if (!deleted) {
    return NextResponse.json<ApiErrorResponse>({ error: 'Rule not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
