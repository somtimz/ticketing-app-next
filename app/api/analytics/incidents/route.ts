import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { requireAuth, requireAnyRole } from '@/lib/api-error';
import { db } from '@/lib/db';
import { tickets, categories, ticketStatusHistory } from '@/lib/db/schema';
import { eq, and, isNotNull, gte, lte, lt, sql, inArray } from 'drizzle-orm';
import type { ApiErrorResponse } from '@/types';

/**
 * GET /api/analytics/incidents
 * Returns incident reporting metrics:
 *   - MTTR (mean time to resolve), in minutes
 *   - Volume by category (count of tickets per category, last 30 days)
 *   - Reopen rate (% of resolved tickets that were reopened)
 *   - SLA breach count (tickets where resolution SLA was breached)
 *
 * Query params:
 *   - days: lookback window in days (default 30)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    requireAuth(session);
    requireAnyRole(session!, ['Agent', 'TeamLead', 'Admin']);

    const { searchParams } = new URL(req.url);
    const days = Math.min(Math.max(parseInt(searchParams.get('days') ?? '30', 10) || 30, 1), 365);

    const since = new Date();
    since.setDate(since.getDate() - days);

    // ── 1. MTTR ──────────────────────────────────────────────────────────────
    // Average (resolvedAt - createdAt) in minutes for resolved/closed tickets in window
    const resolvedTickets = await db
      .select({
        createdAt: tickets.createdAt,
        resolvedAt: tickets.resolvedAt
      })
      .from(tickets)
      .where(
        and(
          isNotNull(tickets.resolvedAt),
          gte(tickets.resolvedAt, since)
        )
      );

    let mttrMinutes: number | null = null;
    if (resolvedTickets.length > 0) {
      const totalMs = resolvedTickets.reduce((acc, t) => {
        const resolved = new Date(t.resolvedAt!).getTime();
        const created = new Date(t.createdAt).getTime();
        return acc + Math.max(0, resolved - created);
      }, 0);
      mttrMinutes = Math.round(totalMs / resolvedTickets.length / 60_000);
    }

    // ── 2. Volume by category ─────────────────────────────────────────────────
    // Count tickets per category created in the window
    const volumeByCategoryRaw = await db
      .select({
        categoryId: tickets.categoryId,
        categoryName: categories.name,
        count: sql<number>`cast(count(*) as integer)`
      })
      .from(tickets)
      .leftJoin(categories, eq(tickets.categoryId, categories.id))
      .where(gte(tickets.createdAt, since))
      .groupBy(tickets.categoryId, categories.name)
      .orderBy(sql`count(*) desc`);

    const volumeByCategory = volumeByCategoryRaw.map(row => ({
      categoryId: row.categoryId,
      categoryName: row.categoryName ?? 'Uncategorized',
      count: row.count
    }));

    // ── 3. Reopen rate ────────────────────────────────────────────────────────
    // Tickets resolved in window that have a status history entry going from
    // Resolved back to a non-terminal status (InProgress, Assigned, On Hold)
    const resolvedInWindow = await db
      .select({ id: tickets.id })
      .from(tickets)
      .where(
        and(
          isNotNull(tickets.resolvedAt),
          gte(tickets.resolvedAt, since)
        )
      );

    let reopenRate: number | null = null;
    if (resolvedInWindow.length > 0) {
      const resolvedIds = resolvedInWindow.map(t => t.id);
      const reopenedRows = await db
        .select({ ticketId: ticketStatusHistory.ticketId })
        .from(ticketStatusHistory)
        .where(
          and(
            inArray(ticketStatusHistory.ticketId, resolvedIds),
            eq(ticketStatusHistory.fromStatus, 'Resolved')
          )
        )
        .groupBy(ticketStatusHistory.ticketId);

      reopenRate = Math.round((reopenedRows.length / resolvedInWindow.length) * 100 * 10) / 10;
    }

    // ── 4. SLA breach count ───────────────────────────────────────────────────
    // Tickets created in window where resolution SLA was breached.
    // For resolved tickets: resolvedAt > slaResolutionDue
    // For still-open tickets: now > slaResolutionDue
    const now = new Date();

    // Breached resolved tickets (resolved later than SLA due date)
    const breachedResolvedCount = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(tickets)
      .where(
        and(
          isNotNull(tickets.slaResolutionDue),
          isNotNull(tickets.resolvedAt),
          gte(tickets.createdAt, since),
          sql`${tickets.resolvedAt} > ${tickets.slaResolutionDue}`
        )
      );

    // Breached open tickets (still open but past SLA due)
    const breachedOpenCount = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(tickets)
      .where(
        and(
          isNotNull(tickets.slaResolutionDue),
          gte(tickets.createdAt, since),
          lt(tickets.slaResolutionDue, now),
          sql`${tickets.status} NOT IN ('Resolved', 'Closed')`
        )
      );

    const slaBreachCount =
      (breachedResolvedCount[0]?.count ?? 0) +
      (breachedOpenCount[0]?.count ?? 0);

    // ── 5. Total tickets in window ────────────────────────────────────────────
    const totalInWindow = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(tickets)
      .where(gte(tickets.createdAt, since));

    const totalCount = totalInWindow[0]?.count ?? 0;

    // ── 6. Status breakdown ───────────────────────────────────────────────────
    const statusBreakdownRaw = await db
      .select({
        status: tickets.status,
        count: sql<number>`cast(count(*) as integer)`
      })
      .from(tickets)
      .where(gte(tickets.createdAt, since))
      .groupBy(tickets.status);

    const statusBreakdown = Object.fromEntries(
      statusBreakdownRaw.map(r => [r.status, r.count])
    );

    // ── 7. Volume by priority ─────────────────────────────────────────────────
    const priorityBreakdownRaw = await db
      .select({
        priority: tickets.priority,
        count: sql<number>`cast(count(*) as integer)`
      })
      .from(tickets)
      .where(gte(tickets.createdAt, since))
      .groupBy(tickets.priority)
      .orderBy(tickets.priority);

    const priorityBreakdown = Object.fromEntries(
      priorityBreakdownRaw.map(r => [r.priority, r.count])
    );

    return NextResponse.json({
      days,
      since: since.toISOString(),
      totalCount,
      mttrMinutes,
      reopenRate,
      slaBreachCount,
      slaBreachRate: totalCount > 0 ? Math.round((slaBreachCount / totalCount) * 100 * 10) / 10 : 0,
      volumeByCategory,
      statusBreakdown,
      priorityBreakdown
    });
  } catch (error) {
    console.error('Error fetching incident analytics:', error);
    return NextResponse.json<ApiErrorResponse>(
      { error: 'Failed to fetch incident analytics' },
      { status: 500 }
    );
  }
}
