import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

async function applyPhase5Migration() {
  console.log('Applying Phase 5: Update related tables...\n');

  const dbPath = join(process.cwd(), 'data', 'ticketing.db');
  const db = new Database(dbPath);

  try {
    // Get current counts before migration
    const usersBefore = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
    const statusHistoryBefore = db.prepare('SELECT COUNT(*) as count FROM ticket_status_history').get() as any;
    console.log(`Before migration:`);
    console.log(`  Users: ${usersBefore.count}`);
    console.log(`  Status History records: ${statusHistoryBefore.count}\n`);

    // Enable foreign keys
    db.pragma('foreign_keys = OFF');

    // Apply users table migration
    console.log('Applying users table migration...');
    const usersSQL = readFileSync(
      join(process.cwd(), 'lib', 'db', 'migrations', '0005_phase5_users_recreate.sql'),
      'utf-8'
    );
    const cleanedUsersSQL = usersSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');
    db.exec(cleanedUsersSQL);
    console.log('✓ Users table updated');

    // Apply ticket_status_history table migration
    console.log('Applying ticket_status_history table migration...');
    const statusHistorySQL = readFileSync(
      join(process.cwd(), 'lib', 'db', 'migrations', '0006_phase5_status_history_recreate.sql'),
      'utf-8'
    );
    const cleanedStatusHistorySQL = statusHistorySQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');
    db.exec(cleanedStatusHistorySQL);
    console.log('✓ Status history table updated');

    // Re-enable foreign keys
    db.pragma('foreign_keys = ON');

    // Verify the migrations
    const usersAfter = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
    const statusHistoryAfter = db.prepare('SELECT COUNT(*) as count FROM ticket_status_history').get() as any;

    console.log(`\nAfter migration:`);
    console.log(`  Users: ${usersAfter.count}`);
    console.log(`  Status History records: ${statusHistoryAfter.count}`);

    // Display users with their roles
    const users = db.prepare('SELECT id, email, role FROM users').all() as any[];
    console.log('\nUsers with roles:');
    console.table(users);

    // Display status history records
    const statusHistory = db.prepare(`
      SELECT id, ticket_id, from_status, to_status, changed_at
      FROM ticket_status_history
    `).all() as any[];
    console.log('\nStatus history records:');
    console.table(statusHistory);

    // Verify enum values
    const validRoles = ['employee', 'agent', 'teamLead', 'admin'];
    const validStatuses = ['New', 'Assigned', 'InProgress', 'Pending', 'Resolved', 'Closed'];

    const invalidUsers = users.filter((u: any) => !validRoles.includes(u.role));
    const invalidStatusHistory = statusHistory.filter((s: any) =>
      (s.from_status && !validStatuses.includes(s.from_status)) ||
      !validStatuses.includes(s.to_status)
    );

    if (invalidUsers.length > 0) {
      console.error('\n✗ Found users with invalid role values:');
      console.table(invalidUsers);
      throw new Error('Users validation failed');
    }

    if (invalidStatusHistory.length > 0) {
      console.error('\n✗ Found status history records with invalid status values:');
      console.table(invalidStatusHistory);
      throw new Error('Status history validation failed');
    }

    console.log('\n✓ Phase 5 migration applied successfully!');
    console.log('  - All enum values validated');
  } catch (error: any) {
    console.error('\n✗ Error applying migration:', error.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

applyPhase5Migration();
