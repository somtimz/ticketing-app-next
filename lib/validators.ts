import { z } from 'zod';

// Ticket schemas
export const createTicketSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(5000, 'Description is too long'),
  category: z.string().optional(),
  impact: z.enum(['Low', 'Medium', 'High'], {
    errorMap: () => ({ message: 'Impact must be Low, Medium, or High' })
  }),
  urgency: z.enum(['Low', 'Medium', 'High'], {
    errorMap: () => ({ message: 'Urgency must be Low, Medium, or High' })
  }),
  callerName: z.string().min(1, 'Caller name is required'),
  callerEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  callerPhone: z.string().optional(),
  callerEmployeeId: z.string().optional()
});

export const updateTicketStatusSchema = z.object({
  status: z.enum(['New', 'Assigned', 'InProgress', 'On Hold', 'Resolved', 'Closed'], {
    errorMap: () => ({ message: 'Invalid status value' })
  }),
  notes: z.string().optional()
});

export const reassignTicketSchema = z.object({
  agentId: z.number().int().positive('Agent ID must be a positive integer'),
  notes: z.string().optional()
});

export const resolveTicketSchema = z.object({
  resolution: z.string().min(1, 'Resolution is required'),
  triggerActions: z
    .object({
      createProblemTicket: z.boolean().optional(),
      createDevPr: z.boolean().optional(),
      updateKnowledgeArticle: z.boolean().optional()
    })
    .optional()
});

export const addCallSchema = z.object({
  callType: z.enum(['inbound', 'outbound', 'email'], {
    errorMap: () => ({ message: 'Invalid call type' })
  }),
  notes: z.string().optional(),
  durationSeconds: z.number().int().nonnegative().optional()
});

export const employeeSearchSchema = z.object({
  q: z.string().min(1, 'Search query is required')
});

// Knowledge Base schemas
export const createKBArticleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title is too long'),
  content: z.string().min(1, 'Content is required'),
  categoryId: z.number().int().optional(),
  isPublished: z.boolean().default(false),
  isAgentOnly: z.boolean().default(false),
  tagIds: z.array(z.number().int()).optional(),
  articleType: z.enum(['FAQ', 'HowTo', 'KnownError', 'General']).optional(),
  expiresAt: z.string().datetime({ offset: true }).optional().nullable(),
  reviewStatus: z.enum(['Draft', 'InReview', 'Published']).optional()
});
export const updateKBArticleSchema = createKBArticleSchema.partial();
export type CreateKBArticleInput = z.infer<typeof createKBArticleSchema>;
export type UpdateKBArticleInput = z.infer<typeof updateKBArticleSchema>;

// Type exports from schemas
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>;
export type ReassignTicketInput = z.infer<typeof reassignTicketSchema>;
export type ResolveTicketInput = z.infer<typeof resolveTicketSchema>;
export type AddCallInput = z.infer<typeof addCallSchema>;
export type EmployeeSearchInput = z.infer<typeof employeeSearchSchema>;

// Asset schemas
export const createAssetSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  type: z.enum(['Hardware', 'Software']),
  make: z.string().max(100).optional(),
  model: z.string().max(200).optional(),
  serialNumber: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
  purchaseDate: z.string().datetime().optional().nullable(),
  warrantyExpiry: z.string().datetime().optional().nullable(),
  cost: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid cost format').optional().nullable(),
  assignedUserId: z.number().int().positive().optional().nullable()
});
export const updateAssetSchema = createAssetSchema.partial();
export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;

export const assignAssetSchema = z.object({
  userId: z.number().int().positive('User ID is required'),
  notes: z.string().max(500).optional()
});
export type AssignAssetInput = z.infer<typeof assignAssetSchema>;

// Service Request schemas
export const createServiceRequestSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required').max(5000),
  category: z.enum(['New Equipment', 'Software Access', 'Account Setup', 'Hardware Repair', 'Other']),
  priority: z.enum(['P1', 'P2', 'P3', 'P4']).default('P3')
});
export const updateServiceRequestSchema = createServiceRequestSchema.partial();
export type CreateServiceRequestInput = z.infer<typeof createServiceRequestSchema>;
export type UpdateServiceRequestInput = z.infer<typeof updateServiceRequestSchema>;

export const serviceRequestStatusSchema = z.object({
  status: z.enum(['Approved', 'In Progress', 'Fulfilled', 'Rejected', 'Submitted']),
  rejectionReason: z.string().min(1).max(1000).optional()
}).refine(
  data => data.status !== 'Rejected' || !!data.rejectionReason,
  { message: 'Rejection reason is required when rejecting', path: ['rejectionReason'] }
);
export type ServiceRequestStatusInput = z.infer<typeof serviceRequestStatusSchema>;

export const assignServiceRequestSchema = z.object({
  agentId: z.number().int().positive('Agent ID is required')
});
export type AssignServiceRequestInput = z.infer<typeof assignServiceRequestSchema>;

export const addServiceRequestCommentSchema = z.object({
  body: z.string().min(1).max(5000)
});
export type AddServiceRequestCommentInput = z.infer<typeof addServiceRequestCommentSchema>;

// Customer schemas
export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email('Invalid email').max(200).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  company: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable()
});
export const updateCustomerSchema = createCustomerSchema.extend({
  isActive: z.boolean().optional()
}).partial();
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
