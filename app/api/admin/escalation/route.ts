import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { escalationRules } from '@/lib/db/schema';

import { z } from 'zod';
import type { ApiErrorResponse } from '@/types';

const createEscalationRuleSchema = z.object({
  name: z.string().min(1).max(200),
  priority: z.enum(['P1', 'P2', 'P3', 'P4']),
  minutesBeforeBreach: z.number().int(),
  action: z.enum(['notify_teamlead', 'notify_admin', 'reassign']),
  reassignToAgentId: z.number().int().positive().optional().nullable()
});

// GET /api/admin/escalation - List all escalation rules
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json<ApiErrorResponse>({ error: 'Unauthorized' }, { status: 401 });
  }

  const userRole = session.user.role as string;
  if (!['TeamLead', 'Admin'].includes(userRole)) {
    return NextResponse.json<ApiErrorResponse>({ error: 'Forbidden' }, { status: 403 });
  }

  const rules = await db
    .select()
    .from(escalationRules)
    .orderBy(escalationRules.priority, escalationRules.minutesBeforeBreach);

  return NextResponse.json({ rules });
}

// POST /api/admin/escalation - Create a new escalation rule
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json<ApiErrorResponse>({ error: 'Unauthorized' }, { status: 401 });
  }

  const userRole = session.user.role as string;
  if (userRole !== 'Admin') {
    return NextResponse.json<ApiErrorResponse>({ error: 'Forbidden — Admin only' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = createEscalationRuleSchema.parse(body);

    const [rule] = await db.insert(escalationRules).values(data).returning();

    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json<ApiErrorResponse>(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating escalation rule:', error);
    return NextResponse.json<ApiErrorResponse>({ error: 'Failed to create rule' }, { status: 500 });
  }
}
