/**
 * Auto-assignment logic for tickets
 * Assigns tickets to agents based on category, workload, and skills
 */

import { db } from './db';
import { tickets, users, categories } from './db/schema';
import { eq, and, sql } from 'drizzle-orm';

export interface AssignmentResult {
  success: boolean;
  agentId?: number;
  reason?: string;
}

/**
 * Find the best agent for a given category
 * Algorithm:
 * 1. Get category's default agent (if set)
 * 2. Check agent's current workload
 * 3. If default agent is overloaded, find least busy agent in system
 */
export async function findBestAgentForCategory(
  categoryId: number
): Promise<number | null> {
  // Get category with default agent
  const category = await db.query.categories.findFirst({
    where: eq(categories.id, categoryId)
  });

  if (!category) {
    return null;
  }

  // Get all active agents
  const allAgents = await db.query.users.findMany({
    where: eq(users.role, 'Agent')
  });

  if (allAgents.length === 0) {
    return null;
  }

  // Calculate workload for each agent
  const workloads = await Promise.all(
    allAgents.map(async (agent) => {
      const openTickets = await db
        .select({ count: sql<number>`count(*)` })
        .from(tickets)
        .where(
          and(
            eq(tickets.assignedAgentId, agent.id),
            sql`${tickets.status} NOT IN ('Resolved', 'Closed')`
          )
        );

      return {
        agent,
        openTickets: openTickets[0]?.count || 0
      };
    })
  );

  // Sort by workload (ascending) - least busy first
  workloads.sort((a, b) => a.openTickets - b.openTickets);

  // If category has a default agent, check their workload relative to others
  if (category.defaultAgentId) {
    const defaultAgentWorkload = workloads.find(w => w.agent.id === category.defaultAgentId);
    const leastBusy = workloads[0];

    // Use default agent if they're not significantly overloaded (> 2x the least busy)
    if (defaultAgentWorkload && defaultAgentWorkload.openTickets <= leastBusy.openTickets + 2) {
      return defaultAgentWorkload.agent.id;
    }
  }

  // Return least busy agent
  return workloads[0].agent.id;
}

/**
 * Assign a ticket to an agent
 */
export async function assignTicket(
  ticketId: number,
  agentId: number | null = null
): Promise<AssignmentResult> {
  // Get ticket details
  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.id, ticketId)
  });

  if (!ticket) {
    return {
      success: false,
      reason: 'Ticket not found'
    };
  }

  // If agentId not provided, find best agent based on category
  let targetAgentId = agentId;
  if (!targetAgentId && ticket.categoryId) {
    targetAgentId = await findBestAgentForCategory(ticket.categoryId);
  }

  if (!targetAgentId) {
    return {
      success: false,
      reason: 'No agent available for assignment'
    };
  }

  // Verify agent exists and is active
  const agent = await db.query.users.findFirst({
    where: and(
      eq(users.id, targetAgentId),
      eq(users.isActive, true)
    )
  });

  if (!agent || agent.role !== 'Agent') {
    return {
      success: false,
      reason: 'Agent not found or inactive'
    };
  }

  // Update ticket
  await db.update(tickets)
    .set({
      assignedAgentId: targetAgentId,
      status: 'Assigned',
      lastActivityAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(tickets.id, ticketId));

  return {
    success: true,
    agentId: targetAgentId
  };
}

/**
 * Assign multiple tickets in bulk
 */
export async function assignTicketsBulk(
  ticketIds: number[],
  agentId: number
): Promise<{ success: number; failed: number[] }> {
  const results = {
    success: 0,
    failed: [] as number[]
  };

  for (const ticketId of ticketIds) {
    const result = await assignTicket(ticketId, agentId);
    if (result.success) {
      results.success++;
    } else {
      results.failed.push(ticketId);
    }
  }

  return results;
}

/**
 * Get agent workload statistics
 */
export async function getAgentWorkload(agentId: number) {
  const agentTickets = await db.query.tickets.findMany({
    where: eq(tickets.assignedAgentId, agentId)
  });

  const open = agentTickets.filter((t: any) => !['Resolved', 'Closed'].includes(t.status)).length;
  const resolved = agentTickets.filter((t: any) => t.status === 'Resolved').length;
  const closed = agentTickets.filter((t: any) => t.status === 'Closed').length;

  // Calculate SLA compliance
  const resolvedTickets = agentTickets.filter((t: any) => t.status === 'Resolved' && t.resolvedAt && t.slaResolutionDue);
  const onTime = resolvedTickets.filter((t: any) => t.resolvedAt! <= t.slaResolutionDue!).length;
  const slaCompliance = resolvedTickets.length > 0 ? (onTime / resolvedTickets.length) * 100 : 100;

  return {
    open,
    resolved,
    closed,
    total: agentTickets.length,
    slaCompliance: Math.round(slaCompliance * 10) / 10
  };
}

/**
 * Get all agents with their workloads
 */
export async function getAllAgentWorkloads() {
  const agents = await db.query.users.findMany({
    where: eq(users.role, 'Agent')
  });

  const workloads = await Promise.all(
    agents.map(async (agent) => ({
      agent,
      workload: await getAgentWorkload(agent.id)
    }))
  );

  return workloads.sort((a, b) => b.workload.total - a.workload.total);
}

/**
 * Reassign ticket to another agent
 */
export async function reassignTicket(
  ticketId: number,
  fromAgentId: number,
  toAgentId: number,
  _reason?: string
): Promise<AssignmentResult> {
  // Verify ticket exists and is assigned to fromAgentId
  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.id, ticketId)
  });

  if (!ticket) {
    return {
      success: false,
      reason: 'Ticket not found'
    };
  }

  if (ticket.assignedAgentId !== fromAgentId) {
    return {
      success: false,
      reason: 'Ticket not assigned to specified agent'
    };
  }

  // Verify toAgent exists and is active
  const toAgent = await db.query.users.findFirst({
    where: and(
      eq(users.id, toAgentId),
      eq(users.isActive, true)
    )
  });

  if (!toAgent || toAgent.role !== 'Agent') {
    return {
      success: false,
      reason: 'Target agent not found or inactive'
    };
  }

  // Update ticket
  await db.update(tickets)
    .set({
      assignedAgentId: toAgentId,
      lastActivityAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(tickets.id, ticketId));

  return {
    success: true,
    agentId: toAgentId
  };
}
