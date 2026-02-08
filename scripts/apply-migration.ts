import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(process.cwd(), 'data', 'ticketing.db');
const migrationPath = join(process.cwd(), 'lib', 'db', 'migrations', '0007_phase1_mvp_foundation.sql');

console.log('Applying Phase 1 migration...');
console.log('Database:', dbPath);
console.log('Migration:', migrationPath);

const db = new Database(dbPath);
const migration = readFileSync(migrationPath, 'utf-8');

try {
  // Enable foreign keys
  db.pragma('foreign_keys = OFF');

  // Execute migration
  db.exec(migration);

  console.log('Migration applied successfully!');

  // Verify new tables exist
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  console.log('Tables in database:', tables.map((t: any) => t.name));

  // Verify departments table
  const deptCount = db.prepare('SELECT COUNT(*) as count FROM departments').get() as any;
  console.log('Departments table exists, rows:', deptCount.count);

  // Verify guest_users table
  const guestCount = db.prepare('SELECT COUNT(*) as count FROM guest_users').get() as any;
  console.log('Guest users table exists, rows:', guestCount.count);

  // Verify attachments table
  const attCount = db.prepare('SELECT COUNT(*) as count FROM attachments').get() as any;
  console.log('Attachments table exists, rows:', attCount.count);

} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}
