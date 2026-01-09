import { db } from '../lib/db';
import {
  users, employees, callers, categories, tickets, calls,
  ticketStatusHistory, auditLog
} from '../lib/db/schema';
import fs from 'fs';
import path from 'path';

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const backupDir = path.join(process.cwd(), 'data', 'backups');
const backupFile = path.join(backupDir, `pre-migration-${timestamp}.json`);

// Ensure backup directory exists
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

async function exportDatabase() {
  console.log('Exporting database to JSON...');

  const data = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    tables: {
      users: await db.select().from(users),
      employees: await db.select().from(employees),
      callers: await db.select().from(callers),
      categories: await db.select().from(categories),
      tickets: await db.select().from(tickets),
      calls: await db.select().from(calls),
      ticketStatusHistory: await db.select().from(ticketStatusHistory),
      auditLog: await db.select().from(auditLog),
    },
    counts: {
      users: 0,
      employees: 0,
      callers: 0,
      categories: 0,
      tickets: 0,
      calls: 0,
      ticketStatusHistory: 0,
      auditLog: 0,
    }
  };

  // Count records
  for (const [table, records] of Object.entries(data.tables)) {
    data.counts[table as keyof typeof data.counts] = records.length;
  }

  // Write to file
  fs.writeFileSync(backupFile, JSON.stringify(data, null, 2));

  console.log(`\n✓ Export completed!`);
  console.log(`  File: ${backupFile}`);
  console.log(`\nRecord counts:`);
  for (const [table, count] of Object.entries(data.counts)) {
    console.log(`  ${table}: ${count}`);
  }
}

exportDatabase().catch(console.error);
