import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { responseTemplates, users } from '@/lib/db/schema';
import { eq, or } from 'drizzle-orm';
import { requireRole, handleAPIError } from '@/lib/api-error';

const createTemplateSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(10000),
  category: z.string().max(100).optional(),
  isGlobal: z.boolean().optional().default(false)
});

// GET /api/templates — Agent+
// ?mine=true → only current user's templates
// otherwise → isGlobal=true + own templates
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    requireRole(session, 'Agent');

    const userId = Number.parseInt(session!.user.id, 10);
    const mine = req.nextUrl.searchParams.get('mine') === 'true';

    let rows;
    if (mine) {
      rows = await db
        .select({
          id: responseTemplates.id,
          title: responseTemplates.title,
          body: responseTemplates.body,
          category: responseTemplates.category,
          isGlobal: responseTemplates.isGlobal,
          createdAt: responseTemplates.createdAt,
          createdBy: { id: users.id, fullName: users.fullName }
        })
        .from(responseTemplates)
        .innerJoin(users, eq(responseTemplates.createdById, users.id))
        .where(eq(responseTemplates.createdById, userId));
    } else {
      rows = await db
        .select({
          id: responseTemplates.id,
          title: responseTemplates.title,
          body: responseTemplates.body,
          category: responseTemplates.category,
          isGlobal: responseTemplates.isGlobal,
          createdAt: responseTemplates.createdAt,
          createdBy: { id: users.id, fullName: users.fullName }
        })
        .from(responseTemplates)
        .innerJoin(users, eq(responseTemplates.createdById, users.id))
        .where(or(eq(responseTemplates.isGlobal, true), eq(responseTemplates.createdById, userId)));
    }

    return NextResponse.json({ templates: rows });
  } catch (error) {
    return handleAPIError(error);
  }
}

// POST /api/templates — Agent+
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    requireRole(session, 'Agent');

    const userId = Number.parseInt(session!.user.id, 10);
    const body = await req.json();
    const validated = createTemplateSchema.parse(body);

    const [template] = await db
      .insert(responseTemplates)
      .values({
        title: validated.title,
        body: validated.body,
        category: validated.category ?? null,
        isGlobal: validated.isGlobal ?? false,
        createdById: userId
      })
      .returning();

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    return handleAPIError(error);
  }
}
