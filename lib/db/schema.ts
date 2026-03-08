import { pgTable, serial, text, integer, boolean, timestamp, numeric, uniqueIndex } from 'drizzle-orm/pg-core';
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
  role: text('role', { enum: ['Employee', 'Agent', 'TeamLead', 'Admin', 'Client'] }).notNull().default('Employee'),
  samlIdentityId: text('saml_identity_id'), // For SSO accounts
  departmentId: integer('department_id').references(() => departments.id, {
    onDelete: 'set null'
  }),
  location: text('location'),
  isActive: boolean('is_active').notNull().default(true),
  customerId: integer('customer_id').references(() => customers.id, { onDelete: 'set null' }),
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
    enum: ['New', 'Assigned', 'InProgress', 'On Hold', 'Resolved', 'Closed']
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
  customerId: integer('customer_id').references(() => customers.id, {
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
  slaHeldAt: timestamp('sla_held_at'), // Set when ticket enters 'On Hold'; cleared when resumed
  totalHoldMinutes: integer('total_hold_minutes').notNull().default(0), // Cumulative hold time in minutes
  slaBreachNotifiedAt: timestamp('sla_breach_notified_at'), // Last time a breach notification was sent
  isMajorIncident: boolean('is_major_incident').notNull().default(false),
  majorIncidentNotes: text('major_incident_notes'),
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
    enum: ['New', 'Assigned', 'InProgress', 'On Hold', 'Resolved', 'Closed']
  }),
  toStatus: text('to_status', {
    enum: ['New', 'Assigned', 'InProgress', 'On Hold', 'Resolved', 'Closed']
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
  isAgentOnly: boolean('is_agent_only').notNull().default(false),
  publishedAt: timestamp('published_at'),
  // Phase 2A additions
  articleType: text('article_type', { enum: ['FAQ', 'HowTo', 'KnownError', 'General'] }).notNull().default('General'),
  expiresAt: timestamp('expires_at'),
  reviewStatus: text('review_status', { enum: ['Draft', 'InReview', 'Published'] }).notNull().default('Draft'),
  reviewedById: integer('reviewed_by_id').references(() => users.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at')
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at')
    .notNull()
    .default(sql`now()`)
});

// Knowledge Base Tags table
export const kbTags = pgTable('kb_tags', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at')
    .notNull()
    .default(sql`now()`)
});

// Article ↔ Tag join table (many-to-many)
export const articleTags = pgTable('article_tags', {
  articleId: integer('article_id')
    .notNull()
    .references(() => knowledgeBaseArticles.id, { onDelete: 'cascade' }),
  tagId: integer('tag_id')
    .notNull()
    .references(() => kbTags.id, { onDelete: 'cascade' })
});

