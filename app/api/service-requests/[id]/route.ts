import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { serviceRequests, serviceRequestComments, users, assetLinks, assets } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { requireAuth, APIError, handleAPIError } from '@/lib/api-error';
import { hasRole } from '@/lib/rbac';
import { updateServiceRequestSchema } from '@/lib/validators';

async function getSR(id: number) {
  const [row] = await db
    .select({
      id: serviceRequests.id,
      requestNumber: serviceRequests.requestNumber,
      title: serviceRequests.title,
      description: serviceRequests.description,
      category: serviceRequests.category,
      status: serviceRequests.status,
      priority: serviceRequests.priority,
      rejectionReason: serviceRequests.rejectionReason,
      requesterId: serviceRequests.requesterId,
      assignedAgentId: serviceRequests.assignedAgentId,
      approvedAt: serviceRequests.approvedAt,
      fulfilledAt: serviceRequests.fulfilledAt,
      createdAt: serviceRequests.createdAt,
      updatedAt: serviceRequests.updatedAt
    })
    .from(serviceRequests)
    .where(eq(serviceRequests.id, id))
    .limit(1);
  return row ?? null;
}

// GET /api/service-requests/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireAuth(session);
    const { id } = await params;
    const srId = parseInt(id, 10);
    if (isNaN(srId)) throw new APIError(400, 'bad_request', 'Invalid ID');

    const sr = await getSR(srId);
    if (!sr) throw new APIError(404, 'not_found', 'Service request not found');

    const userId = parseInt(session!.user.id, 10);
    if (!hasRole(session, 'Agent') && sr.requesterId !== userId) {
      throw new APIError(403, 'forbidden', 'Access denied');
    }

    // Requester info
    const [requester] = await db
      .select({ id: users.id, fullName: users.fullName, email: users.email })
      .from(users)
      .where(eq(users.id, sr.requesterId))
      .limit(1);

    // Assigned agent info
    let assignedAgent = null;
    if (sr.assignedAgentId) {
      const [agent] = await db
        .select({ id: users.id, fullName: users.fullName, email: users.email })
        .from(users)
        .where(eq(users.id, sr.assignedAgentId))
        .limit(1);
      assignedAgent = agent ?? null;
    }

    // Comments
    const commentRows = await db
      .select({
        id: serviceRequestComments.id,
        body: serviceRequestComments.body,
        createdAt: serviceRequestComments.createdAt,
        author: { id: users.id, fullName: users.fullName, role: users.role }
      })
      .from(serviceRequestComments)
      .innerJoin(users, eq(serviceRequestComments.authorId, users.id))
      .where(eq(serviceRequestComments.serviceRequestId, srId))
      .orderBy(asc(serviceRequestComments.createdAt));

    // Linked assets
    const linkedAssets = await db
      .select({
        id: assets.id,
        assetTag: assets.assetTag,
        name: assets.name,
        type: assets.type,
        status: assets.status
      })
      .from(assetLinks)
      .innerJoin(assets, eq(assetLinks.assetId, assets.id))
      .where(eq(assetLinks.serviceRequestId, srId));

    return NextResponse.json({ serviceRequest: { ...sr, requester, assignedAgent }, comments: commentRows, linkedAssets });
  } catch (error) {
    return handleAPIError(error);
  }
}

// PATCH /api/service-requests/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireAuth(session);
    const { id } = await params;
    const srId = parseInt(id, 10);
    if (isNaN(srId)) throw new APIError(400, 'bad_request', 'Invalid ID');

    const sr = await getSR(srId);
    if (!sr) throw new APIError(404, 'not_found', 'Service request not found');

    const userId = parseInt(session!.user.id, 10);
    if (!hasRole(session, 'Agent') && sr.requesterId !== userId) {
      throw new APIError(403, 'forbidden', 'Access denied');
    }

    // Only allow edits while Submitted (for non-agents)
    if (!hasRole(session, 'Agent') && sr.status !== 'Submitted') {
      throw new APIError(400, 'bad_request', 'Cannot edit a request that is no longer Submitted');
    }

    const body = await req.json();
    const data = updateServiceRequestSchema.parse(body);

    const [updated] = await db
      .update(serviceRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(serviceRequests.id, srId))
      .returning();

    return NextResponse.json({ serviceRequest: updated });
  } catch (error) {
    return handleAPIError(error);
  }
}
