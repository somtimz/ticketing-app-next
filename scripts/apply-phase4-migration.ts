import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

async function applyPhase4Migration() {
  console.log('Applying Phase 4: Recreate tickets table...\n');

  const dbPath = join(process.cwd(), 'data', 'ticketing.db');
  const db = new Database(dbPath);

  try {
    // Get current ticket count before migration
    const beforeCount = db.prepare('SELECT COUNT(*) as count FROM tickets').get() as any;
    console.log(`Tickets before migration: ${beforeCount.count}`);

    // Read the migration SQL
    const migrationSQL = readFileSync(
      join(process.cwd(), 'lib', 'db', 'migrations', '0004_phase4_recreate_tickets.sql'),
      'utf-8'
    );

    // Enable foreign keys
    db.pragma('foreign_keys = OFF');

    // Execute the migration
    db.exec(migrationSQL);

    // Re-enable foreign keys
    db.pragma('foreign_keys = ON');

    // Verify the migration
    const afterCount = db.prepare('SELECT COUNT(*) as count FROM tickets').get() as any;
    console.log(`Tickets after migration: ${afterCount.count}`);

    // Check data integrity
    const tickets = db.prepare(`
      SELECT id, ticket_number, priority, status, assigned_agent_id
      FROM tickets
    `).all() as any[];

    console.log('\nTicket data sample:');
    console.table(tickets.slice(0, 5));

    // Verify enum values
    const validPriorities = ['P1', 'P2', 'P3', 'P4'];
    const validStatuses = ['New', 'Assigned', 'InProgress', 'Pending', 'Resolved', 'Closed'];

    const invalidTickets = tickets.filter((t: any) =>
      !validPriorities.includes(t.priority) || !validStatuses.includes(t.status)
    );

    if (invalidTickets.length > 0) {
      console.error('\n✗ Found tickets with invalid enum values:');
      console.table(invalidTickets);
      throw new Error('Data validation failed');
    }

    console.log('\n✓ Phase 4 migration applied successfully!');
    console.log(`  - ${beforeCount.count} tickets migrated`);
    console.log('  - All enum values validated');
  } catch (error: any) {
    console.error('\n✗ Error applying migration:', error.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

applyPhase4Migration();
