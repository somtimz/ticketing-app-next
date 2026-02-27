import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { serviceRequests, serviceRequestComments, users } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { requireAuth, APIError, handleAPIError } from '@/lib/api-error';
import { hasRole } from '@/lib/rbac';
import { addServiceRequestCommentSchema } from '@/lib/validators';

// GET /api/service-requests/[id]/comments
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

    const [sr] = await db.select({ requesterId: serviceRequests.requesterId }).from(serviceRequests).where(eq(serviceRequests.id, srId)).limit(1);
    if (!sr) throw new APIError(404, 'not_found', 'Service request not found');

    const userId = parseInt(session!.user.id, 10);
    if (!hasRole(session, 'Agent') && sr.requesterId !== userId) {
      throw new APIError(403, 'forbidden', 'Access denied');
    }

    const rows = await db
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

    return NextResponse.json({ comments: rows });
  } catch (error) {
    return handleAPIError(error);
  }
}

// POST /api/service-requests/[id]/comments
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

    const [sr] = await db.select({ requesterId: serviceRequests.requesterId }).from(serviceRequests).where(eq(serviceRequests.id, srId)).limit(1);
    if (!sr) throw new APIError(404, 'not_found', 'Service request not found');

    const userId = parseInt(session!.user.id, 10);
    if (!hasRole(session, 'Agent') && sr.requesterId !== userId) {
      throw new APIError(403, 'forbidden', 'Access denied');
    }

    const body = await req.json();
    const data = addServiceRequestCommentSchema.parse(body);

    const [comment] = await db
      .insert(serviceRequestComments)
      .values({ serviceRequestId: srId, body: data.body, authorId: userId })
      .returning();

    await db.update(serviceRequests).set({ updatedAt: new Date() }).where(eq(serviceRequests.id, srId));

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    return handleAPIError(error);
  }
}
