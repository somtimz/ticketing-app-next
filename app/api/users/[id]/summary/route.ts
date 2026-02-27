import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { assets, tickets, serviceRequests } from '@/lib/db/schema';
import { eq, and, ne, notInArray } from 'drizzle-orm';
import { requireAuth, APIError, handleAPIError } from '@/lib/api-error';
import { hasRole } from '@/lib/rbac';

// GET /api/users/[id]/summary
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireAuth(session);
    const { id } = await params;
    const targetId = parseInt(id, 10);
    if (isNaN(targetId)) throw new APIError(400, 'bad_request', 'Invalid user ID');

    const sessionUserId = parseInt(session!.user.id, 10);
    // Can only view own profile or Agent+ can view anyone
    if (targetId !== sessionUserId && !hasRole(session, 'Agent')) {
      throw new APIError(403, 'forbidden', 'Access denied');
    }

    const [userAssets, openTickets, openRequests] = await Promise.all([
      db
        .select({ id: assets.id, assetTag: assets.assetTag, name: assets.name, type: assets.type, status: assets.status })
        .from(assets)
        .where(eq(assets.assignedUserId, targetId)),
      db
        .select({ id: tickets.id, ticketNumber: tickets.ticketNumber, title: tickets.title, status: tickets.status, priority: tickets.priority, createdAt: tickets.createdAt })
        .from(tickets)
        .where(and(eq(tickets.createdBy, targetId), ne(tickets.status, 'Closed'))),
      db
        .select({ id: serviceRequests.id, requestNumber: serviceRequests.requestNumber, title: serviceRequests.title, status: serviceRequests.status, priority: serviceRequests.priority, createdAt: serviceRequests.createdAt })
        .from(serviceRequests)
        .where(and(eq(serviceRequests.requesterId, targetId), notInArray(serviceRequests.status, ['Fulfilled', 'Rejected'])))
    ]);

    return NextResponse.json({ assets: userAssets, openTickets, openRequests });
  } catch (error) {
    return handleAPIError(error);
  }
}
