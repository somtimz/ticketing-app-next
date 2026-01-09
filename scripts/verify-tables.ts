import { db } from '../lib/db';
import { slaPolicies, comments, knowledgeBaseArticles } from '../lib/db/schema';

async function verifyTables() {
  console.log('Verifying new tables...');

  try {
    // Check sla_policies table
    const slaCount = await db.select().from(slaPolicies);
    console.log(`✓ sla_policies table exists (${slaCount.length} records)`);

    // Check comments table
    const commentCount = await db.select().from(comments);
    console.log(`✓ comments table exists (${commentCount.length} records)`);

    // Check knowledge_base_articles table
    const kbCount = await db.select().from(knowledgeBaseArticles);
    console.log(`✓ knowledge_base_articles table exists (${kbCount.length} records)`);

    console.log('\n✓ All new tables created successfully!');
  } catch (error: any) {
    console.error('✗ Error verifying tables:', error.message);
    process.exit(1);
  }
}

verifyTables();
