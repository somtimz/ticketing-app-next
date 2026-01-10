import Database from 'better-sqlite3';

const db = new Database('data/ticketing.db');
const users = db.prepare('SELECT id, email, full_name, role, is_active FROM users').all();

console.log('Users in database:');
console.table(users);

db.close();
