import Database from 'better-sqlite3';

const db = new Database('data/ticketing.db');

// Clean up any partial migration
try {
  db.exec('DROP TABLE IF EXISTS users_new;');
  console.log('Cleaned up partial migration');
} catch {
  // Ignore error if table doesn't exist
}

console.log('Step 1: Disable foreign key constraints...');
db.pragma('foreign_keys = OFF');

console.log('Step 2: Recreate users table with TitleCase role values...');

// Create new table with updated schema
db.exec(`
  CREATE TABLE users_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Employee' CHECK(role IN ('Employee', 'Agent', 'TeamLead', 'Admin')),
    saml_identity_id TEXT,
    department TEXT,
    location TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);

// Copy and transform data
const insert = db.prepare(`
  INSERT INTO users_new (id, email, password_hash, full_name, role, saml_identity_id, department, location, is_active, created_at, updated_at)
  SELECT id, email, password_hash, full_name,
         CASE LOWER(role)
           WHEN 'employee' THEN 'Employee'
           WHEN 'agent' THEN 'Agent'
           WHEN 'teamlead' THEN 'TeamLead'
           WHEN 'admin' THEN 'Admin'
           ELSE 'Employee'
         END,
         saml_identity_id, department, location, is_active, created_at, updated_at
  FROM users;
`);

const result = insert.run();
console.log(`Copied ${result.changes} users to new table`);

// Drop old table and rename new one
db.exec('DROP TABLE users;');
db.exec('ALTER TABLE users_new RENAME TO users;');

// Re-enable foreign key constraints
console.log('Step 3: Re-enable foreign key constraints...');
db.pragma('foreign_keys = ON');

// Verify changes
const users = db.prepare('SELECT id, email, full_name, role FROM users').all();
console.log('\nUpdated users:');
console.table(users);

db.close();
console.log('\nDone! Role values are now TitleCase.');
