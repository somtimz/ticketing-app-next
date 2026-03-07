import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { approvalSteps, serviceRequests, users } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { requireRole, APIError, handleAPIError } from '@/lib/api-error';
import { hasRole } from '@/lib/rbac';
import { z } from 'zod';

const addApprovalStepSchema = z.object({
  approverId: z.number().int().positive('approverId is required'),
  stepOrder: z.number().int().positive().optional(),
  notes: z.string().max(2000).optional(),
});

// GET /api/service-requests/[id]/approval-steps
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) throw new APIError(401, 'unauthorized', 'You must be logged in');

    const { id } = await params;
    const srId = parseInt(id, 10);
    if (isNaN(srId)) throw new APIError(400, 'bad_request', 'Invalid ID');

    // Verify SR exists and user can access it
    const [sr] = await db
      .select({ id: serviceRequests.id, requesterId: serviceRequests.requesterId })
      .from(serviceRequests)
      .where(eq(serviceRequests.id, srId))
      .limit(1);
    if (!sr) throw new APIError(404, 'not_found', 'Service request not found');

    const userId = parseInt(session.user.id, 10);
    if (!hasRole(session, 'Agent') && sr.requesterId !== userId) {
      throw new APIError(403, 'forbidden', 'Access denied');
    }

    const steps = await db
      .select({
        id: approvalSteps.id,
        serviceRequestId: approvalSteps.serviceRequestId,
        stepOrder: approvalSteps.stepOrder,
        approverId: approvalSteps.approverId,
        status: approvalSteps.status,
        respondedAt: approvalSteps.respondedAt,
        notes: approvalSteps.notes,
        createdAt: approvalSteps.createdAt,
        approver: { id: users.id, fullName: users.fullName, email: users.email, role: users.role },
      })
      .from(approvalSteps)
      .innerJoin(users, eq(approvalSteps.approverId, users.id))
      .where(eq(approvalSteps.serviceRequestId, srId))
      .orderBy(asc(approvalSteps.stepOrder));

    return NextResponse.json({ approvalSteps: steps });
  } catch (error) {
    return handleAPIError(error);
  }
}

// POST /api/service-requests/[id]/approval-steps — TeamLead+
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireRole(session, 'TeamLead');

    const { id } = await params;
    const srId = parseInt(id, 10);
    if (isNaN(srId)) throw new APIError(400, 'bad_request', 'Invalid ID');

    const [sr] = await db
      .select({ id: serviceRequests.id })
      .from(serviceRequests)
      .where(eq(serviceRequests.id, srId))
      .limit(1);
    if (!sr) throw new APIError(404, 'not_found', 'Service request not found');

    const body = await req.json();
    const data = addApprovalStepSchema.parse(body);

    // Verify approver exists
    const [approver] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, data.approverId))
      .limit(1);
    if (!approver) throw new APIError(400, 'bad_request', 'Approver not found');

    // Determine step order: default to next available
    let stepOrder = data.stepOrder;
    if (!stepOrder) {
      const existing = await db
        .select({ stepOrder: approvalSteps.stepOrder })
        .from(approvalSteps)
        .where(eq(approvalSteps.serviceRequestId, srId))
        .orderBy(asc(approvalSteps.stepOrder));
      stepOrder = existing.length > 0
        ? existing[existing.length - 1].stepOrder + 1
        : 1;
    }

    const [step] = await db
      .insert(approvalSteps)
      .values({
        serviceRequestId: srId,
        stepOrder,
        approverId: data.approverId,
        status: 'Pending',
        notes: data.notes ?? null,
      })
      .returning();

    return NextResponse.json({ approvalStep: step }, { status: 201 });
  } catch (error) {
    return handleAPIError(error);
  }
}
