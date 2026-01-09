import type { Session } from 'next-auth';

export type UserRole = 'Employee' | 'Agent' | 'TeamLead' | 'Admin';

/**
 * Role hierarchy for permission inheritance
 * Higher number = more privileges
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  Employee: 0,
  Agent: 1,
  TeamLead: 2,
  Admin: 3
};

/**
 * Check if a session's user has at least the specified role level
 * Uses role hierarchy, so Admin can access Agent-level resources, etc.
 */
export function hasRole(session: Session | null, role: UserRole): boolean {
  if (!session?.user) return false;
  const userRole = session.user.role as UserRole;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[role];
}

/**
 * Check if a session's user has any of the specified roles
 */
export function hasAnyRole(session: Session | null, roles: UserRole[]): boolean {
  return roles.some(role => hasRole(session, role));
}

/**
 * Check if user can modify a specific ticket
 * - Employees can only modify their own tickets
 * - Agents can modify tickets assigned to them
 * - TeamLeads and Admins can modify any ticket
 */
export function canModifyTicket(
  session: Session | null,
  ticketAuthorId: number,
  ticketAssignedAgentId: number | null
): boolean {
  if (!session?.user) return false;
  const userId = parseInt(session.user.id);
  const userRole = session.user.role as UserRole;

  // Can view own tickets as employee
  if (userRole === 'Employee' && ticketAuthorId === userId) return true;

  // Agents can modify assigned tickets
  if (userRole === 'Agent' && ticketAssignedAgentId === userId) return true;

  // Team leads and admins can modify any ticket
  if (hasRole(session, 'TeamLead')) return true;

  return false;
}

/**
 * Check if user can assign tickets to agents
 * - Agent, TeamLead, Admin
 */
export function canAssignTickets(session: Session | null): boolean {
  return hasRole(session, 'Agent');
}

/**
 * Check if user can resolve tickets
 * - Agent, TeamLead, Admin
 */
export function canResolveTickets(session: Session | null): boolean {
  return hasRole(session, 'Agent');
}

/**
 * Check if user can view all tickets (not just their own)
 * - TeamLead, Admin
 */
export function canViewAllTickets(session: Session | null): boolean {
  return hasRole(session, 'TeamLead');
}

/**
 * Check if user can manage users (create, edit, delete)
 * - Admin only
 */
export function canManageUsers(session: Session | null): boolean {
  return hasRole(session, 'Admin');
}

/**
 * Check if user can manage categories
 * - Admin only
 */
export function canManageCategories(session: Session | null): boolean {
  return hasRole(session, 'Admin');
}

/**
 * Check if user can view analytics and reports
 * - TeamLead, Admin
 */
export function canViewAnalytics(session: Session | null): boolean {
  return hasRole(session, 'TeamLead');
}

/**
 * Check if user can manage SLA policies
 * - Admin only
 */
export function canManageSLAPolicies(session: Session | null): boolean {
  return hasRole(session, 'Admin');
}
