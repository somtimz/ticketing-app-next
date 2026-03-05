/**
 * SLA Monitoring Cron Job
 * Runs periodically to check for SLA breaches and warnings
 *
 * This endpoint should be called by a cron job service (e.g., Vercel Cron)
 * every 5-15 minutes to monitor SLA compliance
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tickets, users, escalationRules } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { sendSLABreachEmail, sendSLAWarningEmail, sendEscalationEmail } from '@/lib/email';
import { requireAuth } from '@/lib/api-error';
import { auth } from '@/lib/auth';

// Deduplicate breach notifications: only notify once per 4 hours per ticket
const BREACH_NOTIFY_COOLDOWN_MS = 4 * 60 * 60 * 1000;

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

/**
 * Calculate time remaining until SLA deadline
 */
function getTimeRemaining(dueDate: Date, now: Date): string {
  const diffMs = dueDate.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  } else if (diffMins > 0) {
    return `${diffMins} minute${diffMins > 1 ? 's' : ''}`;
  }
  return 'less than 1 minute';
}

/**
 * Check if we should send a warning (20% of time remaining)
 */
function shouldSendWarning(createdAt: Date, dueDate: Date, now: Date): boolean {
  const totalWindow = dueDate.getTime() - createdAt.getTime();
  const timeElapsed = now.getTime() - createdAt.getTime();
  const timeUntilDue = dueDate.getTime() - now.getTime();

  // Send warning at 80% of time elapsed (20% remaining)
  // But only if we haven't already breached
  return timeElapsed > (totalWindow * 0.8) && timeUntilDue > 0 && timeUntilDue < (totalWindow * 0.25);
}

