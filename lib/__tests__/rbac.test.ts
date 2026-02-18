import { describe, it, expect } from 'vitest';
import type { Session } from 'next-auth';
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
  canManageSLAPolicies
} from '@/lib/rbac';

function makeSession(role: string, id = '1'): Session {
  return {
    user: { id, role, name: 'Test User', email: 'test@example.com' },
    expires: '2099-01-01T00:00:00.000Z'
  } as unknown as Session;
}

describe('hasRole', () => {
  it('returns false for null session', () => {
    expect(hasRole(null, 'Employee')).toBe(false);
  });

  it('Employee has Employee role', () => {
    expect(hasRole(makeSession('Employee'), 'Employee')).toBe(true);
  });

  it('Employee does not have Agent role', () => {
    expect(hasRole(makeSession('Employee'), 'Agent')).toBe(false);
  });

  it('Employee does not have TeamLead role', () => {
    expect(hasRole(makeSession('Employee'), 'TeamLead')).toBe(false);
  });

  it('Employee does not have Admin role', () => {
    expect(hasRole(makeSession('Employee'), 'Admin')).toBe(false);
  });

  it('Agent has Agent role', () => {
    expect(hasRole(makeSession('Agent'), 'Agent')).toBe(true);
  });

  it('Agent inherits Employee role', () => {
    expect(hasRole(makeSession('Agent'), 'Employee')).toBe(true);
  });

  it('Agent does not have TeamLead role', () => {
    expect(hasRole(makeSession('Agent'), 'TeamLead')).toBe(false);
  });

  it('TeamLead has TeamLead role', () => {
    expect(hasRole(makeSession('TeamLead'), 'TeamLead')).toBe(true);
  });

  it('TeamLead inherits Agent role', () => {
    expect(hasRole(makeSession('TeamLead'), 'Agent')).toBe(true);
  });

  it('TeamLead inherits Employee role', () => {
    expect(hasRole(makeSession('TeamLead'), 'Employee')).toBe(true);
  });

  it('TeamLead does not have Admin role', () => {
    expect(hasRole(makeSession('TeamLead'), 'Admin')).toBe(false);
  });

  it('Admin has all roles via hierarchy', () => {
    const admin = makeSession('Admin');
    expect(hasRole(admin, 'Employee')).toBe(true);
    expect(hasRole(admin, 'Agent')).toBe(true);
    expect(hasRole(admin, 'TeamLead')).toBe(true);
    expect(hasRole(admin, 'Admin')).toBe(true);
  });
});

describe('hasAnyRole', () => {
  it('returns true if user has at least one of the specified roles', () => {
    expect(hasAnyRole(makeSession('Agent'), ['Agent', 'Admin'])).toBe(true);
  });

  it('returns true via hierarchy (Agent satisfies Employee check)', () => {
    expect(hasAnyRole(makeSession('Agent'), ['Employee'])).toBe(true);
  });

  it('returns false if user has none of the specified roles', () => {
    expect(hasAnyRole(makeSession('Employee'), ['Agent', 'Admin'])).toBe(false);
  });

  it('returns false for null session', () => {
    expect(hasAnyRole(null, ['Employee'])).toBe(false);
  });
});

describe('canModifyTicket', () => {
  it('Employee can modify their own ticket', () => {
    const session = makeSession('Employee', '5');
    expect(canModifyTicket(session, 5, null)).toBe(true);
  });

  it('Employee cannot modify another user ticket', () => {
    const session = makeSession('Employee', '5');
    expect(canModifyTicket(session, 6, null)).toBe(false);
  });

  it('Agent can modify their assigned ticket', () => {
    const session = makeSession('Agent', '3');
    expect(canModifyTicket(session, 99, 3)).toBe(true);
  });

  it('Agent cannot modify unassigned ticket', () => {
    const session = makeSession('Agent', '3');
    expect(canModifyTicket(session, 99, null)).toBe(false);
  });

  it('Agent cannot modify ticket assigned to someone else', () => {
    const session = makeSession('Agent', '3');
    expect(canModifyTicket(session, 99, 4)).toBe(false);
  });

  it('TeamLead can modify any ticket', () => {
    const session = makeSession('TeamLead', '2');
    expect(canModifyTicket(session, 99, null)).toBe(true);
  });

  it('Admin can modify any ticket', () => {
    const session = makeSession('Admin', '1');
    expect(canModifyTicket(session, 99, null)).toBe(true);
  });

  it('returns false for null session', () => {
    expect(canModifyTicket(null, 1, null)).toBe(false);
  });
});

