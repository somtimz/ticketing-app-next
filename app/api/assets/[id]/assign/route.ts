import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { assets, assetHistory } from '@/lib/db/schema';
import { eq, isNull, and } from 'drizzle-orm';
import { requireRole, APIError, handleAPIError } from '@/lib/api-error';
import { assignAssetSchema } from '@/lib/validators';

// POST /api/assets/[id]/assign
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireRole(session, 'Agent');

    const { id } = await params;
    const assetId = parseInt(id, 10);
    if (isNaN(assetId)) throw new APIError(400, 'bad_request', 'Invalid asset ID');

    const [existing] = await db.select().from(assets).where(eq(assets.id, assetId)).limit(1);
    if (!existing) throw new APIError(404, 'not_found', 'Asset not found');
    if (existing.status === 'Retired') throw new APIError(400, 'bad_request', 'Cannot assign a retired asset');

    const body = await req.json();
    const data = assignAssetSchema.parse(body);
    const agentId = parseInt(session!.user.id, 10);

    // Close previous open history entry if any
    if (existing.assignedUserId) {
      await db
        .update(assetHistory)
        .set({ returnedAt: new Date() })
        .where(and(eq(assetHistory.assetId, assetId), isNull(assetHistory.returnedAt)));
    }

    // Create new history entry
    await db.insert(assetHistory).values({
      assetId,
      assignedToUserId: data.userId,
      assignedByUserId: agentId,
      notes: data.notes ?? null
    });

    const [updated] = await db
      .update(assets)
      .set({ assignedUserId: data.userId, updatedAt: new Date() })
      .where(eq(assets.id, assetId))
      .returning();

    return NextResponse.json({ asset: updated });
  } catch (error) {
    return handleAPIError(error);
  }
}
