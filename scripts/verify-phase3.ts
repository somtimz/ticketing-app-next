import Database from 'better-sqlite3';
import { join } from 'path';

async function verifyPhase3Changes() {
  console.log('Verifying Phase 3 changes...\n');

  const dbPath = join(process.cwd(), 'data', 'ticketing.db');
  const db = new Database(dbPath);

  try {
    // Check users table
    console.log('USERS table:');
    const usersColumns = db.pragma('table_info(users)') as any[];
    const newUsersColumns = usersColumns.filter((c: any) =>
      ['saml_identity_id', 'department', 'location'].includes(c.name)
    );
    console.log('  New columns:', newUsersColumns.map((c: any) => c.name).join(', ') || 'None');

    // Check employees table
    console.log('\nEMPLOYEES table:');
    const employeesColumns = db.pragma('table_info(employees)') as any[];
    const newEmployeesColumns = employeesColumns.filter((c: any) =>
      ['location', 'user_id'].includes(c.name)
    );
    console.log('  New columns:', newEmployeesColumns.map((c: any) => c.name).join(', ') || 'None');

    // Check categories table
    console.log('\nCATEGORIES table:');
    const categoriesColumns = db.pragma('table_info(categories)') as any[];
    const newCategoriesColumns = categoriesColumns.filter((c: any) =>
      ['parent_category_id', 'default_agent_id', 'form_schema', 'updated_at'].includes(c.name)
    );
    console.log('  New columns:', newCategoriesColumns.map((c: any) => c.name).join(', ') || 'None');

    // Check tickets table
    console.log('\nTICKETS table:');
    const ticketsColumns = db.pragma('table_info(tickets)') as any[];
    const newTicketsColumns = ticketsColumns.filter((c: any) =>
      ['created_by', 'impact', 'urgency', 'sla_first_response_due', 'sla_resolution_due'].includes(c.name)
    );
    console.log('  New columns:', newTicketsColumns.map((c: any) => c.name).join(', ') || 'None');

    // Check if categories have updated_at set
    const categoriesWithUpdated = db.prepare('SELECT COUNT(*) as count FROM categories WHERE updated_at IS NOT NULL').get() as any;
    console.log(`\n  Categories with updated_at set: ${categoriesWithUpdated.count}`);

    // Check if tickets have created_by set
    const ticketsWithCreatedBy = db.prepare('SELECT COUNT(*) as count FROM tickets WHERE created_by IS NOT NULL').get() as any;
    console.log(`  Tickets with created_by set: ${ticketsWithCreatedBy.count}`);

    console.log('\n✓ Phase 3 verification complete!');
  } catch (error: any) {
    console.error('✗ Error verifying:', error.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

verifyPhase3Changes();
