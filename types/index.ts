// Database types (re-exported from schema)
export type {
  User,
  Employee,
  Caller,
  Category,
  Ticket,
  Call,
  TicketStatusHistory,
  AuditLog
} from '@/lib/db/schema';

// Database insertion types (New* types from Drizzle)
export type {
  NewUser,
  NewEmployee,
  NewCaller,
  NewCategory,
  NewTicket,
  NewCall
} from '@/lib/db/schema';

// Form & Request types
export interface CreateTicketRequest {
  title: string;
  description: string;
  category?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  callerName: string;
  callerEmail?: string;
  callerPhone?: string;
  callerEmployeeId?: string;
}

export interface UpdateTicketStatusRequest {
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
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
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  closedAt: Date | null;
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
  status?: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
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

export type TicketStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type CallType = 'inbound' | 'outbound' | 'email';
export type UserRole = 'agent' | 'admin';
