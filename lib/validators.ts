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
  status: z.enum(['New', 'Assigned', 'InProgress', 'Pending', 'Resolved', 'Closed'], {
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

// Type exports from schemas
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>;
export type ReassignTicketInput = z.infer<typeof reassignTicketSchema>;
export type ResolveTicketInput = z.infer<typeof resolveTicketSchema>;
export type AddCallInput = z.infer<typeof addCallSchema>;
export type EmployeeSearchInput = z.infer<typeof employeeSearchSchema>;
