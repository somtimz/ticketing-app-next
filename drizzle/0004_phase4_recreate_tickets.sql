-- Phase 4: Recreate tickets table with new enum values
-- This is a high-risk migration that recreates the entire tickets table

-- Step 1: Create new tickets table with updated schema
CREATE TABLE tickets_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  ticket_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  priority TEXT NOT NULL DEFAULT 'P3' CHECK(priority IN ('P1', 'P2', 'P3', 'P4')),
  status TEXT NOT NULL DEFAULT 'New' CHECK(status IN ('New', 'Assigned', 'InProgress', 'Pending', 'Resolved', 'Closed')),
  caller_id INTEGER NOT NULL REFERENCES callers(id) ON DELETE RESTRICT,
  assigned_agent_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  impact TEXT CHECK(impact IN ('Low', 'Medium', 'High')),
  urgency TEXT CHECK(urgency IN ('Low', 'Medium', 'High')),
  sla_first_response_due INTEGER,
  sla_resolution_due INTEGER,
  resolutionNotes TEXT,
  resolved_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  closed_at INTEGER
);

-- Step 2: Migrate data with enum value mapping
-- Status mapping:
--   'Open' → 'New' (if unassigned) or 'Assigned' (if assigned)
--   'In Progress' → 'InProgress'
--   'Resolved' → 'Resolved'
--   'Closed' → 'Closed'
-- Priority mapping:
--   'Critical' → 'P1'
--   'High' → 'P2'
--   'Medium' → 'P3'
--   'Low' → 'P4'

INSERT INTO tickets_new (
  id, ticket_number, title, description, category_id,
  priority, status, caller_id, assigned_agent_id, created_by,
  impact, urgency, sla_first_response_due, sla_resolution_due,
  resolutionNotes, resolved_at, created_at, updated_at, closed_at
)
SELECT
  id,
  ticket_number,
  title,
  description,
  category_id,
  CASE priority
    WHEN 'Critical' THEN 'P1'
    WHEN 'High' THEN 'P2'
    WHEN 'Medium' THEN 'P3'
    WHEN 'Low' THEN 'P4'
    ELSE 'P3'
  END AS priority,
  CASE
    WHEN status = 'Open' THEN CASE WHEN assigned_agent_id IS NOT NULL THEN 'Assigned' ELSE 'New' END
    WHEN status = 'In Progress' THEN 'InProgress'
    WHEN status = 'Resolved' THEN 'Resolved'
    WHEN status = 'Closed' THEN 'Closed'
    ELSE status
  END AS status,
  caller_id,
  assigned_agent_id,
  created_by,
  impact,
  urgency,
  sla_first_response_due,
  sla_resolution_due,
  resolutionNotes,
  resolved_at,
  created_at,
  updated_at,
  closed_at
FROM tickets;

-- Step 3: Recreate indexes
CREATE UNIQUE INDEX tickets_new_ticket_number_unique ON tickets_new(ticket_number);

-- Step 4: Drop old table and rename new table
DROP TABLE tickets;
ALTER TABLE tickets_new RENAME TO tickets;

SELECT 'Phase 4 tickets table migration complete' as status;