// GET /api/cron/sla-monitor - Check for SLA breaches and warnings
export async function GET(req: NextRequest) {
  // Verify cron secret
  if (!verifyCronSecret(req)) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Invalid cron secret' },
      { status: 401 }
    );
  }

  const now = new Date();
  const results = {
    breaches: { firstResponse: 0, resolution: 0 },
    warnings: { firstResponse: 0, resolution: 0 },
    emailsSent: 0,
    ticketsProcessed: 0
  };

  try {
    // Find all active tickets (not Resolved, Closed, or On Hold — hold pauses SLA)
    const activeTickets = await db.query.tickets.findMany({
      where: and(
        sql`${tickets.status} != 'Resolved'`,
        sql`${tickets.status} != 'Closed'`,
        sql`${tickets.status} != 'On Hold'`
      ),
      with: {
        assignedAgent: true,
        createdBy: true
      }
    });

    results.ticketsProcessed = activeTickets.length;

    for (const ticket of activeTickets) {
      // Get email addresses safely
      const assignedAgentEmail = (ticket as any).assignedAgent?.email as string | undefined;
      const createdByEmail = (ticket as any).createdBy?.email as string | undefined;

      // Determine if breach notification cooldown has elapsed
      const lastBreachNotified = ticket.slaBreachNotifiedAt
        ? new Date(ticket.slaBreachNotifiedAt)
        : null;
      const breachNotifyCooledDown =
        !lastBreachNotified ||
        now.getTime() - lastBreachNotified.getTime() > BREACH_NOTIFY_COOLDOWN_MS;

      // Check First Response SLA
      if (ticket.slaFirstResponseDue) {
        const firstResponseDue = new Date(ticket.slaFirstResponseDue);
        const isBreached = now > firstResponseDue;
        const shouldWarn = shouldSendWarning(ticket.createdAt, firstResponseDue, now);

        if (isBreached && breachNotifyCooledDown) {
          // Notify assigned agent and team leads
          const recipients: string[] = [];
          if (assignedAgentEmail) recipients.push(assignedAgentEmail);
          if (createdByEmail) recipients.push(createdByEmail);

          // Get all team leads
          const teamLeads = await db.query.users.findMany({
            where: eq(users.role, 'TeamLead')
          });

          for (const teamLead of teamLeads) {
            if (teamLead.email && !recipients.includes(teamLead.email)) {
              recipients.push(teamLead.email);
            }
          }

          for (const recipient of recipients) {
            await sendSLABreachEmail(
              recipient,
              ticket.ticketNumber,
              ticket.title,
              ticket.priority,
              'first_response',
              firstResponseDue
            );
            results.emailsSent++;
          }

          // Record that we sent breach notifications
          await db.update(tickets).set({ slaBreachNotifiedAt: now } as any).where(eq(tickets.id, ticket.id));

          results.breaches.firstResponse++;
        } else if (!isBreached && shouldWarn && assignedAgentEmail) {
          const timeRemaining = getTimeRemaining(firstResponseDue, now);
          await sendSLAWarningEmail(
            assignedAgentEmail,
            ticket.ticketNumber,
            ticket.title,
            ticket.priority,
            'first_response',
            firstResponseDue,
            timeRemaining
          );
          results.emailsSent++;
          results.warnings.firstResponse++;
        }
      }

      // Check Resolution SLA
      if (ticket.slaResolutionDue) {
        const resolutionDue = new Date(ticket.slaResolutionDue);
        const isBreached = now > resolutionDue;
        const shouldWarn = shouldSendWarning(ticket.createdAt, resolutionDue, now);

        if (isBreached && breachNotifyCooledDown) {
          // Notify assigned agent, creator, team leads and admins
          const recipients: string[] = [];
          if (assignedAgentEmail) recipients.push(assignedAgentEmail);
          if (createdByEmail) recipients.push(createdByEmail);

          // Get all team leads and admins
          const leadsAndAdmins = await db.query.users.findMany({
            where: sql`${users.role} = 'TeamLead' OR ${users.role} = 'Admin'`
          });

          for (const lead of leadsAndAdmins) {
            if (lead.email && !recipients.includes(lead.email)) {
              recipients.push(lead.email);
            }
          }

          for (const recipient of recipients) {
            await sendSLABreachEmail(
              recipient,
              ticket.ticketNumber,
              ticket.title,
              ticket.priority,
              'resolution',
              resolutionDue
            );
            results.emailsSent++;
          }

          // Record that we sent breach notifications
          await db.update(tickets).set({ slaBreachNotifiedAt: now } as any).where(eq(tickets.id, ticket.id));

          results.breaches.resolution++;
        } else if (!isBreached && shouldWarn && assignedAgentEmail) {
          const timeRemaining = getTimeRemaining(resolutionDue, now);
          await sendSLAWarningEmail(
            assignedAgentEmail,
            ticket.ticketNumber,
            ticket.title,
            ticket.priority,
            'resolution',
            resolutionDue,
            timeRemaining
          );
          results.emailsSent++;
          results.warnings.resolution++;
        }
      }
    }

    // ── Escalation Rule Evaluation ───────────────────────────────────────────
    // Load active escalation rules and evaluate each against breached tickets
    const activeRules = await db
      .select()
      .from(escalationRules)
      .where(eq(escalationRules.isActive, true));

    let escalationsFired = 0;

    if (activeRules.length > 0) {
      // Re-query breached active tickets (status check already applied above, re-use activeTickets)
      for (const ticket of activeTickets) {
        if (!ticket.slaResolutionDue) continue;
        const resolutionDue = new Date(ticket.slaResolutionDue);
        const msOverdue = now.getTime() - resolutionDue.getTime();
        if (msOverdue <= 0) continue; // Not yet breached

        const minutesOverdue = Math.floor(msOverdue / (1000 * 60));

        for (const rule of activeRules) {
          if (rule.priority !== ticket.priority) continue;

          // minutesBeforeBreach > 0 means "X min before breach" — handled by warning logic above
          // minutesBeforeBreach <= 0 means "X min after breach" — we trigger here
          const ruleThreshold = -(rule.minutesBeforeBreach); // flip sign: stored as positive = after breach
          if (minutesOverdue < ruleThreshold) continue;

          if (rule.action === 'notify_teamlead' || rule.action === 'notify_admin') {
            const targetRole = rule.action === 'notify_teamlead' ? 'TeamLead' : 'Admin';
            const targets = await db.query.users.findMany({
              where: eq(users.role, targetRole)
            });
            for (const target of targets) {
              if (target.email) {
                await sendEscalationEmail(
                  target.email,
                  ticket.ticketNumber,
                  ticket.title,
                  ticket.priority,
                  ticket.id,
                  rule.name,
                  minutesOverdue
                );
                results.emailsSent++;
                escalationsFired++;
              }
            }
          } else if (rule.action === 'reassign' && rule.reassignToAgentId) {
            await db.update(tickets)
              .set({ assignedAgentId: rule.reassignToAgentId, updatedAt: now } as any)
              .where(eq(tickets.id, ticket.id));
            escalationsFired++;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      escalationsFired,
      ...results
    });
  } catch (error) {
    console.error('Error in SLA monitor cron:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to check SLA status', results },
      { status: 500 }
    );
  }
}

// POST /api/cron/sla-monitor - Manual trigger for testing (requires auth)
export async function POST(req: NextRequest) {
  const session = await auth();
  requireAuth(session);

  // Only Team Leads and Admins can manually trigger
  const userRole = session?.user?.role as string;
  if (!['TeamLead', 'Admin'].includes(userRole)) {
    return NextResponse.json(
      { error: 'forbidden', message: 'Only Team Leads and Admins can trigger SLA monitoring' },
      { status: 403 }
    );
  }

  // Call the GET handler
  return GET(req);
}
