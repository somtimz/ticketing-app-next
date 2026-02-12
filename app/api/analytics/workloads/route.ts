/**
 * Agent workload analytics API
 * Provides workload statistics for agents
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { requireAuth, requireRole } from '@/lib/api-error';
import { getAllAgentWorkloads, getAgentWorkload } from '@/lib/assignment';

// GET /api/analytics/workloads - Get agent workloads
// Query params:
//   - agentId: optional, get specific agent's workload
//   - if not provided, returns all agents' workloads (Team Lead/Admin only)
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    requireAuth(session);

    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');

    // If agentId is provided, get specific agent workload
    if (agentId) {
      // Check if user is requesting their own data or is a Team Lead/Admin
      const userId = parseInt(session!.user.id);
      const userRole = session!.user.role as string;
      const isOwnData = userId === parseInt(agentId);
      const canViewOthers = ['TeamLead', 'Admin'].includes(userRole);

      if (!isOwnData && !canViewOthers) {
        return NextResponse.json(
          { error: 'forbidden', message: 'You can only view your own workload' },
          { status: 403 }
        );
      }

      const workload = await getAgentWorkload(parseInt(agentId));

      return NextResponse.json({ workload });
    }

    // Get all workloads - requires Team Lead or Admin role
    requireRole(session, 'TeamLead');

    const workloads = await getAllAgentWorkloads();

    return NextResponse.json({
      workloads,
      summary: {
        totalAgents: workloads.length,
        totalOpenTickets: workloads.reduce((sum, w) => sum + w.workload.open, 0),
        avgSLACompliance: workloads.length > 0
          ? workloads.reduce((sum, w) => sum + w.workload.slaCompliance, 0) / workloads.length
          : 0
      }
    });
  } catch (error) {
    console.error('Error getting agent workloads:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to get agent workloads' },
      { status: 500 }
    );
  }
}
