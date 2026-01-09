-- Create SLA policies table
CREATE TABLE `sla_policies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`priority` text NOT NULL,
	`first_response_minutes` integer NOT NULL,
	`resolution_minutes` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);

-- Recreate tickets table with new SLA fields
PRAGMA foreign_keys=OFF;

CREATE TABLE `__new_tickets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticket_number` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`category_id` integer,
	`impact` text DEFAULT 'Medium' NOT NULL,
	`urgency` text DEFAULT 'Medium' NOT NULL,
	`priority` text DEFAULT 'P3' NOT NULL,
	`status` text DEFAULT 'Open' NOT NULL,
	`caller_id` integer NOT NULL,
	`assigned_agent_id` integer,
	`resolution` text,
	`sla_first_response_due` integer,
	`sla_resolution_due` integer,
	`resolved_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`closed_at` integer,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`caller_id`) REFERENCES `callers`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`assigned_agent_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);

-- Migrate data from old tickets table to new one
-- Map old priority values to new P1-P4 system
-- Critical -> P1, High -> P2, Medium -> P3, Low -> P4
INSERT INTO `__new_tickets`(
  "id", "ticket_number", "title", "description", "category_id",
  "impact", "urgency", "priority", "status",
  "caller_id", "assigned_agent_id", "resolution",
  "sla_first_response_due", "sla_resolution_due", "resolved_at",
  "created_at", "updated_at", "closed_at"
)
SELECT
  "id", "ticket_number", "title", "description", "category_id",
  'Medium', 'Medium',
  CASE
    WHEN priority = 'Critical' THEN 'P1'
    WHEN priority = 'High' THEN 'P2'
    WHEN priority = 'Medium' THEN 'P3'
    WHEN priority = 'Low' THEN 'P4'
    ELSE 'P3'
  END,
  "status", "caller_id", "assigned_agent_id", "resolution",
  NULL, NULL, "resolved_at",
  "created_at", "updated_at", "closed_at"
FROM `tickets`;

DROP TABLE `tickets`;
ALTER TABLE `__new_tickets` RENAME TO `tickets`;
PRAGMA foreign_keys=ON;

-- Recreate unique index
CREATE UNIQUE INDEX `tickets_ticket_number_unique` ON `tickets` (`ticket_number`);
