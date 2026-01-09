-- Phase 5: Update ticket_status_history table with new status enum values
-- This recreates the ticket_status_history table to match new ticket status values

-- Create new ticket_status_history table with updated schema
CREATE TABLE ticket_status_history_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  from_status TEXT CHECK(from_status IN ('New', 'Assigned', 'InProgress', 'Pending', 'Resolved', 'Closed')),
  to_status TEXT NOT NULL CHECK(to_status IN ('New', 'Assigned', 'InProgress', 'Pending', 'Resolved', 'Closed')),
  changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  changed_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Migrate existing status history with status mapping
-- Status mapping:
--   'Open' → 'New' (or 'Assigned' if ticket had agent)
--   'In Progress' → 'InProgress'
--   'Resolved' → 'Resolved'
--   'Closed' → 'Closed'
INSERT INTO ticket_status_history_new (
  id, ticket_id, from_status, to_status, changed_by, notes, changed_at
)
SELECT
  id,
  ticket_id,
  CASE from_status
    WHEN 'Open' THEN 'New'
    WHEN 'In Progress' THEN 'InProgress'
    WHEN 'Resolved' THEN 'Resolved'
    WHEN 'Closed' THEN 'Closed'
    ELSE from_status
  END AS from_status,
  CASE to_status
    WHEN 'Open' THEN 'New'
    WHEN 'In Progress' THEN 'InProgress'
    WHEN 'Resolved' THEN 'Resolved'
    WHEN 'Closed' THEN 'Closed'
    ELSE to_status
  END AS to_status,
  changed_by,
  notes,
  changed_at
FROM ticket_status_history;

-- Drop old table and rename new table
DROP TABLE ticket_status_history;
ALTER TABLE ticket_status_history_new RENAME TO ticket_status_history;

SELECT 'Phase 5 ticket_status_history table migration complete' as status;
