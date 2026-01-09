-- Rollback Phase 3: Remove added columns
-- This script removes the columns added in Phase 3

-- SQLite doesn't support DROP COLUMN directly
-- Need to recreate tables without the new columns

-- Recreate users table without new columns
CREATE TABLE users_rollback AS SELECT
  id, email, passwordHash, fullName, role, isActive, createdAt, updatedAt
FROM users;

DROP TABLE users;
ALTER TABLE users_rollback RENAME TO users;

-- Recreate employees table without new columns
CREATE TABLE employees_rollback AS SELECT
  id, employeeId, email, fullName, department, phone, isActive, createdAt, updatedAt
FROM employees;

DROP TABLE employees;
ALTER TABLE employees_rollback RENAME TO employees;

-- Recreate categories table without new columns
CREATE TABLE categories_rollback AS SELECT
  id, name, description, isActive, createdAt
FROM categories;

DROP TABLE categories;
ALTER TABLE categories_rollback RENAME TO categories;

-- Recreate tickets table without new columns (keep original structure)
-- Note: This is simplified - may need adjustment based on actual migration
CREATE TABLE tickets_rollback AS SELECT
  id, ticketNumber, title, description, categoryId, priority, status,
  callerId, assignedAgentId, resolution, resolvedAt, createdAt, updatedAt, closedAt
FROM tickets;

DROP TABLE tickets;
ALTER TABLE tickets_rollback RENAME TO tickets;

SELECT 'Rollback Phase 3 complete' as status;
