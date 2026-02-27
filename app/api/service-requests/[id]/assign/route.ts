import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { serviceRequests } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireRole, APIError, handleAPIError } from '@/lib/api-error';
import { assignServiceRequestSchema } from '@/lib/validators';

// POST /api/service-requests/[id]/assign
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

    const [sr] = await db.select({ id: serviceRequests.id }).from(serviceRequests).where(eq(serviceRequests.id, srId)).limit(1);
    if (!sr) throw new APIError(404, 'not_found', 'Service request not found');

    const body = await req.json();
    const data = assignServiceRequestSchema.parse(body);

    const [updated] = await db
      .update(serviceRequests)
      .set({ assignedAgentId: data.agentId, updatedAt: new Date() })
      .where(eq(serviceRequests.id, srId))
      .returning();

    return NextResponse.json({ serviceRequest: updated });
  } catch (error) {
    return handleAPIError(error);
  }
}
