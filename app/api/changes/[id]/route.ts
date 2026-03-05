import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { changes, changeApprovals, changeAffectedCIs, changeLinks, users, assets } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { requireRole, handleAPIError, APIError } from '@/lib/api-error';
import { alias } from 'drizzle-orm/pg-core';

const creator = alias(users, 'creator');
const assignee = alias(users, 'assignee');
const approver = alias(users, 'approver');

async function getChange(id: number) {
  const [row] = await db
    .select()
    .from(changes)
    .where(eq(changes.id, id))
    .limit(1);
  return row ?? null;
}

// GET /api/changes/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireRole(session, 'Agent');

    const { id } = await params;
    const changeId = parseInt(id, 10);
    if (isNaN(changeId)) throw new APIError(400, 'bad_request', 'Invalid ID');

    const change = await getChange(changeId);
    if (!change) throw new APIError(404, 'not_found', 'Change not found');

    // Creator & assignee
    const [creatorRow] = await db
      .select({ id: users.id, fullName: users.fullName, email: users.email })
      .from(users)
      .where(eq(users.id, change.createdById))
      .limit(1);

    let assignedAgent = null;
    if (change.assignedAgentId) {
      const [agentRow] = await db
        .select({ id: users.id, fullName: users.fullName, email: users.email })
        .from(users)
        .where(eq(users.id, change.assignedAgentId))
        .limit(1);
      assignedAgent = agentRow ?? null;
    }

    // Approvals
    const approvals = await db
      .select({
        id: changeApprovals.id,
        role: changeApprovals.role,
        status: changeApprovals.status,
        respondedAt: changeApprovals.respondedAt,
        notes: changeApprovals.notes,
        createdAt: changeApprovals.createdAt,
        approverName: users.fullName,
        approverEmail: users.email,
      })
      .from(changeApprovals)
      .leftJoin(users, eq(changeApprovals.approverId, users.id))
      .where(eq(changeApprovals.changeId, changeId))
      .orderBy(asc(changeApprovals.createdAt));

    // Affected CIs
    const affectedCIs = await db
      .select({
        id: changeAffectedCIs.id,
        assetId: changeAffectedCIs.assetId,
        linkedAt: changeAffectedCIs.linkedAt,
        assetTag: assets.assetTag,
        name: assets.name,
        assetType: assets.type,
      })
      .from(changeAffectedCIs)
      .leftJoin(assets, eq(changeAffectedCIs.assetId, assets.id))
      .where(eq(changeAffectedCIs.changeId, changeId))
      .orderBy(asc(changeAffectedCIs.linkedAt));

    return NextResponse.json({
      change: {
        ...change,
        creator: creatorRow ?? null,
        assignedAgent,
        approvals,
        affectedCIs,
      },
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

// PATCH /api/changes/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireRole(session, 'Agent');

    const { id } = await params;
    const changeId = parseInt(id, 10);
    if (isNaN(changeId)) throw new APIError(400, 'bad_request', 'Invalid ID');

    const change = await getChange(changeId);
    if (!change) throw new APIError(404, 'not_found', 'Change not found');

    if (['Completed', 'Failed', 'Cancelled'].includes(change.status)) {
      throw new APIError(422, 'terminal_status', 'Cannot edit a change in a terminal status');
    }

    const body = await req.json() as {
      title?: string;
      description?: string;
      changeType?: string;
      status?: string;
      riskLevel?: string;
      impactLevel?: string;
      implementationPlan?: string;
      backoutPlan?: string;
      scheduledStart?: string | null;
      scheduledEnd?: string | null;
      assignedAgentId?: number | null;
    };

    const VALID_STATUSES = ['Draft', 'Submitted', 'CAB Review', 'Approved', 'Scheduled', 'In Progress', 'Completed', 'Failed', 'Cancelled'];
    if (body.status && !VALID_STATUSES.includes(body.status)) {
      throw new APIError(400, 'bad_request', 'Invalid status');
    }

    const updates: Partial<typeof changes.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (body.title !== undefined) updates.title = body.title.trim();
    if (body.description !== undefined) updates.description = body.description.trim();
    if (body.changeType !== undefined) updates.changeType = body.changeType as typeof changes.changeType._.data;
    if (body.status !== undefined) updates.status = body.status as typeof changes.status._.data;
    if (body.riskLevel !== undefined) updates.riskLevel = body.riskLevel as typeof changes.riskLevel._.data;
    if (body.impactLevel !== undefined) updates.impactLevel = body.impactLevel as typeof changes.impactLevel._.data;
    if (body.implementationPlan !== undefined) updates.implementationPlan = body.implementationPlan?.trim() ?? null;
    if (body.backoutPlan !== undefined) updates.backoutPlan = body.backoutPlan?.trim() ?? null;
    if (body.scheduledStart !== undefined) updates.scheduledStart = body.scheduledStart ? new Date(body.scheduledStart) : null;
    if (body.scheduledEnd !== undefined) updates.scheduledEnd = body.scheduledEnd ? new Date(body.scheduledEnd) : null;
    if ('assignedAgentId' in body) updates.assignedAgentId = body.assignedAgentId ?? null;

    // Set completedAt when transitioning to terminal states
    if (body.status === 'Completed' || body.status === 'Failed') {
      updates.completedAt = new Date();
    }

    const [updated] = await db
      .update(changes)
      .set(updates)
      .where(eq(changes.id, changeId))
      .returning();

    return NextResponse.json({ change: updated });
  } catch (error) {
    return handleAPIError(error);
  }
}

// DELETE /api/changes/[id] — Admin only, only Draft
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireRole(session, 'Admin');

    const { id } = await params;
    const changeId = parseInt(id, 10);
    if (isNaN(changeId)) throw new APIError(400, 'bad_request', 'Invalid ID');

    const change = await getChange(changeId);
    if (!change) throw new APIError(404, 'not_found', 'Change not found');

    if (change.status !== 'Draft') {
      throw new APIError(422, 'not_draft', 'Only Draft changes can be deleted');
    }

    await db.delete(changes).where(eq(changes.id, changeId));
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAPIError(error);
  }
}
