import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { slaPolicies } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, requireRole, handleAPIError, APIError } from '@/lib/api-error';
import { z } from 'zod';

const updateSLAPolicySchema = z.object({
  priority: z.enum(['P1', 'P2', 'P3', 'P4']),
  firstResponseMinutes: z.number().int().positive(),
  resolutionMinutes: z.number().int().positive(),
});

// GET /api/sla-policies - List all SLA policies
export async function GET() {
  try {
    const session = await auth();
    requireAuth(session);

    const results = await db
      .select()
      .from(slaPolicies)
      .orderBy(slaPolicies.priority);

    return NextResponse.json({ policies: results });
  } catch (error) {
    return handleAPIError(error);
  }
}

// PUT /api/sla-policies - Update an SLA policy (Admin only)
export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    requireRole(session, 'Admin');

    const body = await req.json();
    const data = updateSLAPolicySchema.parse(body);

    // Check if policy exists
    const existing = await db
      .select()
      .from(slaPolicies)
      .where(eq(slaPolicies.priority, data.priority))
      .limit(1);

    if (existing.length) {
      // Update existing
      const result = await db
        .update(slaPolicies)
        .set({
          firstResponseMinutes: data.firstResponseMinutes,
          resolutionMinutes: data.resolutionMinutes,
          updatedAt: new Date(),
        })
        .where(eq(slaPolicies.priority, data.priority))
        .returning();

      return NextResponse.json(result[0]);
    } else {
      // Create new
      const result = await db
        .insert(slaPolicies)
        .values({
          priority: data.priority,
          firstResponseMinutes: data.firstResponseMinutes,
          resolutionMinutes: data.resolutionMinutes,
        })
        .returning();

      return NextResponse.json(result[0], { status: 201 });
    }
  } catch (error) {
    return handleAPIError(error);
  }
}
