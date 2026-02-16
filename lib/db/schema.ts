import { pgTable, serial, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Departments table (for team-level visibility)
export const departments = pgTable('departments', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  code: text('code').notNull().unique(), // e.g., 'ENG', 'SALES', 'HR'
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at')
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at')
    .notNull()
    .default(sql`now()`)
});

// Users table (agents, employees, team leads, admins)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'), // Nullable for SAML users
  fullName: text('full_name').notNull(),
  role: text('role', { enum: ['Employee', 'Agent', 'TeamLead', 'Admin'] }).notNull().default('Employee'),
  samlIdentityId: text('saml_identity_id'), // For SSO accounts
  departmentId: integer('department_id').references(() => departments.id, {
    onDelete: 'set null'
  }),
  location: text('location'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at')
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at')
    .notNull()
    .default(sql`now()`)
});

// Employees table (from directory integration)
export const employees = pgTable('employees', {
  id: serial('id').primaryKey(),
  employeeId: text('employee_id').notNull().unique(),
  email: text('email').notNull().unique(),
  fullName: text('full_name').notNull(),
  department: text('department'),
  phone: text('phone'),
  location: text('location'),
  userId: integer('user_id').references(() => users.id, {
    onDelete: 'set null'
  }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at')
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at')
    .notNull()
    .default(sql`now()`)
});

// Guest users table (external callers, vendors, contractors)
export const guestUsers = pgTable('guest_users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  company: text('company').notNull(),
  phone: text('phone'),
  sponsorId: integer('sponsor_id').references(() => users.id, {
    onDelete: 'restrict'
  }), // Employee who sponsors this guest
  isActive: boolean('is_active').notNull().default(true),
  notes: text('notes'),
  createdAt: timestamp('created_at')
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at')
    .notNull()
    .default(sql`now()`)
});

// Callers table (employees + guests) - legacy table, kept for compatibility
export const callers = pgTable('callers', {
  id: serial('id').primaryKey(),
  fullName: text('full_name').notNull(),
  email: text('email'),
  phone: text('phone'),
  employeeReferenceId: integer('employee_reference_id').references(
    () => employees.id,
    { onDelete: 'set null' }
  ),
  guestUserId: integer('guest_user_id').references(() => guestUsers.id, {
    onDelete: 'set null'
  }),
  isGuest: boolean('is_guest').notNull().default(false),
  createdAt: timestamp('created_at')
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at')
    .notNull()
    .default(sql`now()`)
});

// Categories table
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const categories: any = pgTable('categories', {
  id: serial('id').primaryKey(),
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
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at')
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at')
    .notNull()
    .default(sql`now()`)
});

// SLA Policies table
export const slaPolicies = pgTable('sla_policies', {
  id: serial('id').primaryKey(),
  priority: text('priority', { enum: ['P1', 'P2', 'P3', 'P4'] }).notNull().unique(),
  firstResponseMinutes: integer('first_response_minutes').notNull(),
  resolutionMinutes: integer('resolution_minutes').notNull(),
  createdAt: timestamp('created_at')
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at')
    .notNull()
    .default(sql`now()`)
});

// Tickets table
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const tickets: any = pgTable('tickets', {
  id: serial('id').primaryKey(),
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
  callerId: integer('caller_id').references(() => callers.id, {
    onDelete: 'restrict'
  }),
  assignedAgentId: integer('assigned_agent_id').references(() => users.id, {
    onDelete: 'set null'
  }),
  createdBy: integer('created_by').references(() => users.id, {
    onDelete: 'set null'
  }),
  departmentId: integer('department_id').references(() => departments.id, {
    onDelete: 'set null'
  }),
  guestUserId: integer('guest_user_id').references(() => guestUsers.id, {
    onDelete: 'set null'
  }),
  impact: text('impact', { enum: ['Low', 'Medium', 'High'] }).notNull(),
  urgency: text('urgency', { enum: ['Low', 'Medium', 'High'] }).notNull(),
  resolution: text('resolution'),
  suggestedTicketId: integer('suggested_ticket_id').references(() => tickets.id, {
    onDelete: 'set null'
  }), // Link to similar resolved ticket
  lastActivityAt: timestamp('last_activity_at'), // For auto-status transitions
  slaFirstResponseDue: timestamp('sla_first_response_due'),
  slaResolutionDue: timestamp('sla_resolution_due'),
  resolvedAt: timestamp('resolved_at'),
  closedAt: timestamp('closed_at'),
  createdAt: timestamp('created_at')
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at')
    .notNull()
    .default(sql`now()`)
});

