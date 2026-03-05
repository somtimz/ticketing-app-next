import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { catalogItems } from '@/lib/db/schema';
import { eq, ilike, or } from 'drizzle-orm';
import { requireRole, handleAPIError } from '@/lib/api-error';
import { z } from 'zod';

const SERVICE_REQUEST_CATEGORIES = [
  'New Equipment',
  'Software Access',
  'Account Setup',
  'Hardware Repair',
  'Other',
] as const;

const createCatalogItemSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required').max(2000),
  category: z.enum(SERVICE_REQUEST_CATEGORIES),
  estimatedSLAHours: z.number().int().positive().default(24),
  eligibleRoles: z.array(z.string()).default([]),
  icon: z.string().max(10).optional(),
  isActive: z.boolean().default(true),
});

// GET /api/catalog
// Public (no auth required). Query param: q for text search.
// Returns items grouped by category.
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const q = searchParams.get('q')?.trim();

    let query = db
      .select()
      .from(catalogItems)
      .where(eq(catalogItems.isActive, true));

    const rows = await query;

    let filtered = rows;
    if (q) {
      const lower = q.toLowerCase();
      filtered = rows.filter(
        item =>
          item.title.toLowerCase().includes(lower) ||
          item.description.toLowerCase().includes(lower) ||
          item.category.toLowerCase().includes(lower)
      );
    }

    // Group by category
    const grouped: Record<string, typeof filtered> = {};
    for (const item of filtered) {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    }

    return NextResponse.json({ catalogItems: filtered, grouped });
  } catch (error) {
    return handleAPIError(error);
  }
}

// POST /api/catalog — Admin only
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    requireRole(session, 'Admin');

    const body = await req.json();
    const data = createCatalogItemSchema.parse(body);

    const [item] = await db
      .insert(catalogItems)
      .values({
        title: data.title,
        description: data.description,
        category: data.category,
        estimatedSLAHours: data.estimatedSLAHours,
        eligibleRoles: JSON.stringify(data.eligibleRoles),
        icon: data.icon ?? null,
        isActive: data.isActive,
      })
      .returning();

    return NextResponse.json({ catalogItem: item }, { status: 201 });
  } catch (error) {
    return handleAPIError(error);
  }
}
