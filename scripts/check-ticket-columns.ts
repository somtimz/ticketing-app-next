import Database from 'better-sqlite3';
import { join } from 'path';

async function checkTicketColumns() {
  const dbPath = join(process.cwd(), 'data', 'ticketing.db');
  const db = new Database(dbPath);

  try {
    const columns = db.pragma('table_info(tickets)');
    console.log('Current tickets table columns:');
    console.table(columns);

    // Check specifically for resolution-related columns
    const resolutionCol = columns.find((c: any) => c.name.includes('resolution'));
    console.log(`\nResolution column name: "${resolutionCol?.name}"`);
  } finally {
    db.close();
  }
}

checkTicketColumns();
