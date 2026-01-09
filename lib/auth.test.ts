import { describe, it, expect } from 'vitest';
import type { Session } from 'next-auth';
import { getUserRole, hasRole, hasAnyRole } from './auth-utils';
import type { UserRole } from './rbac';

/**
 * Helper to create a mock session with a specific role
 */
const createMockSession = (role: UserRole, userId: string = '1'): Session => ({
  user: {
    id: userId,
    email: 'test@example.com',
    name: 'Test User',
    role
  },
  expires: new Date(Date.now() + 3600000).toISOString()
});

/**
 * Helper to create a mock JWT with a specific role
 */
const createMockJWT = (role: UserRole, userId: string = '1'): any => ({
  role,
  id: userId,
  name: 'Test User',
  email: 'test@example.com',
  picture: null,
  sub: userId,
  iat: Date.now() / 1000,
  exp: (Date.now() + 3600000) / 1000,
  jti: 'mock-jti'
});

describe('Auth Utility Functions', () => {
  describe('getUserRole', () => {
    it('returns the role from a valid session', () => {
      const adminSession = createMockSession('Admin');
      expect(getUserRole(adminSession)).toBe('Admin');

      const agentSession = createMockSession('Agent');
      expect(getUserRole(agentSession)).toBe('Agent');

      const employeeSession = createMockSession('Employee');
      expect(getUserRole(employeeSession)).toBe('Employee');

      const teamLeadSession = createMockSession('TeamLead');
      expect(getUserRole(teamLeadSession)).toBe('TeamLead');
    });

    it('returns null for null session', () => {
      expect(getUserRole(null)).toBe(null);
    });

    it('returns null for session with no user', () => {
      const sessionWithoutUser: Session = {
        expires: new Date(Date.now() + 3600000).toISOString(),
        user: undefined as any
      };
      expect(getUserRole(sessionWithoutUser)).toBe(null);
    });

    it('returns null for session with undefined user', () => {
      const sessionWithUndefinedUser: Session = {
        expires: new Date(Date.now() + 3600000).toISOString(),
        user: undefined as any
      };
      expect(getUserRole(sessionWithUndefinedUser)).toBe(null);
    });

    it('handles all role enum values correctly', () => {
      const roles: UserRole[] = ['Employee', 'Agent', 'TeamLead', 'Admin'];
      roles.forEach(role => {
        const session = createMockSession(role);
        expect(getUserRole(session)).toBe(role);
      });
    });
  });

  describe('hasRole (auth wrapper)', () => {
    it('delegates to RBAC hasRole function', () => {
      const adminSession = createMockSession('Admin');

      // Admin should have all roles (inheritance)
      expect(hasRole(adminSession, 'Admin')).toBe(true);
      expect(hasRole(adminSession, 'TeamLead')).toBe(true);
      expect(hasRole(adminSession, 'Agent')).toBe(true);
      expect(hasRole(adminSession, 'Employee')).toBe(true);
    });

    it('returns false for null session', () => {
      expect(hasRole(null, 'Employee')).toBe(false);
      expect(hasRole(null, 'Admin')).toBe(false);
      expect(hasRole(null, 'Agent')).toBe(false);
      expect(hasRole(null, 'TeamLead')).toBe(false);
    });

    it('correctly implements role hierarchy', () => {
      // TeamLead can access Agent and Employee but not Admin
      const teamLeadSession = createMockSession('TeamLead');
      expect(hasRole(teamLeadSession, 'TeamLead')).toBe(true);
      expect(hasRole(teamLeadSession, 'Agent')).toBe(true);
      expect(hasRole(teamLeadSession, 'Employee')).toBe(true);
      expect(hasRole(teamLeadSession, 'Admin')).toBe(false);

      // Agent can access Employee but not TeamLead or Admin
      const agentSession = createMockSession('Agent');
      expect(hasRole(agentSession, 'Agent')).toBe(true);
      expect(hasRole(agentSession, 'Employee')).toBe(true);
      expect(hasRole(agentSession, 'TeamLead')).toBe(false);
      expect(hasRole(agentSession, 'Admin')).toBe(false);

      // Employee can only access Employee
      const employeeSession = createMockSession('Employee');
      expect(hasRole(employeeSession, 'Employee')).toBe(true);
      expect(hasRole(employeeSession, 'Agent')).toBe(false);
      expect(hasRole(employeeSession, 'TeamLead')).toBe(false);
      expect(hasRole(employeeSession, 'Admin')).toBe(false);
    });

    it('handles edge cases', () => {
      const session: Session = {
        expires: new Date(Date.now() + 3600000).toISOString(),
        user: undefined as any
      };

      expect(hasRole(session, 'Admin')).toBe(false);
      expect(hasRole(session, 'Employee')).toBe(false);
    });
  });

  describe('hasAnyRole (auth wrapper)', () => {
    it('delegates to RBAC hasAnyRole function', () => {
      const adminSession = createMockSession('Admin');

      // Admin should match any role combination
      expect(hasAnyRole(adminSession, ['Admin'])).toBe(true);
      expect(hasAnyRole(adminSession, ['TeamLead', 'Admin'])).toBe(true);
      expect(hasAnyRole(adminSession, ['Agent', 'TeamLead'])).toBe(true);
      expect(hasAnyRole(adminSession, ['Employee', 'Agent', 'TeamLead', 'Admin'])).toBe(true);
    });

    it('returns true when user has one of the required roles', () => {
      const agentSession = createMockSession('Agent');

      expect(hasAnyRole(agentSession, ['Admin', 'TeamLead'])).toBe(false);
      expect(hasAnyRole(agentSession, ['Employee', 'Agent'])).toBe(true);
      expect(hasAnyRole(agentSession, ['Employee'])).toBe(true);
    });

    it('returns false when user has none of the required roles', () => {
      const employeeSession = createMockSession('Employee');

      expect(hasAnyRole(employeeSession, ['Agent', 'TeamLead', 'Admin'])).toBe(false);
      expect(hasAnyRole(employeeSession, ['Admin'])).toBe(false);
    });

    it('returns false for null session', () => {
      expect(hasAnyRole(null, ['Employee'])).toBe(false);
      expect(hasAnyRole(null, ['Admin', 'TeamLead'])).toBe(false);
      expect(hasAnyRole(null, [])).toBe(false);
    });

    it('handles empty role array', () => {
      const adminSession = createMockSession('Admin');
      expect(hasAnyRole(adminSession, [])).toBe(false);
    });

    it('handles single role array', () => {
      const agentSession = createMockSession('Agent');

      expect(hasAnyRole(agentSession, ['Admin'])).toBe(false);
      expect(hasAnyRole(agentSession, ['Agent'])).toBe(true);
      expect(hasAnyRole(agentSession, ['Employee'])).toBe(true);
    });

    it('handles all role combinations', () => {
      const teamLeadSession = createMockSession('TeamLead');

      expect(hasAnyRole(teamLeadSession, ['Admin'])).toBe(false);
      expect(hasAnyRole(teamLeadSession, ['TeamLead'])).toBe(true);
      expect(hasAnyRole(teamLeadSession, ['Agent'])).toBe(true);
      expect(hasAnyRole(teamLeadSession, ['Employee'])).toBe(true);
      expect(hasAnyRole(teamLeadSession, ['Admin', 'TeamLead'])).toBe(true);
      expect(hasAnyRole(teamLeadSession, ['Agent', 'Employee'])).toBe(true);
    });
  });

  describe('integration scenarios', () => {
    it('correctly identifies user role across different sessions', () => {
      const adminSession = createMockSession('Admin', '1');
      const agentSession = createMockSession('Agent', '2');
      const employeeSession = createMockSession('Employee', '3');

      expect(getUserRole(adminSession)).toBe('Admin');
      expect(getUserRole(agentSession)).toBe('Agent');
      expect(getUserRole(employeeSession)).toBe('Employee');

      expect(hasRole(adminSession, 'Admin')).toBe(true);
      expect(hasRole(agentSession, 'Agent')).toBe(true);
      expect(hasRole(employeeSession, 'Employee')).toBe(true);
    });

    it('handles role checking with multiple users', () => {
      const users = [
        createMockSession('Employee', '1'),
        createMockSession('Agent', '2'),
        createMockSession('TeamLead', '3'),
        createMockSession('Admin', '4')
      ];

      // Only Agent, TeamLead, and Admin can assign tickets (Agent role or higher)
      const canAssign = users.filter(u => hasRole(u, 'Agent'));
      expect(canAssign).toHaveLength(3);

      // Only TeamLead and Admin can view all tickets
      const canViewAll = users.filter(u => hasRole(u, 'TeamLead'));
      expect(canViewAll).toHaveLength(2);

      // Only Admin can manage users
      const canManageUsers = users.filter(u => hasRole(u, 'Admin'));
      expect(canManageUsers).toHaveLength(1);
    });

    it('correctly uses hasAnyRole for complex permission checks', () => {
      const agentSession = createMockSession('Agent');

      // Agent should have either Agent or Employee role
      expect(hasAnyRole(agentSession, ['Agent', 'Employee'])).toBe(true);

      // Agent should not have Admin or TeamLead roles
      expect(hasAnyRole(agentSession, ['Admin', 'TeamLead'])).toBe(false);

      // Agent should match in a mixed list
      expect(hasAnyRole(agentSession, ['Admin', 'Agent', 'TeamLead'])).toBe(true);
    });
  });

  describe('error handling and edge cases', () => {
    it('handles session with malformed user object', () => {
      const malformedSession: Session = {
        expires: new Date(Date.now() + 3600000).toISOString(),
        user: {} as any
      };

      expect(getUserRole(malformedSession)).toBe(null);
    });

    it('handles session with expired date', () => {
      const expiredSession: Session = {
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test',
          role: 'Admin'
        },
        expires: new Date(Date.now() - 3600000).toISOString()
      };

      // getUserRole doesn't check expiration, that's handled by NextAuth
      expect(getUserRole(expiredSession)).toBe('Admin');
    });

    it('handles all role types correctly', () => {
      const roles: UserRole[] = ['Employee', 'Agent', 'TeamLead', 'Admin'];

      roles.forEach(role => {
        const session = createMockSession(role);

        // getUserRole should return the exact role
        expect(getUserRole(session)).toBe(role);

        // hasRole should return true for the user's own role
        expect(hasRole(session, role)).toBe(true);

        // hasAnyRole should return true for array containing the role
        expect(hasAnyRole(session, [role])).toBe(true);
      });
    });
  });
});
