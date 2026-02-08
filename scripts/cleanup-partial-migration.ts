import Database from 'better-sqlite3';

const db = new Database('data/ticketing.db');

console.log('Cleaning up partial migration...');

// Drop partial tables if they exist
const tablesToDrop = [
  '__new_callers',
  '__new_users',
  '__new_tickets',
  '__new_calls'
];

for (const table of tablesToDrop) {
  try {
    db.exec(`DROP TABLE IF EXISTS ${table}`);
    console.log(`Dropped ${table}`);
  } catch (e) {
    // Ignore if table doesn't exist
  }
}

// Also drop the new tables that may have been created
const newTables = [
  'departments',
  'guest_users',
  'attachments'
];

for (const table of newTables) {
  try {
    db.exec(`DROP TABLE IF EXISTS ${table}`);
    console.log(`Dropped ${table}`);
  } catch (e) {
    // Ignore if table doesn't exist
  }
}

console.log('Cleanup complete!');
db.close();
