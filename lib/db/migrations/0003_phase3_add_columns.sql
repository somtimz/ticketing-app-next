-- Phase 3: Add nullable columns to existing tables
-- This migration adds new columns safely without dynamic defaults

-- 1. Add columns to users table
ALTER TABLE users ADD COLUMN saml_identity_id text;
ALTER TABLE users ADD COLUMN department text;
ALTER TABLE users ADD COLUMN location text;

-- 2. Add columns to employees table
ALTER TABLE employees ADD COLUMN location text;
ALTER TABLE employees ADD COLUMN user_id integer REFERENCES users(id) ON DELETE SET NULL;

-- 3. Add columns to categories table
-- Note: updated_at is added as nullable since SQLite doesn't support dynamic defaults in ALTER TABLE
ALTER TABLE categories ADD COLUMN parent_category_id integer REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE categories ADD COLUMN default_agent_id integer REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE categories ADD COLUMN form_schema text;
ALTER TABLE categories ADD COLUMN updated_at integer;

-- Update existing categories to have updated_at set to current time
UPDATE categories SET updated_at = CAST(strftime('%s', 'now') AS INTEGER) WHERE updated_at IS NULL;

-- 4. Add columns to tickets table
ALTER TABLE tickets ADD COLUMN created_by integer REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE tickets ADD COLUMN impact text CHECK(impact IN ('Low', 'Medium', 'High'));
ALTER TABLE tickets ADD COLUMN urgency text CHECK(urgency IN ('Low', 'Medium', 'High'));
ALTER TABLE tickets ADD COLUMN sla_first_response_due integer;
ALTER TABLE tickets ADD COLUMN sla_resolution_due integer;

-- Set createdBy for existing tickets to assignedAgentId
UPDATE tickets SET created_by = assigned_agent_id WHERE created_by IS NULL;

SELECT 'Phase 3 migration complete' as status;
