import { describe, it, expect } from 'vitest';
import {
  hasRole,
  hasAnyRole,
  canModifyTicket,
  canAssignTickets,
  canResolveTickets,
  canViewAllTickets,
  canManageUsers,
  canManageCategories,
  canViewAnalytics,
  canManageSLAPolicies,
  ROLE_HIERARCHY,
  type UserRole
} from './rbac';
import type { Session } from 'next-auth';

/**
 * Helper to create a mock session with a specific role
 */
const createSession = (role: UserRole, userId: string = '1'): Session => ({
  user: { id: userId, email: 'test@test.com', role, name: 'Test' },
  expires: new Date(Date.now() + 3600000).toISOString()
});

describe('ROLE_HIERARCHY', () => {
  it('has correct hierarchy values', () => {
    expect(ROLE_HIERARCHY.Employee).toBe(0);
    expect(ROLE_HIERARCHY.Agent).toBe(1);
    expect(ROLE_HIERARCHY.TeamLead).toBe(2);
    expect(ROLE_HIERARCHY.Admin).toBe(3);
  });

  it('has ascending privilege levels', () => {
    expect(ROLE_HIERARCHY.Employee).toBeLessThan(ROLE_HIERARCHY.Agent);
    expect(ROLE_HIERARCHY.Agent).toBeLessThan(ROLE_HIERARCHY.TeamLead);
    expect(ROLE_HIERARCHY.TeamLead).toBeLessThan(ROLE_HIERARCHY.Admin);
  });
});

describe('hasRole', () => {
  describe('with Admin role', () => {
    const session = createSession('Admin');

    it('returns true for Admin role', () => {
      expect(hasRole(session, 'Admin')).toBe(true);
    });

    it('returns true for TeamLead role (inheritance)', () => {
      expect(hasRole(session, 'TeamLead')).toBe(true);
    });

    it('returns true for Agent role (inheritance)', () => {
      expect(hasRole(session, 'Agent')).toBe(true);
    });

    it('returns true for Employee role (inheritance)', () => {
      expect(hasRole(session, 'Employee')).toBe(true);
    });
  });

  describe('with TeamLead role', () => {
    const session = createSession('TeamLead');

    it('returns false for Admin role', () => {
      expect(hasRole(session, 'Admin')).toBe(false);
    });

    it('returns true for TeamLead role', () => {
      expect(hasRole(session, 'TeamLead')).toBe(true);
    });

    it('returns true for Agent role (inheritance)', () => {
      expect(hasRole(session, 'Agent')).toBe(true);
    });

    it('returns true for Employee role (inheritance)', () => {
      expect(hasRole(session, 'Employee')).toBe(true);
    });
  });

  describe('with Agent role', () => {
    const session = createSession('Agent');

    it('returns false for Admin role', () => {
      expect(hasRole(session, 'Admin')).toBe(false);
    });

    it('returns false for TeamLead role', () => {
      expect(hasRole(session, 'TeamLead')).toBe(false);
    });

    it('returns true for Agent role', () => {
      expect(hasRole(session, 'Agent')).toBe(true);
    });

    it('returns true for Employee role (inheritance)', () => {
      expect(hasRole(session, 'Employee')).toBe(true);
    });
  });

  describe('with Employee role', () => {
    const session = createSession('Employee');

    it('returns false for Admin role', () => {
      expect(hasRole(session, 'Admin')).toBe(false);
    });

    it('returns false for TeamLead role', () => {
      expect(hasRole(session, 'TeamLead')).toBe(false);
    });

    it('returns false for Agent role', () => {
      expect(hasRole(session, 'Agent')).toBe(false);
    });

    it('returns true for Employee role', () => {
      expect(hasRole(session, 'Employee')).toBe(true);
    });
  });

  describe('with no session', () => {
    it('returns false for any role', () => {
      expect(hasRole(null, 'Employee')).toBe(false);
      expect(hasRole(null, 'Agent')).toBe(false);
      expect(hasRole(null, 'TeamLead')).toBe(false);
      expect(hasRole(null, 'Admin')).toBe(false);
    });
  });

  describe('with session but no user', () => {
    const session: Session = {
      expires: new Date(Date.now() + 3600000).toISOString(),
      user: undefined as any
    };

    it('returns false for any role', () => {
      expect(hasRole(session, 'Employee')).toBe(false);
      expect(hasRole(session, 'Admin')).toBe(false);
    });
  });
});

