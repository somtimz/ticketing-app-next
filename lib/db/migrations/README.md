# Database Migrations

This directory contains SQL migration scripts for aligning the ticketing application database schema with the IT Help Desk design document.

## Migration Phases

### Phase 1: Preparation ✓
- **Status:** Complete
- **Files:**
  - `data/ticketing.backup.db` - Database backup
  - `data/backups/pre-migration-*.json` - JSON data export

### Phase 2: Create New Tables
- **Files:**
  - `0002_create_sla_policies.sql` - Create slaPolicies table
  - `0003_create_comments.sql` - Create comments table
  - `0004_create_kb_articles.sql` - Create knowledgeBaseArticles table
- **Rollback:** `rollback_phase_2.sql`

### Phase 3: Non-Breaking Table Modifications
- **Files:**
  - `0005_add_columns_users.sql` - Add samlIdentityId, department, location
  - `0006_add_columns_employees.sql` - Add location, userId
  - `0007_add_columns_categories.sql` - Add parentCategoryId, defaultAgentId, formSchema
  - `0008_add_columns_tickets.sql` - Add impact, urgency, SLA fields
- **Rollback:** `rollback_phase_3.sql`

### Phase 4: Tickets Table Complex Migration
- **Files:**
  - `0009_migrate_tickets_data.sql` - Migrate existing ticket data
  - `0010_rename_ticket_resolution.sql` - Rename resolution column
  - `0011_recreate_tickets_table.sql` - Recreate with new enums
- **Rollback:** `rollback_phase_4.sql`

### Phase 5: Update Related Tables
- **Files:**
  - `0012_update_users_role_enum.sql` - Update users table for new roles
  - `0013_update_status_history_enum.sql` - Update statusHistory enum
- **Rollback:** `rollback_phase_5.sql`

### Phase 6: Post-Migration Cleanup
- **Files:**
  - `0014_calculate_sla_deadlines.sql` - Calculate SLA for existing tickets
  - `0015_create_indexes.sql` - Create performance indexes
- **Rollback:** `rollback_phase_6.sql`

## Rollback Procedure

To rollback to pre-migration state:

1. Stop the application
2. Restore database backup:
   ```bash
   cp data/ticketing.backup.db data/ticketing.db
   ```
3. (Optional) Revert code changes to pre-migration commit
4. Restart the application

## Migration Execution

Run migrations in order:
```bash
# Using Drizzle Kit
npx drizzle-kit migrate

# Or manually with sqlite3
sqlite3 data/ticketing.db < lib/db/migrations/0002_create_sla_policies.sql
# ... repeat for each migration file
```
