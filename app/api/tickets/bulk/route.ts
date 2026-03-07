import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { tickets } from '@/lib/db/schema';
import { inArray, eq, and, sql } from 'drizzle-orm';
import { requireRole, handleAPIError } from '@/lib/api-error';

const VALID_STATUSES = ['New', 'Assigned', 'InProgress', 'On Hold', 'Resolved', 'Closed'] as const;
type TicketStatus = typeof VALID_STATUSES[number];

const VALID_PRIORITIES = ['P1', 'P2', 'P3', 'P4'] as const;
type TicketPriority = typeof VALID_PRIORITIES[number];

// POST /api/tickets/bulk - Bulk update tickets (Agent+ only)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    requireRole(session, 'Agent');

    const body = await req.json() as {
      ids: number[];
      action: 'assign' | 'status' | 'priority';
      value: string;
    };

    const { ids, action, value } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'validation_error', message: 'ids must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!['assign', 'status', 'priority'].includes(action)) {
      return NextResponse.json(
        { error: 'validation_error', message: 'action must be assign, status, or priority' },
        { status: 400 }
      );
    }

    if (!value) {
      return NextResponse.json(
        { error: 'validation_error', message: 'value is required' },
        { status: 400 }
      );
    }

    let updated = 0;

    if (action === 'assign') {
      const agentId = parseInt(value, 10);
      if (isNaN(agentId)) {
        return NextResponse.json(
          { error: 'validation_error', message: 'value must be a valid agent id for assign action' },
          { status: 400 }
        );
      }

      // For tickets currently 'New', also set status to 'Assigned'
      // Update all selected tickets: set assignedAgentId, and set status to 'Assigned' if currently 'New'
      const result = await db
        .update(tickets)
        .set({
          assignedAgentId: agentId,
          status: sql`CASE WHEN ${tickets.status} = 'New' THEN 'Assigned' ELSE ${tickets.status} END`,
          updatedAt: new Date()
        })
        .where(inArray(tickets.id, ids))
        .returning({ id: tickets.id });

      updated = result.length;
    } else if (action === 'status') {
      if (!(VALID_STATUSES as readonly string[]).includes(value)) {
        return NextResponse.json(
          { error: 'validation_error', message: `status must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 400 }
        );
      }

      const statusValue = value as TicketStatus;
      const updateData: Record<string, unknown> = {
        status: statusValue,
        updatedAt: new Date()
      };

      if (statusValue === 'Resolved') {
        updateData.resolvedAt = new Date();
      } else if (statusValue === 'Closed') {
        updateData.closedAt = new Date();
      }

      const result = await db
        .update(tickets)
        .set(updateData as any)
        .where(inArray(tickets.id, ids))
        .returning({ id: tickets.id });

      updated = result.length;
    } else if (action === 'priority') {
      if (!(VALID_PRIORITIES as readonly string[]).includes(value)) {
        return NextResponse.json(
          { error: 'validation_error', message: `priority must be one of: ${VALID_PRIORITIES.join(', ')}` },
          { status: 400 }
        );
      }

      const result = await db
        .update(tickets)
        .set({
          priority: value as TicketPriority,
          updatedAt: new Date()
        })
        .where(inArray(tickets.id, ids))
        .returning({ id: tickets.id });

      updated = result.length;
    }

    return NextResponse.json({ updated });
  } catch (error) {
    return handleAPIError(error);
  }
}