describe('hasAnyRole', () => {
  it('returns true when user has one of the required roles', () => {
    expect(hasAnyRole(createSession('Agent'), ['Admin', 'TeamLead'])).toBe(false);
    expect(hasAnyRole(createSession('Agent'), ['Employee', 'Agent'])).toBe(true);
  });

  it('returns true when user has multiple required roles', () => {
    expect(hasAnyRole(createSession('Admin'), ['Agent', 'TeamLead'])).toBe(true);
  });

  it('returns false when user has none of the required roles', () => {
    expect(hasAnyRole(createSession('Employee'), ['Agent', 'TeamLead', 'Admin'])).toBe(false);
  });

  it('returns false for no session', () => {
    expect(hasAnyRole(null, ['Employee'])).toBe(false);
  });

  it('handles empty role array', () => {
    expect(hasAnyRole(createSession('Admin'), [])).toBe(false);
  });
});

describe('canModifyTicket', () => {
  it('allows employees to modify their own tickets', () => {
    expect(canModifyTicket(createSession('Employee', '1'), 1, null)).toBe(true);
  });

  it('denies employees modifying others tickets', () => {
    expect(canModifyTicket(createSession('Employee', '1'), 2, null)).toBe(false);
  });

  it('allows agents to modify assigned tickets', () => {
    expect(canModifyTicket(createSession('Agent', '1'), 2, 1)).toBe(true);
  });

  it('denies agents modifying unassigned tickets', () => {
    expect(canModifyTicket(createSession('Agent', '1'), 2, null)).toBe(false);
  });

  it('denies agents modifying tickets assigned to others', () => {
    expect(canModifyTicket(createSession('Agent', '1'), 2, 3)).toBe(false);
  });

  it('allows team leads to modify any ticket', () => {
    expect(canModifyTicket(createSession('TeamLead'), 999, 999)).toBe(true);
  });

  it('allows admins to modify any ticket', () => {
    expect(canModifyTicket(createSession('Admin'), 999, 999)).toBe(true);
  });

  it('returns false for no session', () => {
    expect(canModifyTicket(null, 1, null)).toBe(false);
  });
});

describe('canAssignTickets', () => {
  it('allows agents to assign tickets', () => {
    expect(canAssignTickets(createSession('Agent'))).toBe(true);
  });

  it('allows team leads to assign tickets', () => {
    expect(canAssignTickets(createSession('TeamLead'))).toBe(true);
  });

  it('allows admins to assign tickets', () => {
    expect(canAssignTickets(createSession('Admin'))).toBe(true);
  });

  it('denies employees from assigning tickets', () => {
    expect(canAssignTickets(createSession('Employee'))).toBe(false);
  });

  it('returns false for no session', () => {
    expect(canAssignTickets(null)).toBe(false);
  });
});

describe('canResolveTickets', () => {
  it('allows agents to resolve tickets', () => {
    expect(canResolveTickets(createSession('Agent'))).toBe(true);
  });

  it('allows team leads to resolve tickets', () => {
    expect(canResolveTickets(createSession('TeamLead'))).toBe(true);
  });

  it('allows admins to resolve tickets', () => {
    expect(canResolveTickets(createSession('Admin'))).toBe(true);
  });

  it('denies employees from resolving tickets', () => {
    expect(canResolveTickets(createSession('Employee'))).toBe(false);
  });

  it('returns false for no session', () => {
    expect(canResolveTickets(null)).toBe(false);
  });
});

describe('canViewAllTickets', () => {
  it('allows team leads to view all tickets', () => {
    expect(canViewAllTickets(createSession('TeamLead'))).toBe(true);
  });

  it('allows admins to view all tickets', () => {
    expect(canViewAllTickets(createSession('Admin'))).toBe(true);
  });

  it('denies agents from viewing all tickets', () => {
    expect(canViewAllTickets(createSession('Agent'))).toBe(false);
  });

  it('denies employees from viewing all tickets', () => {
    expect(canViewAllTickets(createSession('Employee'))).toBe(false);
  });

  it('returns false for no session', () => {
    expect(canViewAllTickets(null)).toBe(false);
  });
});

