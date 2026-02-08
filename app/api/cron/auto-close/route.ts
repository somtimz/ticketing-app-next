/**
 * Auto-Close Stale Tickets Cron Job
 * Runs periodically to automatically close tickets that have been "Resolved" for 7+ days
 *
 * This endpoint should be called by a cron job service (e.g., Vercel Cron)
 * once per day
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tickets } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Verify cron secret to prevent unauthorized access
 */
function verifyCronSecret(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  // In development, allow access without secret
  if (process.env.NODE_ENV === 'development' && !process.env.CRON_SECRET) {
    return true;
  }

  return authHeader === expectedAuth;
}

// GET /api/cron/auto-close - Close stale resolved tickets
export async function GET(req: NextRequest) {
  // Verify cron secret
  if (!verifyCronSecret(req)) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Invalid cron secret' },
      { status: 401 }
    );
  }

  const now = new Date();
  const daysUntilClose = 7;

  // Calculate the cutoff date (7 days ago)
  const cutoffDate = new Date(now.getTime() - daysUntilClose * 24 * 60 * 60 * 1000);

  const results = {
    ticketsClosed: 0,
    timestamp: now.toISOString()
  };

  try {
    // Find all tickets that are "Resolved" and haven't been updated in 7+ days
    const staleTickets = await db.query.tickets.findMany({
      where: and(
        eq(tickets.status, 'Resolved'),
        sql`${tickets.updatedAt} < ${cutoffDate}`
      ),
      columns: {
        id: true,
        ticketNumber: true,
        title: true,
        resolvedAt: true,
        updatedAt: true
      }
    });

    if (staleTickets.length === 0) {
      return NextResponse.json({
        success: true,
        ...results,
        message: 'No stale tickets to close'
      });
    }

    // Close each stale ticket
    for (const ticket of staleTickets) {
      await db
        .update(tickets)
        .set({
          status: 'Closed',
          closedAt: now,
          updatedAt: now
        })
        .where(eq(tickets.id, ticket.id));

      results.ticketsClosed++;
    }

    return NextResponse.json({
      success: true,
      ...results,
      ticketsClosed: results.ticketsClosed,
      message: `Closed ${results.ticketsClosed} stale ticket(s)`
    });
  } catch (error) {
    console.error('Error in auto-close cron:', error);
    return NextResponse.json(
      {
        error: 'internal_error',
        message: 'Failed to auto-close stale tickets',
        results
      },
      { status: 500 }
    );
  }
}

// POST /api/cron/auto-close - Manual trigger for testing
export async function POST(req: NextRequest) {
  return GET(req);
}
