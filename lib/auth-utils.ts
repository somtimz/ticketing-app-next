import type { Session } from 'next-auth';
import { hasRole as rbacHasRole, hasAnyRole as rbacHasAnyRole, type UserRole } from './rbac';

/**
 * Get the user's role from the session
 * @param session - The NextAuth session object
 * @returns The user's role as a string, or null if no session/user
 */
export function getUserRole(session: Session | null): UserRole | null {
  if (!session?.user) {
    return null;
  }
  const role = session.user.role as UserRole;
  // Return null if role is undefined or not a valid role
  if (!role || typeof role !== 'string') {
    return null;
  }
  return role;
}

/**
 * Check if the session's user has a specific role
 * This is a convenience wrapper around the RBAC hasRole function
 * @param session - The NextAuth session object
 * @param role - The role to check for
 * @returns True if the user has the required role level, false otherwise
 */
export function hasRole(session: Session | null, role: UserRole): boolean {
  return rbacHasRole(session, role);
}

/**
 * Check if the session's user has any of the specified roles
 * This is a convenience wrapper around the RBAC hasAnyRole function
 * @param session - The NextAuth session object
 * @param roles - Array of roles to check for
 * @returns True if the user has any of the required roles, false otherwise
 */
export function hasAnyRole(session: Session | null, roles: UserRole[]): boolean {
  return rbacHasAnyRole(session, roles);
}
