import { db } from '../lib/db';
import { sql } from 'drizzle-orm';

async function checkSchema() {
  const result = await db.execute(sql`
    PRAGMA table_info(categories);
  `);
  console.log('Current categories table structure:');
  console.table(result);
}

checkSchema();