// Calls table (phone/email interactions)
export const calls = pgTable('calls', {
  id: serial('id').primaryKey(),
  ticketId: integer('ticket_id').references(() => tickets.id, {
    onDelete: 'cascade'
  }),
  callerId: integer('caller_id').references(() => callers.id, {
    onDelete: 'restrict'
  }),
  guestUserId: integer('guest_user_id').references(() => guestUsers.id, {
    onDelete: 'set null'
  }),
  agentId: integer('agent_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  callDirection: text('call_direction', {
    enum: ['inbound', 'outbound']
  }).notNull(),
  duration: integer('duration').notNull(), // Duration in seconds
  notes: text('notes').notNull(),
  callOutcome: text('call_outcome', {
    enum: ['resolved', 'escalated', 'follow_up']
  }).notNull(),
  createdAt: timestamp('created_at')
    .notNull()
    .default(sql`now()`)
});

// Ticket status history
export const ticketStatusHistory = pgTable('ticket_status_history', {
  id: serial('id').primaryKey(),
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
  changedAt: timestamp('changed_at')
    .notNull()
    .default(sql`now()`)
});

// Audit log
export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  entityType: text('entity_type').notNull(),
  entityId: integer('entity_id').notNull(),
  action: text('action').notNull(),
  performedBy: integer('performed_by').references(() => users.id, {
    onDelete: 'set null'
  }),
  changes: text('changes'), // JSON string of changes
  createdAt: timestamp('created_at')
    .notNull()
    .default(sql`now()`)
});

// Comments table
export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  ticketId: integer('ticket_id')
    .notNull()
    .references(() => tickets.id, { onDelete: 'cascade' }),
  body: text('body').notNull(),
  authorId: integer('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  isInternal: boolean('is_internal').notNull().default(false),
  mentions: text('mentions'), // JSON array of user IDs
  createdAt: timestamp('created_at')
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at')
    .notNull()
    .default(sql`now()`)
});

// Attachments table (file uploads for tickets and comments)
export const attachments = pgTable('attachments', {
  id: serial('id').primaryKey(),
  ticketId: integer('ticket_id')
    .notNull()
    .references(() => tickets.id, { onDelete: 'cascade' }),
  commentId: integer('comment_id').references(() => comments.id, {
    onDelete: 'cascade'
  }),
  filename: text('filename').notNull(),
  fileUrl: text('file_url').notNull(), // URL to stored file (Vercel Blob, S3, etc.)
  fileSize: integer('file_size').notNull(), // Size in bytes
  mimeType: text('mime_type').notNull(),
  uploadedBy: integer('uploaded_by')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at')
    .notNull()
    .default(sql`now()`)
});

// Knowledge Base Articles table
export const knowledgeBaseArticles = pgTable('knowledge_base_articles', {
  id: serial('id').primaryKey(),
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
  isPublished: boolean('is_published').notNull().default(false),
  createdAt: timestamp('created_at')
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at')
    .notNull()
    .default(sql`now()`)
});

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;
export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
export type GuestUser = typeof guestUsers.$inferSelect;
export type NewGuestUser = typeof guestUsers.$inferInsert;
export type Caller = typeof callers.$inferSelect;
export type NewCaller = typeof callers.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type SLAPolicy = typeof slaPolicies.$inferSelect;
export type NewSLAPolicy = typeof slaPolicies.$inferInsert;
export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
export type Call = typeof calls.$inferSelect;
export type NewCall = typeof calls.$inferInsert;
export type TicketStatusHistory = typeof ticketStatusHistory.$inferSelect;
export type NewTicketStatusHistory = typeof ticketStatusHistory.$inferInsert;
export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;
export type KnowledgeBaseArticle = typeof knowledgeBaseArticles.$inferSelect;
export type NewKnowledgeBaseArticle = typeof knowledgeBaseArticles.$inferInsert;
