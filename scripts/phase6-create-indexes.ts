import Database from 'better-sqlite3';
import { join } from 'path';

async function createIndexes() {
  console.log('Creating performance indexes...\n');

  const dbPath = join(process.cwd(), 'data', 'ticketing.db');
  const db = new Database(dbPath);

  try {
    const indexes = [
      // Tickets table indexes
      {
        name: 'idx_tickets_status',
        sql: 'CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)'
      },
      {
        name: 'idx_tickets_priority',
        sql: 'CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority)'
      },
      {
        name: 'idx_tickets_sla_first_response',
        sql: 'CREATE INDEX IF NOT EXISTS idx_tickets_sla_first_response ON tickets(sla_first_response_due)'
      },
      {
        name: 'idx_tickets_sla_resolution',
        sql: 'CREATE INDEX IF NOT EXISTS idx_tickets_sla_resolution ON tickets(sla_resolution_due)'
      },
      {
        name: 'idx_tickets_created_by',
        sql: 'CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(created_by)'
      },
      {
        name: 'idx_tickets_assigned_agent',
        sql: 'CREATE INDEX IF NOT EXISTS idx_tickets_assigned_agent ON tickets(assigned_agent_id)'
      },
      // Comments table indexes
      {
        name: 'idx_comments_ticket',
        sql: 'CREATE INDEX IF NOT EXISTS idx_comments_ticket ON comments(ticket_id)'
      },
      {
        name: 'idx_comments_author',
        sql: 'CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id)'
      },
      // Knowledge Base indexes
      {
        name: 'idx_kb_articles_category',
        sql: 'CREATE INDEX IF NOT EXISTS idx_kb_articles_category ON knowledge_base_articles(category_id)'
      },
      {
        name: 'idx_kb_articles_created_by',
        sql: 'CREATE INDEX IF NOT EXISTS idx_kb_articles_created_by ON knowledge_base_articles(created_by)'
      },
      {
        name: 'idx_kb_articles_published',
        sql: 'CREATE INDEX IF NOT EXISTS idx_kb_articles_published ON knowledge_base_articles(is_published)'
      },
      // Users table indexes
      {
        name: 'idx_users_role',
        sql: 'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)'
      },
      {
        name: 'idx_users_department',
        sql: 'CREATE INDEX IF NOT EXISTS idx_users_department ON users(department)'
      },
      // Categories table indexes
      {
        name: 'idx_categories_parent',
        sql: 'CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_category_id)'
      },
      {
        name: 'idx_categories_default_agent',
        sql: 'CREATE INDEX IF NOT EXISTS idx_categories_default_agent ON categories(default_agent_id)'
      }
    ];

    for (const index of indexes) {
      try {
        db.exec(index.sql);
        console.log(`  ✓ Created ${index.name}`);
      } catch (err: any) {
        // Index might already exist, which is fine
        if (!err.message.includes('already exists')) {
          console.warn(`  ⚠ Warning creating ${index.name}: ${err.message}`);
        } else {
          console.log(`  ○ ${index.name} (already exists)`);
        }
      }
    }

    // Display all indexes
    console.log('\nCurrent indexes in database:');
    const allIndexes = db.prepare("SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY tbl_name, name").all() as any[];
    console.table(allIndexes);

    console.log('\n✓ Index creation complete!');
  } catch (error: any) {
    console.error('✗ Error creating indexes:', error.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

createIndexes();
