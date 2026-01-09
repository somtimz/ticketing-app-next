PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_tickets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticket_number` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`category_id` integer,
	`priority` text DEFAULT 'P3' NOT NULL,
	`status` text DEFAULT 'New' NOT NULL,
	`caller_id` integer NOT NULL,
	`assigned_agent_id` integer,
	`created_by` integer,
	`impact` text NOT NULL,
	`urgency` text NOT NULL,
	`sla_first_response_due` integer,
	`sla_resolution_due` integer,
	`resolved_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`closed_at` integer,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`caller_id`) REFERENCES `callers`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`assigned_agent_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_tickets`("id", "ticket_number", "title", "description", "category_id", "priority", "status", "caller_id", "assigned_agent_id", "created_by", "impact", "urgency", "sla_first_response_due", "sla_resolution_due", "resolved_at", "created_at", "updated_at", "closed_at") SELECT "id", "ticket_number", "title", "description", "category_id", "priority", "status", "caller_id", "assigned_agent_id", "created_by", "impact", "urgency", "sla_first_response_due", "sla_resolution_due", "resolved_at", "created_at", "updated_at", "closed_at" FROM `tickets`;--> statement-breakpoint
DROP TABLE `tickets`;--> statement-breakpoint
ALTER TABLE `__new_tickets` RENAME TO `tickets`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `tickets_ticket_number_unique` ON `tickets` (`ticket_number`);--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password_hash` text,
	`full_name` text NOT NULL,
	`role` text DEFAULT 'employee' NOT NULL,
	`saml_identity_id` text,
	`department` text,
	`location` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "email", "password_hash", "full_name", "role", "saml_identity_id", "department", "location", "is_active", "created_at", "updated_at") SELECT "id", "email", "password_hash", "full_name", "role", "saml_identity_id", "department", "location", "is_active", "created_at", "updated_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
ALTER TABLE `sla_policies` DROP COLUMN `is_active`;