import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { assets, assetHistory, users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAuth, APIError, handleAPIError } from '@/lib/api-error';
import { hasRole } from '@/lib/rbac';
import { updateAssetSchema } from '@/lib/validators';

async function getAsset(id: number) {
  const [asset] = await db
    .select({
      id: assets.id,
      assetTag: assets.assetTag,
      name: assets.name,
      type: assets.type,
      make: assets.make,
      model: assets.model,
      serialNumber: assets.serialNumber,
      status: assets.status,
      location: assets.location,
      cost: assets.cost,
      purchaseDate: assets.purchaseDate,
      warrantyExpiry: assets.warrantyExpiry,
      createdAt: assets.createdAt,
      updatedAt: assets.updatedAt,
      assignedUserId: assets.assignedUserId,
      assignedUser: {
        id: users.id,
        fullName: users.fullName,
        email: users.email
      }
    })
    .from(assets)
    .leftJoin(users, eq(assets.assignedUserId, users.id))
    .where(eq(assets.id, id))
    .limit(1);
  return asset ?? null;
}

// GET /api/assets/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireAuth(session);
    const { id } = await params;
    const assetId = parseInt(id, 10);
    if (isNaN(assetId)) throw new APIError(400, 'bad_request', 'Invalid asset ID');

    const asset = await getAsset(assetId);
    if (!asset) throw new APIError(404, 'not_found', 'Asset not found');

    const userId = parseInt(session!.user.id, 10);
    const isAgent = hasRole(session, 'Agent');
    if (!isAgent && asset.assignedUserId !== userId) {
      throw new APIError(403, 'forbidden', 'Access denied');
    }

    // Fetch history
    const history = await db
      .select({
        id: assetHistory.id,
        assignedAt: assetHistory.assignedAt,
        returnedAt: assetHistory.returnedAt,
        notes: assetHistory.notes,
        assignedTo: { id: users.id, fullName: users.fullName }
      })
      .from(assetHistory)
      .leftJoin(users, eq(assetHistory.assignedToUserId, users.id))
      .where(eq(assetHistory.assetId, assetId))
      .orderBy(desc(assetHistory.assignedAt));

    return NextResponse.json({ asset, history });
  } catch (error) {
    return handleAPIError(error);
  }
}

// PATCH /api/assets/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireAuth(session);
    const { id } = await params;
    const assetId = parseInt(id, 10);
    if (isNaN(assetId)) throw new APIError(400, 'bad_request', 'Invalid asset ID');

    const asset = await getAsset(assetId);
    if (!asset) throw new APIError(404, 'not_found', 'Asset not found');

    const userId = parseInt(session!.user.id, 10);
    const isAgent = hasRole(session, 'Agent');
    if (!isAgent && asset.assignedUserId !== userId) {
      throw new APIError(403, 'forbidden', 'Access denied');
    }

    const body = await req.json();
    const data = updateAssetSchema.parse(body);

    // Non-agents cannot change assignedUserId via PATCH — use /assign endpoint instead
    if (!isAgent && data.assignedUserId !== undefined) {
      throw new APIError(403, 'forbidden', 'Use the /assign endpoint to reassign assets');
    }

    const [updated] = await db
      .update(assets)
      .set({
        ...data,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
        warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : undefined,
        updatedAt: new Date()
      })
      .where(eq(assets.id, assetId))
      .returning();

    return NextResponse.json({ asset: updated });
  } catch (error) {
    return handleAPIError(error);
  }
}
