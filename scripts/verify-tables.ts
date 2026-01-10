import { db } from '../lib/db';
import { slaPolicies } from '../lib/db/schema';

async function verifyTables() {
  console.log('Verifying new tables...');

  try {
    // Check sla_policies table
    const slaCount = await db.select().from(slaPolicies);
    console.log(`✓ sla_policies table exists (${slaCount.length} records)`);

    console.log('\n✓ All new tables verified successfully!');
  } catch (error: any) {
    console.error('✗ Error verifying tables:', error.message);
    process.exit(1);
  }
}

verifyTables();