// Assets table
export const assets = pgTable('assets', {
  id: serial('id').primaryKey(),
  assetTag: text('asset_tag').notNull().unique(), // e.g. AST-0001
  name: text('name').notNull(),
  type: text('type', { enum: ['Hardware', 'Software'] }).notNull(),
  make: text('make'),
  model: text('model'),
  serialNumber: text('serial_number'), // hardware serial OR software license key
  status: text('status', { enum: ['Active', 'In Repair', 'Retired'] }).notNull().default('Active'),
  location: text('location'),
  purchaseDate: timestamp('purchase_date'),
  warrantyExpiry: timestamp('warranty_expiry'),
  cost: numeric('cost', { precision: 10, scale: 2 }), // e.g. "1299.99"
  assignedUserId: integer('assigned_user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`)
});

// Asset assignment history
export const assetHistory = pgTable('asset_history', {
  id: serial('id').primaryKey(),
  assetId: integer('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  assignedToUserId: integer('assigned_to_user_id').references(() => users.id, { onDelete: 'set null' }),
  assignedByUserId: integer('assigned_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  assignedAt: timestamp('assigned_at').notNull().default(sql`now()`),
  returnedAt: timestamp('returned_at'),
  notes: text('notes')
});

// Service Catalog Items table (Phase 2D)
export const catalogItems = pgTable('catalog_items', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: text('category', {
    enum: ['New Equipment', 'Software Access', 'Account Setup', 'Hardware Repair', 'Other']
  }).notNull(),
  estimatedSLAHours: integer('estimated_sla_hours').notNull().default(24),
  eligibleRoles: text('eligible_roles').notNull().default('[]'), // JSON array of roles
  icon: text('icon'), // emoji or icon name
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`)
});

// Service Requests table (REQ-XXXX)
export const serviceRequests = pgTable('service_requests', {
  id: serial('id').primaryKey(),
  requestNumber: text('request_number').notNull().unique(), // e.g. REQ-0001
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: text('category', {
    enum: ['New Equipment', 'Software Access', 'Account Setup', 'Hardware Repair', 'Other']
  }).notNull(),
  status: text('status', {
    enum: ['Submitted', 'Approved', 'In Progress', 'Fulfilled', 'Rejected']
  }).notNull().default('Submitted'),
  priority: text('priority', { enum: ['P1', 'P2', 'P3', 'P4'] }).notNull().default('P3'),
  requesterId: integer('requester_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  assignedAgentId: integer('assigned_agent_id').references(() => users.id, { onDelete: 'set null' }),
  customerId: integer('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  catalogItemId: integer('catalog_item_id').references(() => catalogItems.id, { onDelete: 'set null' }), // Phase 2D
  approvedById: integer('approved_by_id').references(() => users.id, { onDelete: 'set null' }),
  approvedAt: timestamp('approved_at'),
  fulfilledAt: timestamp('fulfilled_at'),
  rejectionReason: text('rejection_reason'),
  slaResolutionDue: timestamp('sla_resolution_due'), // Phase 2E
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`)
});

// Service Request Comments
export const serviceRequestComments = pgTable('service_request_comments', {
  id: serial('id').primaryKey(),
  serviceRequestId: integer('service_request_id').notNull().references(() => serviceRequests.id, { onDelete: 'cascade' }),
  body: text('body').notNull(),
  authorId: integer('author_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at').notNull().default(sql`now()`)
});

// Customers table (external contacts linked to tickets and service requests)
export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  company: text('company'),
  notes: text('notes'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`)
});

// Client portal invite tokens
export const clientInvites = pgTable('client_invites', {
  id: serial('id').primaryKey(),
  email: text('email').notNull(),
  token: text('token').notNull().unique(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
  claimedAt: timestamp('claimed_at'),
  createdAt: timestamp('created_at').notNull().default(sql`now()`)
});

export type ClientInvite = typeof clientInvites.$inferSelect;
export type NewClientInvite = typeof clientInvites.$inferInsert;

// Asset ↔ Ticket/ServiceRequest links
export const assetLinks = pgTable('asset_links', {
  id: serial('id').primaryKey(),
  assetId: integer('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  ticketId: integer('ticket_id').references(() => tickets.id, { onDelete: 'cascade' }),
  serviceRequestId: integer('service_request_id').references(() => serviceRequests.id, { onDelete: 'cascade' }),
  linkedByUserId: integer('linked_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  linkedAt: timestamp('linked_at').notNull().default(sql`now()`)
});

// Escalation Rules table (Phase 1C)
export const escalationRules = pgTable('escalation_rules', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  priority: text('priority', { enum: ['P1', 'P2', 'P3', 'P4'] }).notNull(),
  minutesBeforeBreach: integer('minutes_before_breach').notNull(), // Negative = after breach (e.g. 30 = 30 min before; -30 = 30 min after)
  action: text('action', {
    enum: ['notify_teamlead', 'notify_admin', 'reassign']
  }).notNull(),
  reassignToAgentId: integer('reassign_to_agent_id').references(() => users.id, { onDelete: 'set null' }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`)
});

