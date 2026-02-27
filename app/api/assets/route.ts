import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { assets, users } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { requireAuth, requireRole, handleAPIError } from '@/lib/api-error';
import { hasRole } from '@/lib/rbac';
import { createAssetSchema } from '@/lib/validators';

// GET /api/assets
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    requireAuth(session);
    const userId = parseInt(session!.user.id, 10);
    const isAgent = hasRole(session, 'Agent');

    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    const rows = await db
      .select({
        id: assets.id,
        assetTag: assets.assetTag,
        name: assets.name,
        type: assets.type,
        make: assets.make,
        model: assets.model,
        status: assets.status,
        location: assets.location,
        cost: assets.cost,
        purchaseDate: assets.purchaseDate,
        warrantyExpiry: assets.warrantyExpiry,
        createdAt: assets.createdAt,
        assignedUser: {
          id: users.id,
          fullName: users.fullName,
          email: users.email
        }
      })
      .from(assets)
      .leftJoin(users, eq(assets.assignedUserId, users.id))
      .where(
        !isAgent
          ? eq(assets.assignedUserId, userId)
          : sql`1=1`
      )
      .orderBy(desc(assets.createdAt));

    const filtered = rows
      .filter(a => !type || a.type === type)
      .filter(a => !status || a.status === status);

    return NextResponse.json({ assets: filtered });
  } catch (error) {
    return handleAPIError(error);
  }
}

// POST /api/assets
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    requireRole(session, 'Agent');

    const body = await req.json();
    const data = createAssetSchema.parse(body);

    // Generate asset tag
    const countResult = await db.select({ id: assets.id }).from(assets);
    const sequence = String(countResult.length + 1).padStart(4, '0');
    const assetTag = `AST-${sequence}`;

    const [asset] = await db
      .insert(assets)
      .values({
        assetTag,
        name: data.name,
        type: data.type,
        make: data.make ?? null,
        model: data.model ?? null,
        serialNumber: data.serialNumber ?? null,
        location: data.location ?? null,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
        cost: data.cost ?? null,
        assignedUserId: data.assignedUserId ?? parseInt(session!.user.id, 10),
        status: 'Active'
      })
      .returning();

    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    return handleAPIError(error);
  }
}
