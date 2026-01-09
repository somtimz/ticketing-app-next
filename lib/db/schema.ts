import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Users table (agents)
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name').notNull(),
  role: text('role', { enum: ['agent', 'admin'] }).notNull().default('agent'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`)
});

// Employees table (from directory integration)
export const employees = sqliteTable('employees', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  employeeId: text('employee_id').notNull().unique(),
  email: text('email').notNull().unique(),
  fullName: text('full_name').notNull(),
  department: text('department'),
  phone: text('phone'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`)
});

// Callers table (employees + guests)
export const callers = sqliteTable('callers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fullName: text('full_name').notNull(),
  email: text('email'),
  phone: text('phone'),
  employeeReferenceId: integer('employee_reference_id').references(
    () => employees.id,
    { onDelete: 'set null' }
  ),
  isGuest: integer('is_guest', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`)
});

// Categories table
export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  description: text('description'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`)
});

// Tickets table
export const tickets = sqliteTable('tickets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ticketNumber: text('ticket_number').notNull().unique(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  categoryId: integer('category_id').references(() => categories.id, {
    onDelete: 'set null'
  }),
  priority: text('priority', {
    enum: ['Low', 'Medium', 'High', 'Critical']
  }).notNull().default('Medium'),
  status: text('status', {
    enum: ['Open', 'In Progress', 'Resolved', 'Closed']
  }).notNull().default('Open'),
  callerId: integer('caller_id')
    .notNull()
    .references(() => callers.id, { onDelete: 'restrict' }),
  assignedAgentId: integer('assigned_agent_id').references(() => users.id, {
    onDelete: 'set null'
  }),
  resolution: text('resolution'),
  resolvedAt: integer('resolved_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  closedAt: integer('closed_at', { mode: 'timestamp' })
});

// Calls table (phone/email interactions)
export const calls = sqliteTable('calls', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ticketId: integer('ticket_id')
    .notNull()
    .references(() => tickets.id, { onDelete: 'cascade' }),
  callerId: integer('caller_id')
    .notNull()
    .references(() => callers.id, { onDelete: 'restrict' }),
  agentId: integer('agent_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  callType: text('call_type', {
    enum: ['inbound', 'outbound', 'email']
  }).notNull(),
  notes: text('notes'),
  durationSeconds: integer('duration_seconds'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`)
});

// Ticket status history
export const ticketStatusHistory = sqliteTable('ticket_status_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ticketId: integer('ticket_id')
    .notNull()
    .references(() => tickets.id, { onDelete: 'cascade' }),
  fromStatus: text('from_status', {
    enum: ['Open', 'In Progress', 'Resolved', 'Closed']
  }),
  toStatus: text('to_status', {
    enum: ['Open', 'In Progress', 'Resolved', 'Closed']
  }).notNull(),
  changedBy: integer('changed_by').references(() => users.id, {
    onDelete: 'set null'
  }),
  notes: text('notes'),
  changedAt: integer('changed_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`)
});

// Audit log
export const auditLog = sqliteTable('audit_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entityType: text('entity_type').notNull(),
  entityId: integer('entity_id').notNull(),
  action: text('action').notNull(),
  performedBy: integer('performed_by').references(() => users.id, {
    onDelete: 'set null'
  }),
  changes: text('changes'), // JSON string of changes
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`)
});

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
export type Caller = typeof callers.$inferSelect;
export type NewCaller = typeof callers.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
export type Call = typeof calls.$inferSelect;
export type NewCall = typeof calls.$inferInsert;
export type TicketStatusHistory = typeof ticketStatusHistory.$inferSelect;
export type NewTicketStatusHistory = typeof ticketStatusHistory.$inferInsert;
export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;
