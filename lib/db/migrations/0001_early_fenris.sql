ALTER TABLE `categories` ADD `parent_category_id` integer REFERENCES categories(id);--> statement-breakpoint
ALTER TABLE `categories` ADD `default_agent_id` integer REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `categories` ADD `form_schema` text;--> statement-breakpoint
ALTER TABLE `categories` ADD `updated_at` integer DEFAULT (unixepoch()) NOT NULL;--> statement-breakpoint
ALTER TABLE `employees` ADD `location` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `user_id` integer REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `tickets` ADD `created_by` integer REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `tickets` ADD `impact` text;--> statement-breakpoint
ALTER TABLE `tickets` ADD `urgency` text;--> statement-breakpoint
ALTER TABLE `tickets` ADD `sla_first_response_due` integer;--> statement-breakpoint
ALTER TABLE `tickets` ADD `sla_resolution_due` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `saml_identity_id` text;--> statement-breakpoint
ALTER TABLE `users` ADD `department` text;--> statement-breakpoint
ALTER TABLE `users` ADD `location` text;