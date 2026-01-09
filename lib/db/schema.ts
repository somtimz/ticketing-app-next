import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Users table (agents, employees, team leads, admins)
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'), // Nullable for SAML users
  fullName: text('full_name').notNull(),
  role: text('role', { enum: ['employee', 'agent', 'teamLead', 'admin'] }).notNull().default('employee'),
  samlIdentityId: text('saml_identity_id'), // For SSO accounts
  department: text('department'),
  location: text('location'),
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
  location: text('location'),
  userId: integer('user_id').references(() => users.id, {
    onDelete: 'set null'
  }),
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
  parentCategoryId: integer('parent_category_id').references(
    () => categories.id,
    { onDelete: 'set null' }
  ),
  defaultAgentId: integer('default_agent_id').references(() => users.id, {
    onDelete: 'set null'
  }),
  formSchema: text('form_schema'), // JSON defining dynamic fields per category
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
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
    enum: ['P1', 'P2', 'P3', 'P4']
  }).notNull().default('P3'),
  status: text('status', {
    enum: ['New', 'Assigned', 'InProgress', 'Pending', 'Resolved', 'Closed']
  }).notNull().default('New'),
  callerId: integer('caller_id')
    .notNull()
    .references(() => callers.id, { onDelete: 'restrict' }),
  assignedAgentId: integer('assigned_agent_id').references(() => users.id, {
    onDelete: 'set null'
  }),
  createdBy: integer('created_by').references(() => users.id, {
    onDelete: 'set null'
  }),
  impact: text('impact', { enum: ['Low', 'Medium', 'High'] }),
  urgency: text('urgency', { enum: ['Low', 'Medium', 'High'] }),
  slaFirstResponseDue: integer('sla_first_response_due', { mode: 'timestamp' }),
  slaResolutionDue: integer('sla_resolution_due', { mode: 'timestamp' }),
  resolutionNotes: text('resolution_notes'),
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
    enum: ['New', 'Assigned', 'InProgress', 'Pending', 'Resolved', 'Closed']
  }),
  toStatus: text('to_status', {
    enum: ['New', 'Assigned', 'InProgress', 'Pending', 'Resolved', 'Closed']
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

// SLA Policies table
export const slaPolicies = sqliteTable('sla_policies', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  priority: text('priority', { enum: ['P1', 'P2', 'P3', 'P4'] }).notNull().unique(),
  firstResponseMinutes: integer('first_response_minutes').notNull(),
  resolutionMinutes: integer('resolution_minutes').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`)
});

// Comments table
export const comments = sqliteTable('comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ticketId: integer('ticket_id')
    .notNull()
    .references(() => tickets.id, { onDelete: 'cascade' }),
  body: text('body').notNull(),
  authorId: integer('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  isInternal: integer('is_internal', { mode: 'boolean' }).notNull().default(false),
  mentions: text('mentions'), // JSON array of user IDs
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`)
});

// Knowledge Base Articles table
export const knowledgeBaseArticles = sqliteTable('knowledge_base_articles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  content: text('content').notNull(), // Markdown content
  categoryId: integer('category_id').references(() => categories.id, {
    onDelete: 'set null'
  }),
  createdBy: integer('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  viewCount: integer('view_count').notNull().default(0),
  helpfulCount: integer('helpful_count').notNull().default(0),
  notHelpfulCount: integer('not_helpful_count').notNull().default(0),
  isPublished: integer('is_published', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
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
export type SLAPolicy = typeof slaPolicies.$inferSelect;
export type NewSLAPolicy = typeof slaPolicies.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type KnowledgeBaseArticle = typeof knowledgeBaseArticles.$inferSelect;
export type NewKnowledgeBaseArticle = typeof knowledgeBaseArticles.$inferInsert;
