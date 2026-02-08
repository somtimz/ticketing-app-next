/**
 * Recurring issues detection API
 * Identifies patterns of similar issues appearing multiple times
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { requireRole } from '@/lib/api-error';
import { findRecurringIssues } from '@/lib/suggestions';

// GET /api/analytics/recurring - Find recurring issues
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    requireRole(session, 'TeamLead'); // Only Team Leads and Admins can view recurring issues

    const { searchParams } = new URL(req.url);
    const daysBack = parseInt(searchParams.get('daysBack') || '30');
    const minOccurrences = parseInt(searchParams.get('minOccurrences') || '3');

    const recurring = await findRecurringIssues(daysBack, minOccurrences);

    return NextResponse.json({
      recurring,
      summary: {
        totalPatterns: recurring.length,
        dateRange: `Last ${daysBack} days`,
        minOccurrences
      }
    });
  } catch (error) {
    console.error('Error finding recurring issues:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to find recurring issues' },
      { status: 500 }
    );
  }
}
