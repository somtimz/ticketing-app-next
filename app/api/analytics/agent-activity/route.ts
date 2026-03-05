import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { requireRole, handleAPIError } from '@/lib/api-error';
import { db } from '@/lib/db';
import { users, tickets, comments, calls, serviceRequests } from '@/lib/db/schema';
import { eq, gte, inArray, sql, and } from 'drizzle-orm';

/**
 * GET /api/analytics/agent-activity
 * Returns per-agent activity report: tickets resolved, comments, calls, SRs handled.
 *
 * Query params:
 *   - days: lookback window in days (default 30, max 90)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    requireRole(session, 'TeamLead');

    const { searchParams } = new URL(req.url);
    const days = Math.min(Math.max(parseInt(searchParams.get('days') ?? '30', 10) || 30, 7), 90);

    const since = new Date();
    since.setDate(since.getDate() - days);

    // ── All agents ────────────────────────────────────────────────────────────
    const agents = await db
      .select({ id: users.id, fullName: users.fullName, email: users.email, role: users.role })
      .from(users)
      .where(inArray(users.role, ['Agent', 'TeamLead', 'Admin']));

    const agentIds = agents.map(a => a.id);
    if (agentIds.length === 0) {
      return NextResponse.json({ days, since: since.toISOString(), agents: [] });
    }

    // ── Tickets resolved by each agent ────────────────────────────────────────
    const resolvedByAgent = await db
      .select({
        agentId: tickets.assignedAgentId,
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(tickets)
      .where(
        and(
          sql`${tickets.assignedAgentId} IS NOT NULL`,
          gte(tickets.resolvedAt, since),
          sql`${tickets.status} IN ('Resolved', 'Closed')`
        )
      )
      .groupBy(tickets.assignedAgentId);

    // ── Open tickets assigned to each agent ───────────────────────────────────
    const openByAgent = await db
      .select({
        agentId: tickets.assignedAgentId,
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(tickets)
      .where(
        and(
          sql`${tickets.assignedAgentId} IS NOT NULL`,
          sql`${tickets.status} NOT IN ('Resolved', 'Closed')`
        )
      )
      .groupBy(tickets.assignedAgentId);

    // ── Comments made by each agent in the window ─────────────────────────────
    const commentsByAgent = await db
      .select({
        agentId: comments.authorId,
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(comments)
      .where(gte(comments.createdAt, since))
      .groupBy(comments.authorId);

    // ── Calls logged by each agent in the window ──────────────────────────────
    const callsByAgent = await db
      .select({
        agentId: calls.agentId,
        count: sql<number>`cast(count(*) as integer)`,
        totalDuration: sql<number>`cast(sum(${calls.duration}) as integer)`,
      })
      .from(calls)
      .where(gte(calls.createdAt, since))
      .groupBy(calls.agentId);

    // ── SRs assigned/handled by each agent in the window ─────────────────────
    const srsByAgent = await db
      .select({
        agentId: serviceRequests.assignedAgentId,
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(serviceRequests)
      .where(
        and(
          sql`${serviceRequests.assignedAgentId} IS NOT NULL`,
          gte(serviceRequests.createdAt, since)
        )
      )
      .groupBy(serviceRequests.assignedAgentId);

    // ── Build lookup maps ─────────────────────────────────────────────────────
    const resolvedMap = Object.fromEntries(resolvedByAgent.map(r => [r.agentId, r.count]));
    const openMap = Object.fromEntries(openByAgent.map(r => [r.agentId, r.count]));
    const commentsMap = Object.fromEntries(commentsByAgent.map(r => [r.agentId, r.count]));
    const callsMap = Object.fromEntries(callsByAgent.map(r => [r.agentId, r.count]));
    const callsDurationMap = Object.fromEntries(callsByAgent.map(r => [r.agentId, r.totalDuration ?? 0]));
    const srsMap = Object.fromEntries(srsByAgent.map(r => [r.agentId, r.count]));

    // ── Assemble result ───────────────────────────────────────────────────────
    const result = agents.map(agent => ({
      agent: { id: agent.id, fullName: agent.fullName, email: agent.email, role: agent.role },
      activity: {
        ticketsResolved: resolvedMap[agent.id] ?? 0,
        ticketsOpen: openMap[agent.id] ?? 0,
        comments: commentsMap[agent.id] ?? 0,
        calls: callsMap[agent.id] ?? 0,
        callDurationSeconds: callsDurationMap[agent.id] ?? 0,
        serviceRequestsHandled: srsMap[agent.id] ?? 0,
      },
    }));

    // Sort by tickets resolved desc, then name
    result.sort((a, b) =>
      b.activity.ticketsResolved - a.activity.ticketsResolved ||
      a.agent.fullName.localeCompare(b.agent.fullName)
    );

    return NextResponse.json({ days, since: since.toISOString(), agents: result });
  } catch (err) {
    return handleAPIError(err);
  }
}
