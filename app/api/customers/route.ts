import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { customers } from '@/lib/db/schema';
import { eq, sql, or, ilike } from 'drizzle-orm';
import { requireRole, handleAPIError } from '@/lib/api-error';
import { createCustomerSchema } from '@/lib/validators';

// GET /api/customers — list customers with ticket/SR counts
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    requireRole(session, 'Agent');

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') ?? '';
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);
    const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10), 1);
    const offset = (page - 1) * limit;

    const baseQuery = db
      .select({
        id: customers.id,
        name: customers.name,
        email: customers.email,
        phone: customers.phone,
        company: customers.company,
        notes: customers.notes,
        isActive: customers.isActive,
        createdAt: customers.createdAt,
        ticketCount: sql<number>`(SELECT COUNT(*)::int FROM tickets WHERE customer_id = customers.id)`,
        serviceRequestCount: sql<number>`(SELECT COUNT(*)::int FROM service_requests WHERE customer_id = customers.id)`
      })
      .from(customers);

    const rows = q
      ? await baseQuery
          .where(
            or(
              ilike(customers.name, `%${q}%`),
              ilike(customers.email, `%${q}%`),
              ilike(customers.company, `%${q}%`)
            )
          )
          .limit(limit)
          .offset(offset)
          .orderBy(customers.name)
      : await baseQuery.limit(limit).offset(offset).orderBy(customers.name);

    return NextResponse.json({
      customers: rows,
      pagination: { page, limit, count: rows.length }
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

// POST /api/customers — create a customer
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    requireRole(session, 'Agent');

    const body = await req.json();
    const data = createCustomerSchema.parse(body);

    const [customer] = await db.insert(customers).values({
      ...data,
      email: data.email ?? null,
      phone: data.phone ?? null,
      company: data.company ?? null,
      notes: data.notes ?? null
    }).returning();

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    return handleAPIError(error);
  }
}
