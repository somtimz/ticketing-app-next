import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { assets } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireRole, APIError, handleAPIError } from '@/lib/api-error';

// POST /api/assets/[id]/retire
export async function POST(
  _req: NextRequest,
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
    if (existing.status === 'Retired') throw new APIError(400, 'bad_request', 'Asset is already retired');

    const [updated] = await db
      .update(assets)
      .set({ status: 'Retired', assignedUserId: null, updatedAt: new Date() })
      .where(eq(assets.id, assetId))
      .returning();

    return NextResponse.json({ asset: updated });
  } catch (error) {
    return handleAPIError(error);
  }
}
