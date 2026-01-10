import Database from 'better-sqlite3';

const db = new Database('data/ticketing.db');
const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get();

console.log('Users table schema:');
console.log((schema as any).sql);

// Try to get all columns
const columns = db.prepare('PRAGMA table_info(users)').all();
console.log('\nColumns:');
console.table(columns);

db.close();
