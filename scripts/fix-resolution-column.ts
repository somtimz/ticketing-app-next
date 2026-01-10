import Database from 'better-sqlite3';

const db = new Database('data/ticketing.db');

try {
  // Check if resolution column exists
  const columns = db.pragma('table_info(tickets)');
  const hasResolution = columns.some((col: any) => col.name === 'resolution');

  if (!hasResolution) {
    console.log('Adding resolution column to tickets table...');
    db.exec('ALTER TABLE tickets ADD COLUMN resolution TEXT');
    console.log('✓ Added resolution column');
  } else {
    console.log('✓ Resolution column already exists');
  }
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
} finally {
  db.close();
}