describe('canManageUsers', () => {
  it('allows admins to manage users', () => {
    expect(canManageUsers(createSession('Admin'))).toBe(true);
  });

  it('denies team leads from managing users', () => {
    expect(canManageUsers(createSession('TeamLead'))).toBe(false);
  });

  it('denies agents from managing users', () => {
    expect(canManageUsers(createSession('Agent'))).toBe(false);
  });

  it('denies employees from managing users', () => {
    expect(canManageUsers(createSession('Employee'))).toBe(false);
  });

  it('returns false for no session', () => {
    expect(canManageUsers(null)).toBe(false);
  });
});

describe('canManageCategories', () => {
  it('allows admins to manage categories', () => {
    expect(canManageCategories(createSession('Admin'))).toBe(true);
  });

  it('denies team leads from managing categories', () => {
    expect(canManageCategories(createSession('TeamLead'))).toBe(false);
  });

  it('denies agents from managing categories', () => {
    expect(canManageCategories(createSession('Agent'))).toBe(false);
  });

  it('denies employees from managing categories', () => {
    expect(canManageCategories(createSession('Employee'))).toBe(false);
  });

  it('returns false for no session', () => {
    expect(canManageCategories(null)).toBe(false);
  });
});

describe('canViewAnalytics', () => {
  it('allows team leads to view analytics', () => {
    expect(canViewAnalytics(createSession('TeamLead'))).toBe(true);
  });

  it('allows admins to view analytics', () => {
    expect(canViewAnalytics(createSession('Admin'))).toBe(true);
  });

  it('denies agents from viewing analytics', () => {
    expect(canViewAnalytics(createSession('Agent'))).toBe(false);
  });

  it('denies employees from viewing analytics', () => {
    expect(canViewAnalytics(createSession('Employee'))).toBe(false);
  });

  it('returns false for no session', () => {
    expect(canViewAnalytics(null)).toBe(false);
  });
});

describe('canManageSLAPolicies', () => {
  it('allows admins to manage SLA policies', () => {
    expect(canManageSLAPolicies(createSession('Admin'))).toBe(true);
  });

  it('denies team leads from managing SLA policies', () => {
    expect(canManageSLAPolicies(createSession('TeamLead'))).toBe(false);
  });

  it('denies agents from managing SLA policies', () => {
    expect(canManageSLAPolicies(createSession('Agent'))).toBe(false);
  });

  it('denies employees from managing SLA policies', () => {
    expect(canManageSLAPolicies(createSession('Employee'))).toBe(false);
  });

  it('returns false for no session', () => {
    expect(canManageSLAPolicies(null)).toBe(false);
  });
});

describe('permission matrix', () => {
  it('Employee has no management permissions', () => {
    const employee = createSession('Employee');
    expect(canAssignTickets(employee)).toBe(false);
    expect(canResolveTickets(employee)).toBe(false);
    expect(canViewAllTickets(employee)).toBe(false);
    expect(canManageUsers(employee)).toBe(false);
    expect(canManageCategories(employee)).toBe(false);
    expect(canViewAnalytics(employee)).toBe(false);
    expect(canManageSLAPolicies(employee)).toBe(false);
  });

  it('Agent can assign and resolve tickets', () => {
    const agent = createSession('Agent');
    expect(canAssignTickets(agent)).toBe(true);
    expect(canResolveTickets(agent)).toBe(true);
    expect(canViewAllTickets(agent)).toBe(false);
    expect(canManageUsers(agent)).toBe(false);
    expect(canManageCategories(agent)).toBe(false);
    expect(canViewAnalytics(agent)).toBe(false);
    expect(canManageSLAPolicies(agent)).toBe(false);
  });

  it('TeamLead has broader permissions', () => {
    const teamLead = createSession('TeamLead');
    expect(canAssignTickets(teamLead)).toBe(true);
    expect(canResolveTickets(teamLead)).toBe(true);
    expect(canViewAllTickets(teamLead)).toBe(true);
    expect(canManageUsers(teamLead)).toBe(false);
    expect(canManageCategories(teamLead)).toBe(false);
    expect(canViewAnalytics(teamLead)).toBe(true);
    expect(canManageSLAPolicies(teamLead)).toBe(false);
  });

  it('Admin has all permissions', () => {
    const admin = createSession('Admin');
    expect(canAssignTickets(admin)).toBe(true);
    expect(canResolveTickets(admin)).toBe(true);
    expect(canViewAllTickets(admin)).toBe(true);
    expect(canManageUsers(admin)).toBe(true);
    expect(canManageCategories(admin)).toBe(true);
    expect(canViewAnalytics(admin)).toBe(true);
    expect(canManageSLAPolicies(admin)).toBe(true);
  });
});
