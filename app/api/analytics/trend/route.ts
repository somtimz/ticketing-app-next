import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { requireRole, handleAPIError } from '@/lib/api-error';
import { db } from '@/lib/db';
import { tickets, serviceRequests } from '@/lib/db/schema';
import { gte, sql } from 'drizzle-orm';

/**
 * GET /api/analytics/trend
 * Returns daily counts for tickets and service requests over a time window.
 *
 * Query params:
 *   - days: lookback window in days (default 30, max 90)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    requireRole(session, 'Agent');

    const { searchParams } = new URL(req.url);
    const days = Math.min(Math.max(parseInt(searchParams.get('days') ?? '30', 10) || 30, 7), 90);

    const since = new Date();
    since.setDate(since.getDate() - days);

    // ── Tickets by day ────────────────────────────────────────────────────────
    // Group by date(createdAt) — SQLite: date(), PostgreSQL: date_trunc / ::date
    // Drizzle doesn't have a cross-db date-only truncate, so use raw SQL for portability.
    const ticketsByDay = await db
      .select({
        day: sql<string>`date(${tickets.createdAt})`,
        status: tickets.status,
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(tickets)
      .where(gte(tickets.createdAt, since))
      .groupBy(sql`date(${tickets.createdAt})`, tickets.status)
      .orderBy(sql`date(${tickets.createdAt})`);

    // ── SRs by day ────────────────────────────────────────────────────────────
    const srsByDay = await db
      .select({
        day: sql<string>`date(${serviceRequests.createdAt})`,
        status: serviceRequests.status,
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(serviceRequests)
      .where(gte(serviceRequests.createdAt, since))
      .groupBy(sql`date(${serviceRequests.createdAt})`, serviceRequests.status)
      .orderBy(sql`date(${serviceRequests.createdAt})`);

    // ── Build a date series (all days in window) ──────────────────────────────
    const dateSeriesMap: Record<
      string,
      { tickets: Record<string, number>; srs: Record<string, number> }
    > = {};

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
      dateSeriesMap[key] = { tickets: {}, srs: {} };
    }

    // Populate tickets
    for (const row of ticketsByDay) {
      const day = row.day.slice(0, 10);
      if (dateSeriesMap[day]) {
        dateSeriesMap[day].tickets[row.status] =
          (dateSeriesMap[day].tickets[row.status] ?? 0) + row.count;
      }
    }

    // Populate SRs
    for (const row of srsByDay) {
      const day = row.day.slice(0, 10);
      if (dateSeriesMap[day]) {
        dateSeriesMap[day].srs[row.status] =
          (dateSeriesMap[day].srs[row.status] ?? 0) + row.count;
      }
    }

    // ── Flatten into array ────────────────────────────────────────────────────
    const trend = Object.entries(dateSeriesMap).map(([day, data]) => {
      const ticketTotal = Object.values(data.tickets).reduce((a, b) => a + b, 0);
      const srTotal = Object.values(data.srs).reduce((a, b) => a + b, 0);
      return {
        day,
        tickets: { total: ticketTotal, byStatus: data.tickets },
        srs: { total: srTotal, byStatus: data.srs },
      };
    });

    return NextResponse.json({ days, since: since.toISOString(), trend });
  } catch (err) {
    return handleAPIError(err);
  }
}
