import Database from 'better-sqlite3';
import { join } from 'path';

async function cleanupPhase4() {
  console.log('Cleaning up Phase 4 artifacts...');

  const dbPath = join(process.cwd(), 'data', 'ticketing.db');
  const db = new Database(dbPath);

  try {
    db.pragma('foreign_keys = OFF');

    // Check if tickets_new exists and drop it
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tickets_new'").get() as any;
    if (tables) {
      db.exec('DROP TABLE IF EXISTS tickets_new');
      console.log('✓ Dropped tickets_new table');
    }

    db.pragma('foreign_keys = ON');
    console.log('✓ Cleanup complete!');
  } catch (error: any) {
    console.error('✗ Error during cleanup:', error.message);
  } finally {
    db.close();
  }
}

cleanupPhase4();
