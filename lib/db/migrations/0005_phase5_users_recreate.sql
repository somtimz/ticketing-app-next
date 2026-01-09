-- Phase 5: Update users table with new role enum
-- This recreates the users table to support new role values

-- Create new users table with updated schema
CREATE TABLE users_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK(role IN ('employee', 'agent', 'teamLead', 'admin')),
  saml_identity_id TEXT,
  department TEXT,
  location TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Migrate existing users
-- Role mapping: agent → agent, admin → admin (no change needed)
-- All existing users keep their current roles
INSERT INTO users_new (
  id, email, password_hash, full_name, role,
  saml_identity_id, department, location,
  is_active, created_at, updated_at
)
SELECT
  id, email, password_hash, full_name, role,
  saml_identity_id, department, location,
  is_active, created_at, updated_at
FROM users;

-- Recreate unique index
CREATE UNIQUE INDEX users_new_email_unique ON users_new(email);

-- Drop old table and rename new table
DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

SELECT 'Phase 5 users table migration complete' as status;
