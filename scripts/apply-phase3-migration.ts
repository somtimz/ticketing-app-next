import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

async function applyPhase3Migration() {
  console.log('Applying Phase 3 migration...');

  const dbPath = join(process.cwd(), 'data', 'ticketing.db');
  const db = new Database(dbPath);

  try {
    const migrationSQL = readFileSync(
      join(process.cwd(), 'lib', 'db', 'migrations', '0003_phase3_add_columns.sql'),
      'utf-8'
    );

    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    // Remove SQL comments and split by semicolons
    const cleanedSQL = migrationSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');

    const statements = cleanedSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      if (statement) {
        try {
          db.exec(statement);
        } catch (err: any) {
          // Ignore duplicate column errors
          if (!err.message.includes('duplicate column')) {
            console.error('Error executing statement:', statement);
            throw err;
          }
        }
      }
    }

    console.log('✓ Phase 3 migration applied successfully!');
  } catch (error: any) {
    console.error('✗ Error applying migration:', error.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

applyPhase3Migration();
