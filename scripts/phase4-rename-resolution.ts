import Database from 'better-sqlite3';
import { join } from 'path';

async function renameResolutionColumn() {
  console.log('Renaming resolution column to resolutionNotes...');

  const dbPath = join(process.cwd(), 'data', 'ticketing.db');
  const db = new Database(dbPath);

  try {
    // Enable foreign keys
    db.pragma('foreign_keys = OFF');

    // Rename the column
    db.exec('ALTER TABLE tickets RENAME COLUMN resolution TO resolutionNotes');

    console.log('✓ Column renamed successfully!');
  } catch (error: any) {
    console.error('✗ Error renaming column:', error.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

renameResolutionColumn();