// ── Phase 2C: KB Article Comments ─────────────────────────────────────────────
export const kbComments = pgTable('kb_comments', {
  id: serial('id').primaryKey(),
  articleId: integer('article_id').notNull().references(() => knowledgeBaseArticles.id, { onDelete: 'cascade' }),
  authorId: integer('author_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`)
});

// ── Phase 2F: SR Multi-step Approval Steps ────────────────────────────────────
export const approvalSteps = pgTable('approval_steps', {
  id: serial('id').primaryKey(),
  serviceRequestId: integer('service_request_id').notNull().references(() => serviceRequests.id, { onDelete: 'cascade' }),
  stepOrder: integer('step_order').notNull().default(1),
  approverId: integer('approver_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  status: text('status', { enum: ['Pending', 'Approved', 'Rejected'] }).notNull().default('Pending'),
  respondedAt: timestamp('responded_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().default(sql`now()`)
});

// ── Phase 3D: Response Templates ─────────────────────────────────────────────
export const responseTemplates = pgTable('response_templates', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  category: text('category'), // optional grouping label
  createdById: integer('created_by_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  isGlobal: boolean('is_global').notNull().default(false), // visible to all agents
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`)
});

// ── Phase 3E: Comment Mentions ────────────────────────────────────────────────
export const commentMentions = pgTable('comment_mentions', {
  id: serial('id').primaryKey(),
  commentId: integer('comment_id').notNull().references(() => comments.id, { onDelete: 'cascade' }),
  mentionedUserId: integer('mentioned_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().default(sql`now()`)
});

// ── Phase 3F: In-App Notifications ───────────────────────────────────────────
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type', {
    enum: ['assigned', 'comment', 'mention', 'sla_breach', 'sr_approval', 'major_incident', 'escalation']
  }).notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  linkUrl: text('link_url'),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').notNull().default(sql`now()`)
});

// ── Phase 4: Problem Management ───────────────────────────────────────────────
export const problems = pgTable('problems', {
  id: serial('id').primaryKey(),
  problemNumber: text('problem_number').notNull().unique(), // PRB-0001
  title: text('title').notNull(),
  description: text('description').notNull(),
  status: text('status', {
    enum: ['New', 'Under Investigation', 'Known Error', 'Resolved', 'Closed']
  }).notNull().default('New'),
  priority: text('priority', { enum: ['P1', 'P2', 'P3', 'P4'] }).notNull().default('P3'),
  assignedAgentId: integer('assigned_agent_id').references(() => users.id, { onDelete: 'set null' }),
  createdById: integer('created_by_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  rootCause: text('root_cause'),
  workaround: text('workaround'),
  resolvedAt: timestamp('resolved_at'),
  closedAt: timestamp('closed_at'),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`)
});

// Problem ↔ Incident links (many-to-many)
export const problemIncidents = pgTable('problem_incidents', {
  id: serial('id').primaryKey(),
  problemId: integer('problem_id').notNull().references(() => problems.id, { onDelete: 'cascade' }),
  ticketId: integer('ticket_id').notNull().references(() => tickets.id, { onDelete: 'cascade' }),
  linkedAt: timestamp('linked_at').notNull().default(sql`now()`)
});

// Known Error Database (KEDB)
export const knownErrors = pgTable('known_errors', {
  id: serial('id').primaryKey(),
  problemId: integer('problem_id').notNull().references(() => problems.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  workaroundDescription: text('workaround_description').notNull(),
  linkedArticleId: integer('linked_article_id').references(() => knowledgeBaseArticles.id, { onDelete: 'set null' }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`)
});

// ── Phase 5: Change Management ────────────────────────────────────────────────
export const changes = pgTable('changes', {
  id: serial('id').primaryKey(),
  changeNumber: text('change_number').notNull().unique(), // CHG-0001
  title: text('title').notNull(),
  description: text('description').notNull(),
  changeType: text('change_type', { enum: ['Standard', 'Normal', 'Emergency'] }).notNull().default('Normal'),
  status: text('status', {
    enum: ['Draft', 'Submitted', 'CAB Review', 'Approved', 'Scheduled', 'In Progress', 'Completed', 'Failed', 'Cancelled']
  }).notNull().default('Draft'),
  riskLevel: text('risk_level', { enum: ['Low', 'Medium', 'High', 'Critical'] }).notNull().default('Medium'),
  impactLevel: text('impact_level', { enum: ['Low', 'Medium', 'High'] }).notNull().default('Medium'),
  implementationPlan: text('implementation_plan'),
  backoutPlan: text('backout_plan'),
  scheduledStart: timestamp('scheduled_start'),
  scheduledEnd: timestamp('scheduled_end'),
  assignedAgentId: integer('assigned_agent_id').references(() => users.id, { onDelete: 'set null' }),
  createdById: integer('created_by_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  approvedById: integer('approved_by_id').references(() => users.id, { onDelete: 'set null' }),
  approvedAt: timestamp('approved_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`)
});

// CAB / Change Approvals
export const changeApprovals = pgTable('change_approvals', {
  id: serial('id').primaryKey(),
  changeId: integer('change_id').notNull().references(() => changes.id, { onDelete: 'cascade' }),
  approverId: integer('approver_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  role: text('role').notNull(), // descriptive label e.g. 'CAB Member', 'IT Lead'
  status: text('status', { enum: ['Pending', 'Approved', 'Rejected'] }).notNull().default('Pending'),
  respondedAt: timestamp('responded_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().default(sql`now()`)
});

// Change ↔ Affected CIs
export const changeAffectedCIs = pgTable('change_affected_cis', {
  id: serial('id').primaryKey(),
  changeId: integer('change_id').notNull().references(() => changes.id, { onDelete: 'cascade' }),
  assetId: integer('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  linkedAt: timestamp('linked_at').notNull().default(sql`now()`)
});

// Change freeze windows
export const changeFreeze = pgTable('change_freeze', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  reason: text('reason'),
  createdById: integer('created_by_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at').notNull().default(sql`now()`)
});

// Change ↔ Incident/Problem links
export const changeLinks = pgTable('change_links', {
  id: serial('id').primaryKey(),
  changeId: integer('change_id').notNull().references(() => changes.id, { onDelete: 'cascade' }),
  ticketId: integer('ticket_id').references(() => tickets.id, { onDelete: 'cascade' }),
  problemId: integer('problem_id').references(() => problems.id, { onDelete: 'cascade' }),
  linkedAt: timestamp('linked_at').notNull().default(sql`now()`)
});

// ── Type exports ───────────────────────────────────────────────────────────────
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
export type KbTag = typeof kbTags.$inferSelect;
export type NewKbTag = typeof kbTags.$inferInsert;
export type ArticleTag = typeof articleTags.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
export type AssetHistory = typeof assetHistory.$inferSelect;
export type NewAssetHistory = typeof assetHistory.$inferInsert;
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type NewServiceRequest = typeof serviceRequests.$inferInsert;
export type ServiceRequestComment = typeof serviceRequestComments.$inferSelect;
export type NewServiceRequestComment = typeof serviceRequestComments.$inferInsert;
export type AssetLink = typeof assetLinks.$inferSelect;
export type NewAssetLink = typeof assetLinks.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type EscalationRule = typeof escalationRules.$inferSelect;
export type NewEscalationRule = typeof escalationRules.$inferInsert;
export type CatalogItem = typeof catalogItems.$inferSelect;
export type NewCatalogItem = typeof catalogItems.$inferInsert;
export type KbComment = typeof kbComments.$inferSelect;
export type NewKbComment = typeof kbComments.$inferInsert;
export type ApprovalStep = typeof approvalSteps.$inferSelect;
export type NewApprovalStep = typeof approvalSteps.$inferInsert;
export type ResponseTemplate = typeof responseTemplates.$inferSelect;
export type NewResponseTemplate = typeof responseTemplates.$inferInsert;
export type CommentMention = typeof commentMentions.$inferSelect;
export type NewCommentMention = typeof commentMentions.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type Problem = typeof problems.$inferSelect;
export type NewProblem = typeof problems.$inferInsert;
export type ProblemIncident = typeof problemIncidents.$inferSelect;
export type NewProblemIncident = typeof problemIncidents.$inferInsert;
export type KnownError = typeof knownErrors.$inferSelect;
export type NewKnownError = typeof knownErrors.$inferInsert;
export type Change = typeof changes.$inferSelect;
export type NewChange = typeof changes.$inferInsert;
export type ChangeApproval = typeof changeApprovals.$inferSelect;
export type NewChangeApproval = typeof changeApprovals.$inferInsert;
export type ChangeAffectedCI = typeof changeAffectedCIs.$inferSelect;
export type NewChangeAffectedCI = typeof changeAffectedCIs.$inferInsert;
export type ChangeFreeze = typeof changeFreeze.$inferSelect;
export type NewChangeFreeze = typeof changeFreeze.$inferInsert;
export type ChangeLink = typeof changeLinks.$inferSelect;
export type NewChangeLink = typeof changeLinks.$inferInsert;
