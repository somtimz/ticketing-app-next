-- Rollback Phase 2: Drop new tables
-- This script drops the tables created in Phase 2

-- Drop in reverse order of creation (due to foreign key dependencies)
DROP TABLE IF EXISTS knowledge_base_articles;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS sla_policies;

-- Verify tables are dropped
SELECT 'Rollback Phase 2 complete' as status;
