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
  SlaPolicy
} from '@/lib/db/schema';

// Database insertion types (New* types from Drizzle)
export type {
  NewUser,
  NewEmployee,
  NewCaller,
  NewCategory,
  NewTicket,
  NewCall,
  NewSlaPolicy
} from '@/lib/db/schema';

// SLA and Priority types (import and re-export from lib/sla.ts)
import type { Priority, Impact, Urgency } from '@/lib/sla';
export type { Priority, Impact, Urgency };

// SLA utility types
export interface SLAPolicy {
  id: number;
  priority: Priority;
  firstResponseMinutes: number;
  resolutionMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

// Ticket status type (matches current database enum)
// TODO: Update to 'New' | 'Assigned' | 'InProgress' | 'Pending' | 'Resolved' | 'Closed' after database migration
export type TicketStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';

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
  callType: 'inbound' | 'outbound' | 'email';
  notes?: string;
  durationSeconds?: number;
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
  category: {
    id: number | null;
    name: string | null;
  } | null;
  caller: {
    id: number;
    fullName: string;
    email: string | null;
    phone: string | null;
  };
  assignedAgent: {
    id: number | null;
    fullName: string | null;
    email: string | null;
  } | null;
  calls?: CallWithCaller[];
  resolution?: string | null;
}

export interface CallWithCaller {
  id: number;
  ticketId: number;
  callerId: number;
  agentId: number;
  callType: 'inbound' | 'outbound' | 'email';
  notes: string | null;
  durationSeconds: number | null;
  createdAt: Date;
  caller: {
    id: number;
    fullName: string;
    email: string | null;
  };
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

export type CallType = 'inbound' | 'outbound' | 'email';

// User roles (matches database enum)
export type UserRole = 'Employee' | 'Agent' | 'TeamLead' | 'Admin';
