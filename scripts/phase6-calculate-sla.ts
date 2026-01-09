import Database from 'better-sqlite3';
import { join } from 'path';

async function calculateSLADeadlines() {
  console.log('Calculating SLA deadlines for existing tickets...\n');

  const dbPath = join(process.cwd(), 'data', 'ticketing.db');
  const db = new Database(dbPath);

  try {
    // Get SLA policies
    const slaPolicies = db.prepare('SELECT priority, first_response_minutes, resolution_minutes FROM sla_policies WHERE is_active = 1').all() as any[];

    console.log('SLA Policies:');
    console.table(slaPolicies);

    // Get tickets without SLA deadlines (only unresolved tickets)
    const tickets = db.prepare(`
      SELECT id, ticket_number, priority, status, created_at
      FROM tickets
      WHERE sla_first_response_due IS NULL
        AND sla_resolution_due IS NULL
        AND status NOT IN ('Resolved', 'Closed')
    `).all() as any[];

    console.log(`\nFound ${tickets.length} tickets needing SLA calculation`);

    if (tickets.length === 0) {
      console.log('✓ No tickets need SLA calculation');
      return;
    }

    // Create lookup map for SLA policies
    const slaMap = new Map();
    for (const policy of slaPolicies) {
      slaMap.set(policy.priority, {
        firstResponse: policy.first_response_minutes,
        resolution: policy.resolution_minutes
      });
    }

    // Calculate and update SLA deadlines for each ticket
    let updated = 0;
    for (const ticket of tickets) {
      const sla = slaMap.get(ticket.priority);
      if (!sla) {
        console.warn(`Warning: No SLA policy found for priority ${ticket.priority} (ticket ${ticket.ticket_number})`);
        continue;
      }

      // Calculate deadlines (created_at is stored as Unix timestamp in seconds)
      const createdAt = ticket.created_at; // in seconds
      const firstResponseDue = createdAt + (sla.firstResponse * 60);
      const resolutionDue = createdAt + (sla.resolution * 60);

      // Update the ticket
      db.prepare(`
        UPDATE tickets
        SET sla_first_response_due = ?,
            sla_resolution_due = ?
        WHERE id = ?
      `).run(firstResponseDue, resolutionDue, ticket.id);

      updated++;
      console.log(`  ✓ ${ticket.ticket_number}: Priority ${ticket.priority} → First response: ${new Date(firstResponseDue * 1000).toISOString()}, Resolution: ${new Date(resolutionDue * 1000).toISOString()}`);
    }

    console.log(`\n✓ Updated ${updated} tickets with SLA deadlines`);
  } catch (error: any) {
    console.error('✗ Error calculating SLA deadlines:', error.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

calculateSLADeadlines();
