import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { kbTags } from '@/lib/db/schema';
import { asc, eq } from 'drizzle-orm';
import { requireAuth, requireRole, handleAPIError } from '@/lib/api-error';

// GET /api/kb/tags — list all tags (any authenticated user)
export async function GET() {
  try {
    const session = await auth();
    requireAuth(session);

    const tags = await db
      .select({ id: kbTags.id, name: kbTags.name })
      .from(kbTags)
      .orderBy(asc(kbTags.name));

    return NextResponse.json({ tags });
  } catch (error) {
    return handleAPIError(error);
  }
}

// POST /api/kb/tags — create a new tag (Agent+), idempotent on name
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    requireRole(session, 'Agent');

    const { name } = await req.json() as { name?: string };
    if (!name?.trim()) {
      return NextResponse.json({ error: 'bad_request', message: 'Tag name is required' }, { status: 400 });
    }

    const trimmed = name.trim().toLowerCase();

    // Return existing tag if name already taken (idempotent)
    const [existing] = await db
      .select({ id: kbTags.id, name: kbTags.name })
      .from(kbTags)
      .where(eq(kbTags.name, trimmed));

    if (existing) return NextResponse.json(existing, { status: 200 });

    const [tag] = await db
      .insert(kbTags)
      .values({ name: trimmed })
      .returning({ id: kbTags.id, name: kbTags.name });

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    return handleAPIError(error);
  }
}
