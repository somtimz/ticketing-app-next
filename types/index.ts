import type { Attachment } from '@/lib/db/schema';

// Database types (re-exported from schema)
export type {
  User,
  Employee,
  Caller,
  Category,
  Ticket,
  Call,
  TicketStatusHistory,
  AuditLog,
  SLAPolicy,
  Department,
  GuestUser,
  Comment,
  Attachment,
  KnowledgeBaseArticle
} from '@/lib/db/schema';

// Database insertion types (New* types from Drizzle)
export type {
  NewUser,
  NewEmployee,
  NewCaller,
  NewCategory,
  NewTicket,
  NewCall,
  NewSLAPolicy,
  NewDepartment,
  NewGuestUser,
  NewComment,
  NewAttachment,
  NewKnowledgeBaseArticle
} from '@/lib/db/schema';

// SLA and Priority types (import and re-export from lib/sla.ts)
import type { Priority, Impact, Urgency } from '@/lib/sla';
export type { Priority, Impact, Urgency };

// Ticket status type (matches database enum)
export type TicketStatus = 'New' | 'Assigned' | 'InProgress' | 'Pending' | 'Resolved' | 'Closed';

// Form & Request types
export interface CreateTicketRequest {
  title: string;
  description: string;
  category?: string;
  impact: Impact;
  urgency: Urgency;
  callerName: string;
  callerEmail?: string;
  callerPhone?: string;
  callerEmployeeId?: string;
}

export interface UpdateTicketStatusRequest {
  status: TicketStatus;
  notes?: string;
}

export interface ReassignTicketRequest {
  agentId: number;
  notes?: string;
}

export interface ResolveTicketRequest {
  resolution: string;
  triggerActions?: {
    createProblemTicket?: boolean;
    createDevPr?: boolean;
    updateKnowledgeArticle?: boolean;
  };
}

export interface AddCallRequest {
  callDirection: 'inbound' | 'outbound';
  notes?: string;
  duration?: number; // seconds
  callOutcome?: 'resolved' | 'escalated' | 'follow_up';
}

// API Response types
export interface ApiSuccessResponse<T> {
  data: T;
}

export interface ApiErrorResponse {
  error: string;
  message?: string;
  details?: unknown;
}

export interface TicketWithRelations {
  id: number;
  ticketNumber: string;
  title: string;
  description: string;
  impact: Impact;
  urgency: Urgency;
  priority: Priority;
  status: TicketStatus;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  closedAt: Date | null;
  slaFirstResponseDue: Date | null;
  slaResolutionDue: Date | null;
  lastActivityAt: Date | null;
  category: {
    id: number | null;
    name: string | null;
  } | null;
  department: {
    id: number | null;
    name: string | null;
    code: string | null;
  } | null;
  caller: {
    id: number;
    fullName: string;
    email: string | null;
    phone: string | null;
  } | null;
  guestUser: {
    id: number;
    name: string;
    email: string;
    company: string;
  } | null;
  assignedAgent: {
    id: number | null;
    fullName: string | null;
    email: string | null;
  } | null;
  suggestedTicket?: {
    id: number;
    ticketNumber: string;
    title: string;
    resolution: string | null;
  } | null;
  calls?: CallWithCaller[];
  comments?: CommentWithAuthor[];
  attachments?: Attachment[];
  resolution?: string | null;
}

export interface CommentWithAuthor {
  id: number;
  ticketId: number;
  body: string;
  isInternal: boolean;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: number;
    fullName: string;
    email: string;
    role: UserRole;
  };
  mentions?: number[]; // Array of user IDs
}

export interface CallWithCaller {
  id: number;
  ticketId: number | null;
  callerId: number | null;
  guestUserId: number | null;
  agentId: number;
  callDirection: 'inbound' | 'outbound';
  duration: number; // seconds
  notes: string;
  callOutcome: 'resolved' | 'escalated' | 'follow_up';
  createdAt: Date;
  caller?: {
    id: number;
    fullName: string;
    email: string | null;
  } | null;
  guestUser?: {
    id: number;
    name: string;
    email: string;
    company: string;
  } | null;
  agent: {
    id: number;
    fullName: string;
    email: string;
  };
}

// Component Props types
export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

// Filter types
export interface TicketFilters {
  status?: TicketStatus;
  priority?: Priority;
  impact?: Impact;
  urgency?: Urgency;
  categoryId?: number;
  assignedAgentId?: number;
  callerSearch?: string;
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// Utility types
export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

// Legacy type aliases for backward compatibility
// @deprecated Use Priority instead
export type TicketPriority = Priority;

// Call direction (matches new database enum)
export type CallDirection = 'inbound' | 'outbound';

// Call outcome (matches database enum)
export type CallOutcome = 'resolved' | 'escalated' | 'follow_up';

// Legacy call type (deprecated, use CallDirection instead)
export type CallType = 'inbound' | 'outbound' | 'email';

// User roles (matches database enum)
export type UserRole = 'Employee' | 'Agent' | 'TeamLead' | 'Admin';
