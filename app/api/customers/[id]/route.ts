import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { customers, tickets, serviceRequests } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireRole, APIError, handleAPIError } from '@/lib/api-error';
import { updateCustomerSchema } from '@/lib/validators';

// GET /api/customers/[id] — customer detail with linked tickets and SRs
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireRole(session, 'Agent');

    const { id } = await params;
    const customerId = parseInt(id, 10);
    if (isNaN(customerId)) throw new APIError(400, 'bad_request', 'Invalid customer ID');

    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    if (!customer) throw new APIError(404, 'not_found', 'Customer not found');

    const linkedTickets = await db
      .select({
        id: tickets.id,
        ticketNumber: tickets.ticketNumber,
        title: tickets.title,
        status: tickets.status,
        priority: tickets.priority,
        createdAt: tickets.createdAt
      })
      .from(tickets)
      .where(eq(tickets.customerId, customerId))
      .orderBy(desc(tickets.createdAt))
      .limit(20);

    const linkedServiceRequests = await db
      .select({
        id: serviceRequests.id,
        requestNumber: serviceRequests.requestNumber,
        title: serviceRequests.title,
        status: serviceRequests.status,
        category: serviceRequests.category,
        createdAt: serviceRequests.createdAt
      })
      .from(serviceRequests)
      .where(eq(serviceRequests.customerId, customerId))
      .orderBy(desc(serviceRequests.createdAt))
      .limit(20);

    return NextResponse.json({ customer, tickets: linkedTickets, serviceRequests: linkedServiceRequests });
  } catch (error) {
    return handleAPIError(error);
  }
}

// PATCH /api/customers/[id] — update customer
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireRole(session, 'Agent');

    const { id } = await params;
    const customerId = parseInt(id, 10);
    if (isNaN(customerId)) throw new APIError(400, 'bad_request', 'Invalid customer ID');

    const [existing] = await db.select({ id: customers.id }).from(customers).where(eq(customers.id, customerId)).limit(1);
    if (!existing) throw new APIError(404, 'not_found', 'Customer not found');

    const body = await req.json();
    const data = updateCustomerSchema.parse(body);

    const [updated] = await db
      .update(customers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(customers.id, customerId))
      .returning();

    return NextResponse.json({ customer: updated });
  } catch (error) {
    return handleAPIError(error);
  }
}
