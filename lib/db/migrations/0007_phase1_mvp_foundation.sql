-- Phase 1: MVP Foundation
-- Adds departments, guest_users, attachments tables
-- Updates users, callers, tickets, calls tables for MVP features

PRAGMA foreign_keys=OFF;

-- Create departments table
CREATE TABLE `departments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`description` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
CREATE UNIQUE INDEX `departments_name_unique` ON `departments` (`name`);
CREATE UNIQUE INDEX `departments_code_unique` ON `departments` (`code`);

-- Create guest_users table
CREATE TABLE `guest_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`company` text NOT NULL,
	`phone` text,
	`sponsor_id` integer NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`sponsor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
CREATE UNIQUE INDEX `guest_users_email_unique` ON `guest_users` (`email`);

-- Create attachments table
CREATE TABLE `attachments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticket_id` integer NOT NULL,
	`comment_id` integer,
	`filename` text NOT NULL,
	`file_url` text NOT NULL,
	`file_size` integer NOT NULL,
	`mime_type` text NOT NULL,
	`uploaded_by` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);

-- Update users table: change department text to departmentId foreign key
CREATE TABLE `__new_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password_hash` text,
	`full_name` text NOT NULL,
	`role` text DEFAULT 'Employee' NOT NULL,
	`saml_identity_id` text,
	`department_id` integer,
	`location` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE set null
);
INSERT INTO `__new_users`("id", "email", "password_hash", "full_name", "role", "saml_identity_id", "location", "is_active", "created_at", "updated_at") SELECT "id", "email", "password_hash", "full_name", "role", "saml_identity_id", "location", "is_active", "created_at", "updated_at" FROM `users`;
DROP TABLE `users`;
ALTER TABLE `__new_users` RENAME TO `users`;
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);

-- Update callers table: add guestUserId column
CREATE TABLE `__new_callers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`full_name` text NOT NULL,
	`email` text,
	`phone` text,
	`employee_reference_id` integer,
	`guest_user_id` integer,
	`is_guest` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`employee_reference_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`guest_user_id`) REFERENCES `guest_users`(`id`) ON UPDATE no action ON DELETE set null
);
INSERT INTO `__new_callers`("id", "full_name", "email", "phone", "employee_reference_id", "is_guest", "created_at", "updated_at", "guest_user_id") SELECT "id", "full_name", "email", "phone", "employee_reference_id", "is_guest", "created_at", "updated_at", NULL FROM `callers`;
DROP TABLE `callers`;
ALTER TABLE `__new_callers` RENAME TO `callers`;

-- Update tickets table: add departmentId, guestUserId, lastActivityAt, suggestedTicketId, make callerId nullable
CREATE TABLE `__new_tickets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticket_number` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`category_id` integer,
	`priority` text DEFAULT 'P3' NOT NULL,
	`status` text DEFAULT 'New' NOT NULL,
	`caller_id` integer,
	`assigned_agent_id` integer,
	`created_by` integer,
	`department_id` integer,
	`guest_user_id` integer,
	`impact` text NOT NULL,
	`urgency` text NOT NULL,
	`resolution` text,
	`suggested_ticket_id` integer,
	`last_activity_at` integer,
	`sla_first_response_due` integer,
	`sla_resolution_due` integer,
	`resolved_at` integer,
	`closed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`caller_id`) REFERENCES `callers`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`assigned_agent_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`guest_user_id`) REFERENCES `guest_users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`suggested_ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE set null
);
INSERT INTO `__new_tickets`("id", "ticket_number", "title", "description", "category_id", "priority", "status", "caller_id", "assigned_agent_id", "created_by", "impact", "urgency", "resolution", "sla_first_response_due", "sla_resolution_due", "resolved_at", "created_at", "updated_at", "closed_at", "department_id", "guest_user_id", "suggested_ticket_id", "last_activity_at") SELECT "id", "ticket_number", "title", "description", "category_id", "priority", "status", "caller_id", "assigned_agent_id", "created_by", "impact", "urgency", "resolution", "sla_first_response_due", "sla_resolution_due", "resolved_at", "created_at", "updated_at", "closed_at", NULL, NULL, NULL, NULL FROM `tickets`;
DROP TABLE `tickets`;
ALTER TABLE `__new_tickets` RENAME TO `tickets`;
CREATE UNIQUE INDEX `tickets_ticket_number_unique` ON `tickets` (`ticket_number`);

-- Update calls table: rename durationSeconds to duration, add callDirection, callOutcome, remove call_type
CREATE TABLE `__new_calls` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticket_id` integer,
	`caller_id` integer,
	`guest_user_id` integer,
	`agent_id` integer NOT NULL,
	`call_direction` text NOT NULL,
	`duration` integer NOT NULL,
	`notes` text NOT NULL,
	`call_outcome` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`caller_id`) REFERENCES `callers`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`guest_user_id`) REFERENCES `guest_users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`agent_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
-- Map old call_type to new call_direction (inbound/outbound) and default call_outcome to 'follow_up'
INSERT INTO `__new_calls`("id", "ticket_id", "caller_id", "agent_id", "call_direction", "duration", "notes", "call_outcome", "created_at", "guest_user_id") SELECT "id", "ticket_id", "caller_id", "agent_id", CASE WHEN "call_type" = 'email' THEN 'outbound' ELSE "call_type" END, COALESCE("duration_seconds", 0), COALESCE("notes", ''), 'follow_up', "created_at", NULL FROM `calls`;
DROP TABLE `calls`;
ALTER TABLE `__new_calls` RENAME TO `calls`;

PRAGMA foreign_keys=ON;
