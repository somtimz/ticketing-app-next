import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { serviceRequests, users, catalogItems } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { requireAuth, handleAPIError } from '@/lib/api-error';
import { hasRole } from '@/lib/rbac';
import { createServiceRequestSchema } from '@/lib/validators';
import { sendServiceRequestCreatedEmail } from '@/lib/email';
import { z } from 'zod';

const createSRWithCatalogSchema = createServiceRequestSchema.extend({
  catalogItemId: z.number().int().positive().optional().nullable(),
});

// GET /api/service-requests
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    requireAuth(session);
    const userId = parseInt(session!.user.id, 10);
    const isAgent = hasRole(session, 'Agent');

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status');
    const category = searchParams.get('category');

    const rows = await db
      .select({
        id: serviceRequests.id,
        requestNumber: serviceRequests.requestNumber,
        title: serviceRequests.title,
        category: serviceRequests.category,
        status: serviceRequests.status,
        priority: serviceRequests.priority,
        createdAt: serviceRequests.createdAt,
        updatedAt: serviceRequests.updatedAt,
        approvedAt: serviceRequests.approvedAt,
        fulfilledAt: serviceRequests.fulfilledAt,
        requesterId: serviceRequests.requesterId,
        slaResolutionDue: serviceRequests.slaResolutionDue,
        requester: { id: users.id, fullName: users.fullName, email: users.email }
      })
      .from(serviceRequests)
      .leftJoin(users, eq(serviceRequests.requesterId, users.id))
      .where(!isAgent ? eq(serviceRequests.requesterId, userId) : sql`1=1`)
      .orderBy(desc(serviceRequests.createdAt));

    const filtered = rows
      .filter(r => !status || r.status === status)
      .filter(r => !category || r.category === category);

    return NextResponse.json({ serviceRequests: filtered });
  } catch (error) {
    return handleAPIError(error);
  }
}

// POST /api/service-requests
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    requireAuth(session);

    const body = await req.json();
    const data = createSRWithCatalogSchema.parse(body);

    // Generate request number
    const countResult = await db.select({ id: serviceRequests.id }).from(serviceRequests);
    const sequence = String(countResult.length + 1).padStart(4, '0');
    const requestNumber = `REQ-${sequence}`;

    // Compute slaResolutionDue from catalog item if provided
    let slaResolutionDue: Date | null = null;
    if (data.catalogItemId) {
      const [item] = await db
        .select({ estimatedSLAHours: catalogItems.estimatedSLAHours })
        .from(catalogItems)
        .where(eq(catalogItems.id, data.catalogItemId))
        .limit(1);
      if (item) {
        slaResolutionDue = new Date(Date.now() + item.estimatedSLAHours * 3600 * 1000);
      }
    }

    const [sr] = await db
      .insert(serviceRequests)
      .values({
        requestNumber,
        title: data.title,
        description: data.description,
        category: data.category,
        priority: data.priority,
        requesterId: parseInt(session!.user.id, 10),
        status: 'Submitted',
        catalogItemId: data.catalogItemId ?? null,
        slaResolutionDue,
      })
      .returning();

    // Fire-and-forget email to requester
    const [requester] = await db.select({ email: users.email })
      .from(users).where(eq(users.id, parseInt(session!.user.id, 10)));
    if (requester?.email) {
      void sendServiceRequestCreatedEmail(requester.email, sr.requestNumber, sr.title, sr.category);
    }

    return NextResponse.json({ serviceRequest: sr }, { status: 201 });
  } catch (error) {
    return handleAPIError(error);
  }
}