describe('canAssignTickets', () => {
  it('Employee cannot assign tickets', () => {
    expect(canAssignTickets(makeSession('Employee'))).toBe(false);
  });

  it('Agent can assign tickets', () => {
    expect(canAssignTickets(makeSession('Agent'))).toBe(true);
  });

  it('TeamLead can assign tickets', () => {
    expect(canAssignTickets(makeSession('TeamLead'))).toBe(true);
  });

  it('Admin can assign tickets', () => {
    expect(canAssignTickets(makeSession('Admin'))).toBe(true);
  });
});

describe('canResolveTickets', () => {
  it('Employee cannot resolve tickets', () => {
    expect(canResolveTickets(makeSession('Employee'))).toBe(false);
  });

  it('Agent can resolve tickets', () => {
    expect(canResolveTickets(makeSession('Agent'))).toBe(true);
  });

  it('TeamLead can resolve tickets', () => {
    expect(canResolveTickets(makeSession('TeamLead'))).toBe(true);
  });
});

describe('canViewAllTickets', () => {
  it('Employee cannot view all tickets', () => {
    expect(canViewAllTickets(makeSession('Employee'))).toBe(false);
  });

  it('Agent cannot view all tickets', () => {
    expect(canViewAllTickets(makeSession('Agent'))).toBe(false);
  });

  it('TeamLead can view all tickets', () => {
    expect(canViewAllTickets(makeSession('TeamLead'))).toBe(true);
  });

  it('Admin can view all tickets', () => {
    expect(canViewAllTickets(makeSession('Admin'))).toBe(true);
  });
});

describe('canManageUsers', () => {
  it('Employee cannot manage users', () => {
    expect(canManageUsers(makeSession('Employee'))).toBe(false);
  });

  it('Agent cannot manage users', () => {
    expect(canManageUsers(makeSession('Agent'))).toBe(false);
  });

  it('TeamLead cannot manage users', () => {
    expect(canManageUsers(makeSession('TeamLead'))).toBe(false);
  });

  it('Admin can manage users', () => {
    expect(canManageUsers(makeSession('Admin'))).toBe(true);
  });
});

describe('canManageCategories', () => {
  it('TeamLead cannot manage categories', () => {
    expect(canManageCategories(makeSession('TeamLead'))).toBe(false);
  });

  it('Admin can manage categories', () => {
    expect(canManageCategories(makeSession('Admin'))).toBe(true);
  });
});

describe('canViewAnalytics', () => {
  it('Employee cannot view analytics', () => {
    expect(canViewAnalytics(makeSession('Employee'))).toBe(false);
  });

  it('Agent cannot view analytics', () => {
    expect(canViewAnalytics(makeSession('Agent'))).toBe(false);
  });

  it('TeamLead can view analytics', () => {
    expect(canViewAnalytics(makeSession('TeamLead'))).toBe(true);
  });

  it('Admin can view analytics', () => {
    expect(canViewAnalytics(makeSession('Admin'))).toBe(true);
  });
});

describe('canManageSLAPolicies', () => {
  it('TeamLead cannot manage SLA policies', () => {
    expect(canManageSLAPolicies(makeSession('TeamLead'))).toBe(false);
  });

  it('Admin can manage SLA policies', () => {
    expect(canManageSLAPolicies(makeSession('Admin'))).toBe(true);
  });
});
