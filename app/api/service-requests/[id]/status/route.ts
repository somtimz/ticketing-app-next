import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { serviceRequests } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, APIError, handleAPIError } from '@/lib/api-error';
import { hasRole } from '@/lib/rbac';
import { serviceRequestStatusSchema } from '@/lib/validators';

// Valid transitions map
const VALID_TRANSITIONS: Record<string, string[]> = {
  Submitted: ['Approved', 'Rejected'],
  Approved: ['In Progress', 'Rejected'],
  'In Progress': ['Fulfilled', 'Rejected'],
  Fulfilled: [],
  Rejected: []
};

// POST /api/service-requests/[id]/status
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireAuth(session);
    const { id } = await params;
    const srId = parseInt(id, 10);
    if (isNaN(srId)) throw new APIError(400, 'bad_request', 'Invalid ID');

    const [sr] = await db
      .select({ id: serviceRequests.id, status: serviceRequests.status, requesterId: serviceRequests.requesterId })
      .from(serviceRequests)
      .where(eq(serviceRequests.id, srId))
      .limit(1);
    if (!sr) throw new APIError(404, 'not_found', 'Service request not found');

    const userId = parseInt(session!.user.id, 10);
    const isAgent = hasRole(session, 'Agent');

    const body = await req.json();
    const data = serviceRequestStatusSchema.parse(body);

    // Requester can only cancel (set back to Submitted — not implemented here; just block non-agents)
    if (!isAgent && !(sr.requesterId === userId && data.status === 'Submitted')) {
      throw new APIError(403, 'forbidden', 'Only agents can change request status');
    }

    // Validate transition
    const allowed = VALID_TRANSITIONS[sr.status] ?? [];
    if (!allowed.includes(data.status)) {
      throw new APIError(400, 'bad_request', `Cannot transition from ${sr.status} to ${data.status}`);
    }

    const agentId = parseInt(session!.user.id, 10);
    const now = new Date();

    const [updated] = await db
      .update(serviceRequests)
      .set({
        status: data.status,
        rejectionReason: data.status === 'Rejected' ? (data.rejectionReason ?? null) : null,
        approvedById: data.status === 'Approved' ? agentId : undefined,
        approvedAt: data.status === 'Approved' ? now : undefined,
        fulfilledAt: data.status === 'Fulfilled' ? now : undefined,
        updatedAt: now
      })
      .where(eq(serviceRequests.id, srId))
      .returning();

    return NextResponse.json({ serviceRequest: updated });
  } catch (error) {
    return handleAPIError(error);
  }
}
