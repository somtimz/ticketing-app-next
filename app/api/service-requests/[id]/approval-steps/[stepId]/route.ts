import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { approvalSteps, serviceRequests } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { APIError, handleAPIError } from '@/lib/api-error';
import { hasRole } from '@/lib/rbac';
import { z } from 'zod';

const respondSchema = z.object({
  action: z.enum(['approve', 'reject']),
  notes: z.string().max(2000).optional(),
});

// PATCH /api/service-requests/[id]/approval-steps/[stepId]
// Auth: only assigned approver OR Admin
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) throw new APIError(401, 'unauthorized', 'You must be logged in');

    const { id, stepId } = await params;
    const srId = parseInt(id, 10);
    const stepIdNum = parseInt(stepId, 10);
    if (isNaN(srId) || isNaN(stepIdNum)) {
      throw new APIError(400, 'bad_request', 'Invalid ID');
    }

    // Fetch the step
    const [step] = await db
      .select()
      .from(approvalSteps)
      .where(
        and(
          eq(approvalSteps.id, stepIdNum),
          eq(approvalSteps.serviceRequestId, srId)
        )
      )
      .limit(1);

    if (!step) throw new APIError(404, 'not_found', 'Approval step not found');
    if (step.status !== 'Pending') {
      throw new APIError(400, 'bad_request', 'This step has already been responded to');
    }

    const userId = parseInt(session.user.id, 10);
    const isAdmin = hasRole(session, 'Admin');
    if (!isAdmin && step.approverId !== userId) {
      throw new APIError(403, 'forbidden', 'Only the assigned approver or an Admin can respond');
    }

    const body = await req.json();
    const data = respondSchema.parse(body);

    const newStatus = data.action === 'approve' ? 'Approved' : 'Rejected';

    const [updated] = await db
      .update(approvalSteps)
      .set({
        status: newStatus,
        respondedAt: new Date(),
        notes: data.notes ?? step.notes,
      })
      .where(eq(approvalSteps.id, stepIdNum))
      .returning();

    // If all steps for this SR are now Approved, promote the SR to 'Approved'
    if (newStatus === 'Approved') {
      const allSteps = await db
        .select({ status: approvalSteps.status })
        .from(approvalSteps)
        .where(eq(approvalSteps.serviceRequestId, srId));

      const allApproved = allSteps.every(s => s.status === 'Approved');
      if (allApproved) {
        await db
          .update(serviceRequests)
          .set({
            status: 'Approved',
            approvedById: userId,
            approvedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(serviceRequests.id, srId));
      }
    }

    // If this step was rejected, optionally surface the rejection to the SR
    if (newStatus === 'Rejected') {
      await db
        .update(serviceRequests)
        .set({
          status: 'Rejected',
          rejectionReason: data.notes ?? 'Rejected via approval step',
          updatedAt: new Date(),
        })
        .where(eq(serviceRequests.id, srId));
    }

    return NextResponse.json({ approvalStep: updated });
  } catch (error) {
    return handleAPIError(error);
  }
}
