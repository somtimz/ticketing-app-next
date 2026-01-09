# IT Help Desk Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the foundation for a corporate IT help desk application with role-based access control, ticket CRUD operations, and local authentication.

**Architecture:** Next.js 15 App Router with Drizzle ORM + SQLite for data persistence, NextAuth v5 for authentication, and middleware-based role enforcement. Server actions for mutations, API routes for queries.

**Tech Stack:** Next.js 15, Drizzle ORM, better-sqlite3, NextAuth v5, bcryptjs, Zod for validation, TypeScript

---

## Task 1: Update Database Schema with Role Enum

**Files:**
- Modify: `lib/db/schema.ts`

**Step 1: Add role enum and update users table**

Current users table has a string role. We need a proper enum for type safety.

Open `lib/db/schema.ts` and add the role enum before the users table definition:

```typescript
import { pgEnum, sqliteEnum } from 'drizzle-orm/pg-core';
import { text, sqliteTable, integer } from 'drizzle-orm/sqlite-core';

// Add this after imports, before users table
export const roleEnum = sqliteEnum('users_role', ['Employee', 'Agent', 'TeamLead', 'Admin']);

// In the users table, replace the role line with:
export const users = sqliteTable('users', {
  // ... existing fields ...
  role: roleEnum.notNull().default('Employee'),
  // ... rest of fields ...
});
```

**Step 2: Run migration**

```bash
npm run db:generate
npm run db:push
```

**Step 3: Verify schema update**

```bash
npm run db:studio
```

Open http://localhost:4983 and verify the users table has the role enum constraint.

**Step 4: Commit**

```bash
git add lib/db/schema.ts drizzle/
git commit -m "feat: add role enum to users table"
```

---

## Task 2: Update Database Schema - Add SLA Policies Table

**Files:**
- Modify: `lib/db/schema.ts`

**Step 1: Add SLA policies table**

Add this table definition after the categories table:

```typescript
export const slaPolicies = sqliteTable('sla_policies', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  priority: text('priority', { enum: ['P1', 'P2', 'P3', 'P4'] }).notNull(),
  firstResponseMinutes: integer('first_response_minutes').notNull(),
  resolutionMinutes: integer('resolution_minutes').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
});
```

**Step 2: Add SLA fields to tickets table**

Update the tickets table to include SLA tracking fields. Add these fields to the existing tickets table definition:

```typescript
export const tickets = sqliteTable('tickets', {
  // ... existing fields ...
  // Add these new fields:
  impact: text('impact', { enum: ['Low', 'Medium', 'High'] }).notNull().default('Medium'),
  urgency: text('urgency', { enum: ['Low', 'Medium', 'High'] }).notNull().default('Medium'),
  priority: text('priority', { enum: ['P1', 'P2', 'P3', 'P4'] }).notNull().default('P3'),
  slaFirstResponseDue: integer('sla_first_response_due', { mode: 'timestamp' }),
  slaResolutionDue: integer('sla_resolution_due', { mode: 'timestamp' }),
  resolvedAt: integer('resolved_at', { mode: 'timestamp' }),
  closedAt: integer('closed_at', { mode: 'timestamp' }),
  // ... rest of fields ...
});
```

**Step 3: Run migration**

```bash
npm run db:generate
npm run db:push
```

**Step 4: Commit**

```bash
git add lib/db/schema.ts drizzle/
git commit -m "feat: add SLA policies table and SLA tracking to tickets"
```

---

## Task 3: Create SLA Utility Functions

**Files:**
- Create: `lib/sla.ts`

**Step 1: Create priority matrix calculation**

Create `lib/sla.ts`:

```typescript
export type Priority = 'P1' | 'P2' | 'P3' | 'P4';
export type Impact = 'Low' | 'Medium' | 'High';
export type Urgency = 'Low' | 'Medium' | 'High';

const PRIORITY_MATRIX: Record<Impact, Record<Urgency, Priority>> = {
  Low: { Low: 'P4', Medium: 'P3', High: 'P2' },
  Medium: { Low: 'P3', Medium: 'P2', High: 'P1' },
  High: { Low: 'P2', Medium: 'P1', High: 'P1' }
};

export function calculatePriority(impact: Impact, urgency: Urgency): Priority {
  return PRIORITY_MATRIX[impact][urgency];
}

export function calculateSLADueDates(priority: Priority, createdAt: Date): {
  firstResponseDue: Date;
  resolutionDue: Date;
} {
  const SLA_MINUTES: Record<Priority, { firstResponse: number; resolution: number }> = {
    P1: { firstResponse: 15, resolution: 240 },      // 15 min, 4 hours
    P2: { firstResponse: 60, resolution: 1440 },     // 1 hour, 24 hours
    P3: { firstResponse: 240, resolution: 4320 },    // 4 hours, 3 days
    P4: { firstResponse: 1440, resolution: 10080 }   // 24 hours, 7 days
  };

  const sla = SLA_MINUTES[priority];
  return {
    firstResponseDue: new Date(createdAt.getTime() + sla.firstResponse * 60 * 1000),
    resolutionDue: new Date(createdAt.getTime() + sla.resolution * 60 * 1000)
  };
}

export function isSLABreached(dueDate: Date): boolean {
  return new Date() > dueDate;
}

export function getSLAStatus(createdAt: Date, dueDate: Date, now: Date = new Date()): 'ok' | 'warning' | 'breached' {
  const timeUntilDue = dueDate.getTime() - now.getTime();
  const totalWindow = dueDate.getTime() - createdAt.getTime(); // Actual SLA window

  if (timeUntilDue < 0) return 'breached';
  if (timeUntilDue < totalWindow * 0.2) return 'warning'; // Last 20% of time
  return 'ok';
}
```

**Step 2: Create test file**

Create `lib/sla.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { calculatePriority, calculateSLADueDates, isSLABreached, getSLAStatus } from './sla';

describe('calculatePriority', () => {
  it('calculates P1 for Critical+High', () => {
    expect(calculatePriority('High', 'High')).toBe('P1');
  });

  it('calculates P4 for Low+Low', () => {
    expect(calculatePriority('Low', 'Low')).toBe('P4');
  });

  it('calculates P2 for High+Low', () => {
    expect(calculatePriority('High', 'Low')).toBe('P2');
  });
});

describe('calculateSLADueDates', () => {
  it('sets tight deadlines for P1', () => {
    const base = new Date('2025-01-09T10:00:00Z');
    const due = calculateSLADueDates('P1', base);

    expect(due.firstResponseDue.getTime()).toBe(base.getTime() + 15 * 60 * 1000);
    expect(due.resolutionDue.getTime()).toBe(base.getTime() + 240 * 60 * 1000);
  });

  it('sets loose deadlines for P4', () => {
    const base = new Date('2025-01-09T10:00:00Z');
    const due = calculateSLADueDates('P4', base);

    expect(due.firstResponseDue.getTime()).toBe(base.getTime() + 1440 * 60 * 1000);
    expect(due.resolutionDue.getTime()).toBe(base.getTime() + 10080 * 60 * 1000);
  });
});

describe('isSLABreached', () => {
  it('returns true when past due', () => {
    const past = new Date(Date.now() - 10000);
    expect(isSLABreached(past)).toBe(true);
  });

  it('returns false when future', () => {
    const future = new Date(Date.now() + 1000000);
    expect(isSLABreached(future)).toBe(false);
  });
});
```

**Step 3: Install Vitest**

```bash
npm install -D vitest @vitest/ui
```

**Step 4: Add test script to package.json**

Add to `package.json` scripts:
```json
"test": "vitest"
```

**Step 5: Run tests to verify they pass**

```bash
npm test
```

Expected: All tests pass

**Step 6: Commit**

```bash
git add lib/sla.ts lib/sla.test.ts package.json package-lock.json
git commit -m "feat: add SLA calculation utilities with tests"
```

---

## Task 4: Create Role-Based Access Middleware

**Files:**
- Create: `lib/rbac.ts` - Role hierarchy and permission utilities
- Create: `lib/api-error.ts` - API error handling and authorization middleware

**Step 1: Create RBAC utilities**

Create `lib/rbac.ts`:

```typescript
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
```

**Step 2: Create API route helper**

Create `lib/api-error.ts`:

```typescript
import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import { UserRole, hasRole } from './rbac';

/**
 * Custom API Error class for structured error responses
 */
export class APIError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Handle errors and return appropriate API responses
 */
export function handleAPIError(error: unknown): NextResponse {
  if (error instanceof APIError) {
    return NextResponse.json(
      { error: error.code, message: error.message },
      { status: error.status }
    );
  }

  // Handle Zod validation errors
  if (error instanceof Error && error.name === 'ZodError') {
    return NextResponse.json(
      { error: 'validation_error', message: 'Invalid input data' },
      { status: 400 }
    );
  }

  console.error('Unexpected API error:', error);
  return NextResponse.json(
    { error: 'internal_error', message: 'An unexpected error occurred' },
    { status: 500 }
  );
}

/**
 * Require user to be authenticated
 * @throws APIError with 401 status if not authenticated
 */
export function requireAuth(session: Session | null): void {
  if (!session?.user) {
    throw new APIError(401, 'unauthorized', 'You must be logged in');
  }
}

/**
 * Require user to have at least the specified role level
 * @throws APIError with 401 status if not authenticated
 * @throws APIError with 403 status if not authorized
 */
export function requireRole(session: Session | null, role: UserRole): void {
  requireAuth(session);
  if (!hasRole(session, role)) {
    throw new APIError(
      403,
      'forbidden',
      'You do not have permission to perform this action'
    );
  }
}

/**
 * Require user to have any of the specified roles
 * @throws APIError with 401 status if not authenticated
 * @throws APIError with 403 status if not authorized
 */
export function requireAnyRole(session: Session | null, roles: UserRole[]): void {
  requireAuth(session);
  if (!roles.some(role => hasRole(session, role))) {
    throw new APIError(
      403,
      'forbidden',
      'You do not have permission to perform this action'
    );
  }
}
```

**Step 3: Create tests for RBAC**

Create `lib/rbac.test.ts`:

```typescript
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
```

**Step 4: Create tests for API error handling**

Create `lib/api-error.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  APIError,
  handleAPIError,
  requireAuth,
  requireRole,
  requireAnyRole
} from './api-error';
import type { Session, UserRole } from './rbac';

const createSession = (role: UserRole): Session => ({
  user: { id: '1', email: 'test@test.com', role, name: 'Test' },
  expires: new Date(Date.now() + 3600000).toISOString()
});

describe('APIError', () => {
  it('creates error with status, code, and message', () => {
    const error = new APIError(404, 'not_found', 'Resource not found');
    expect(error.status).toBe(404);
    expect(error.code).toBe('not_found');
    expect(error.message).toBe('Resource not found');
    expect(error.name).toBe('APIError');
  });

  it('is instance of Error', () => {
    const error = new APIError(500, 'server_error', 'Something went wrong');
    expect(error instanceof Error).toBe(true);
  });
});

describe('handleAPIError', () => {
  it('handles APIError with correct status and response', () => {
    const error = new APIError(404, 'not_found', 'Ticket not found');
    const response = handleAPIError(error);

    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toBe('application/json');
  });

  it('includes error code and message in APIError response', async () => {
    const error = new APIError(403, 'forbidden', 'Access denied');
    const response = handleAPIError(error);
    const body = await response.json();

    expect(body).toEqual({
      error: 'forbidden',
      message: 'Access denied'
    });
  });

  it('handles generic Error as internal server error', async () => {
    const error = new Error('Unexpected error');
    const response = handleAPIError(error);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: 'internal_error',
      message: 'An unexpected error occurred'
    });
  });

  it('handles unknown errors as internal server error', async () => {
    const response = handleAPIError('string error');
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: 'internal_error',
      message: 'An unexpected error occurred'
    });
  });

  it('handles null error', async () => {
    const response = handleAPIError(null);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: 'internal_error',
      message: 'An unexpected error occurred'
    });
  });
});

describe('requireAuth', () => {
  it('does not throw when session has user', () => {
    const session = createSession('Admin');
    expect(() => requireAuth(session)).not.toThrow();
  });

  it('throws APIError when session is null', () => {
    expect(() => requireAuth(null)).toThrow(APIError);
  });

  it('throws 401 error when session is null', () => {
    try {
      requireAuth(null);
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(APIError);
      if (error instanceof APIError) {
        expect(error.status).toBe(401);
        expect(error.code).toBe('unauthorized');
        expect(error.message).toBe('You must be logged in');
      }
    }
  });

  it('throws APIError when session has no user', () => {
    const session: Session = {
      expires: new Date(Date.now() + 3600000).toISOString(),
      user: undefined as any
    };

    expect(() => requireAuth(session)).toThrow(APIError);
  });
});

describe('requireRole', () => {
  describe('with Admin role', () => {
    const session = createSession('Admin');

    it('does not throw for Admin requirement', () => {
      expect(() => requireRole(session, 'Admin')).not.toThrow();
    });

    it('does not throw for TeamLead requirement (inheritance)', () => {
      expect(() => requireRole(session, 'TeamLead')).not.toThrow();
    });

    it('does not throw for Agent requirement (inheritance)', () => {
      expect(() => requireRole(session, 'Agent')).not.toThrow();
    });

    it('does not throw for Employee requirement (inheritance)', () => {
      expect(() => requireRole(session, 'Employee')).not.toThrow();
    });
  });

  describe('with TeamLead role', () => {
    const session = createSession('TeamLead');

    it('throws 403 for Admin requirement', () => {
      try {
        requireRole(session, 'Admin');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        if (error instanceof APIError) {
          expect(error.status).toBe(403);
          expect(error.code).toBe('forbidden');
        }
      }
    });

    it('does not throw for TeamLead requirement', () => {
      expect(() => requireRole(session, 'TeamLead')).not.toThrow();
    });

    it('does not throw for Agent requirement', () => {
      expect(() => requireRole(session, 'Agent')).not.toThrow();
    });

    it('does not throw for Employee requirement', () => {
      expect(() => requireRole(session, 'Employee')).not.toThrow();
    });
  });

  describe('with Agent role', () => {
    const session = createSession('Agent');

    it('throws 403 for TeamLead requirement', () => {
      try {
        requireRole(session, 'TeamLead');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        if (error instanceof APIError) {
          expect(error.status).toBe(403);
        }
      }
    });

    it('does not throw for Agent requirement', () => {
      expect(() => requireRole(session, 'Agent')).not.toThrow();
    });
  });

  describe('with Employee role', () => {
    const session = createSession('Employee');

    it('throws 403 for Agent requirement', () => {
      try {
        requireRole(session, 'Agent');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        if (error instanceof APIError) {
          expect(error.status).toBe(403);
        }
      }
    });

    it('does not throw for Employee requirement', () => {
      expect(() => requireRole(session, 'Employee')).not.toThrow();
    });
  });

  describe('with no session', () => {
    it('throws 401 before checking role', () => {
      try {
        requireRole(null, 'Employee');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        if (error instanceof APIError) {
          expect(error.status).toBe(401);
          expect(error.code).toBe('unauthorized');
        }
      }
    });
  });
});

describe('requireAnyRole', () => {
  it('does not throw when user has one of the required roles', () => {
    const session = createSession('Agent');
    expect(() => requireAnyRole(session, ['Employee', 'Agent'])).not.toThrow();
  });

  it('does not throw when user has higher role', () => {
    const session = createSession('Admin');
    expect(() => requireAnyRole(session, ['Employee', 'Agent'])).not.toThrow();
  });

  it('throws 403 when user has none of the required roles', () => {
    const session = createSession('Employee');
    try {
      requireAnyRole(session, ['Agent', 'TeamLead', 'Admin']);
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(APIError);
      if (error instanceof APIError) {
        expect(error.status).toBe(403);
        expect(error.code).toBe('forbidden');
      }
    }
  });

  it('throws 401 for no session', () => {
    try {
      requireAnyRole(null, ['Employee']);
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(APIError);
      if (error instanceof APIError) {
        expect(error.status).toBe(401);
      }
    }
  });

  it('handles empty role array', () => {
    const session = createSession('Admin');
    try {
      requireAnyRole(session, []);
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(APIError);
      if (error instanceof APIError) {
        expect(error.status).toBe(403);
      }
    }
  });

  it('allows multiple role options', () => {
    const session = createSession('TeamLead');
    expect(() => requireAnyRole(session, ['Admin', 'Agent'])).not.toThrow();
  });
});
```

**Step 5: Run tests**

```bash
npm test
```

Expected: All tests pass (both rbac and api-error test suites)

**Step 6: Commit**

```bash
git add lib/rbac.ts lib/api-error.ts lib/rbac.test.ts lib/api-error.test.ts
git commit -m "feat: add role-based access control utilities"
```

---

## Task 5: Update Types for SLA and Priority

**Files:**
- Modify: `types/index.ts`

**Step 1: Add SLA-related types**

Update `types/index.ts`:

```typescript
// Add these new types
export type Priority = 'P1' | 'P2' | 'P3' | 'P4';
export type Impact = 'Low' | 'Medium' | 'High';
export type Urgency = 'Low' | 'Medium' | 'High';
export type TicketStatus = 'New' | 'Assigned' | 'InProgress' | 'Pending' | 'Resolved' | 'Closed';
export type UserRole = 'Employee' | 'Agent' | 'TeamLead' | 'Admin';

// Update the Ticket interface to include new fields
export interface Ticket {
  id: number;
  ticketNumber: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: Priority;
  impact: Impact;
  urgency: Urgency;
  categoryId: number | null;
  assignedAgentId: number | null;
  createdBy: number;
  slaFirstResponseDue: Date | null;
  slaResolutionDue: Date | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketWithRelations extends Ticket {
  category: Category | null;
  assignedAgent: User | null;
  createdBy: User;
  comments: Comment[];
}
```

**Step 2: Commit**

```bash
git add types/index.ts
git commit -m "feat: add SLA and priority types"
```

---

## Task 6: Update Create Ticket API with Priority Calculation

**Files:**
- Modify: `app/api/tickets/route.ts`

**Step 1: Update ticket creation to calculate priority and SLA**

Replace the existing POST handler with updated logic:

```typescript
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { tickets, categories } from '@/lib/db/schema';
import { calculatePriority, calculateSLADueDates } from '@/lib/sla';
import { requireRole } from '@/lib/rbac';
import { eq } from 'drizzle-orm';

const createTicketSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  categoryId: z.number().optional(),
  impact: z.enum(['Low', 'Medium', 'High']),
  urgency: z.enum(['Low', 'Medium', 'High'])
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    requireRole(session, 'Employee');

    const body = await req.json();
    const validated = createTicketSchema.parse(body);

    // Calculate priority from impact × urgency
    const priority = calculatePriority(validated.impact, validated.urgency);

    // Calculate SLA due dates
    const now = new Date();
    const slaDates = calculateSLADueDates(priority, now);

    // Get category for auto-assignment
    let assignedAgentId: number | null = null;
    if (validated.categoryId) {
      const category = await db.query.categories.findFirst({
        where: eq(categories.id, validated.categoryId)
      });
      assignedAgentId = category?.defaultAgentId || null;
    }

    // Generate ticket number
    const ticketCount = await db.select({ count: tickets.id }).from(tickets);
    const ticketNumber = `INC-${String((ticketCount.length || 0) + 1).padStart(4, '0')}`;

    // Create ticket
    const [ticket] = await db.insert(tickets).values({
      ticketNumber,
      title: validated.title,
      description: validated.description,
      status: assignedAgentId ? 'Assigned' : 'New',
      priority,
      impact: validated.impact,
      urgency: validated.urgency,
      categoryId: validated.categoryId || null,
      assignedAgentId,
      createdBy: parseInt(session.user.id),
      slaFirstResponseDue: slaDates.firstResponseDue,
      slaResolutionDue: slaDates.resolutionDue,
      createdAt: now,
      updatedAt: now
    }).returning();

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    return handleAPIError(error);
  }
}
```

**Step 2: Commit**

```bash
git add app/api/tickets/route.ts
git commit -m "feat: add priority calculation and SLA tracking to ticket creation"
```

---

## Task 7: Add Ticket Status Update Endpoint

**Files:**
- Create: `app/api/tickets/[id]/status/route.ts`

**Step 1: Create status update endpoint**

Create `app/api/tickets/[id]/status/route.ts`:

```typescript
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { tickets } from '@/lib/db/schema';
import { requireAuth, canModifyTicket } from '@/lib/rbac';
import { eq } from 'drizzle-orm';

const updateStatusSchema = z.object({
  status: z.enum(['New', 'Assigned', 'InProgress', 'Pending', 'Resolved', 'Closed'])
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireAuth(session);

    const { id } = await params;
    const ticketId = parseInt(id);

    // Get ticket first
    const ticket = await db.query.tickets.findFirst({
      where: eq(tickets.id, ticketId)
    });

    if (!ticket) {
      return NextResponse.json(
        { error: 'not_found', message: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (!canModifyTicket(session, ticket.createdBy, ticket.assignedAgentId)) {
      return NextResponse.json(
        { error: 'forbidden', message: 'You cannot modify this ticket' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validated = updateStatusSchema.parse(body);

    // Update with timestamps
    const updateData: Record<string, Date | null> = {
      status: validated.status,
      updatedAt: new Date()
    };

    if (validated.status === 'Resolved') {
      updateData.resolvedAt = new Date();
    } else if (validated.status === 'Closed') {
      updateData.closedAt = new Date();
    }

    const [updated] = await db.update(tickets)
      .set(updateData)
      .where(eq(tickets.id, ticketId))
      .returning();

    return NextResponse.json({ ticket: updated });
  } catch (error) {
    return handleAPIError(error);
  }
}
```

**Step 2: Commit**

```bash
git add app/api/tickets/[id]/status/route.ts
git commit -m "feat: add ticket status update endpoint with permission checks"
```

---

## Task 8: Update Seed Script with Test Data

**Files:**
- Modify: `lib/db/seed.ts`

**Step 1: Update seed with users of different roles**

Update `lib/db/seed.ts`:

```typescript
import { db } from './db';
import { users, tickets, categories } from './db/schema';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('Seeding database...');

  // Create users with different roles
  const passwordHash = await bcrypt.hash('password123', 10);

  const [employee] = await db.insert(users).values({
    email: 'employee@test.com',
    passwordHash,
    fullName: 'Regular Employee',
    role: 'Employee',
    isActive: true
  }).onConflictDoNothing().returning();

  const [agent] = await db.insert(users).values({
    email: 'agent@test.com',
    passwordHash,
    fullName: 'Support Agent',
    role: 'Agent',
    isActive: true
  }).onConflictDoNothing().returning();

  const [teamLead] = await db.insert(users).values({
    email: 'lead@test.com',
    passwordHash,
    fullName: 'Team Lead',
    role: 'TeamLead',
    isActive: true
  }).onConflictDoNothing().returning();

  const [admin] = await db.insert(users).values({
    email: 'admin@test.com',
    passwordHash,
    fullName: 'System Admin',
    role: 'Admin',
    isActive: true
  }).onConflictDoNothing().returning();

  // Create categories
  const [hardwareCat] = await db.insert(categories).values({
    name: 'Hardware',
    icon: 'laptop',
    defaultAgentId: agent?.id
  }).onConflictDoNothing().returning();

  const [softwareCat] = await db.insert(categories).values({
    name: 'Software',
    icon: 'code',
    defaultAgentId: agent?.id
  }).onConflictDoNothing().returning();

  // Create sample tickets
  if (employee && agent) {
    await db.insert(tickets).values({
      ticketNumber: 'INC-0001',
      title: 'Laptop not booting',
      description: 'My laptop shows a blue screen when I try to turn it on.',
      status: 'New',
      priority: 'P2',
      impact: 'Medium',
      urgency: 'Medium',
      categoryId: hardwareCat?.id || null,
      assignedAgentId: agent.id,
      createdBy: employee.id,
      slaFirstResponseDue: new Date(Date.now() + 60 * 60 * 1000),
      slaResolutionDue: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }).onConflictDoNothing();
  }

  console.log('Seed complete!');
  console.log('\nTest accounts:');
  console.log('  employee@test.com / password123 (Employee)');
  console.log('  agent@test.com / password123 (Agent)');
  console.log('  lead@test.com / password123 (Team Lead)');
  console.log('  admin@test.com / password123 (Admin)');
}

seed().catch(console.error);
```

**Step 2: Run seed**

```bash
npm run db:seed
```

**Step 3: Commit**

```bash
git add lib/db/seed.ts
git commit -m "feat: add seed data with test users and sample tickets"
```

---

## Task 9: Update Auth Config for Role Handling

**Files:**
- Modify: `lib/auth.ts`

**Step 1: Ensure role is properly typed**

Update the authorize function to return role properly:

```typescript
return {
  id: user[0].id.toString(),
  email: user[0].email,
  name: user[0].fullName,
  role: user[0].role as 'Employee' | 'Agent' | 'TeamLead' | 'Admin'
};
```

**Step 2: Commit**

```bash
git add lib/auth.ts
git commit -m "fix: ensure role is properly typed in auth"
```

---

## Task 10: Create Manual Testing Plan Document

**Files:**
- Create: `docs/testing-manual.md`

**Step 1: Create testing guide**

Create `docs/testing-manual.md`:

```markdown
# Manual Testing Guide

## Test Accounts

| Email | Password | Role | Purpose |
|-------|----------|------|---------|
| employee@test.com | password123 | Employee | Submit tickets, view own tickets |
| agent@test.com | password123 | Agent | View all tickets, update assigned tickets |
| lead@test.com | password123 | Team Lead | Assign tickets, view team stats |
| admin@test.com | password123 | Admin | Manage users, categories, SLA policies |

## Test Scenarios

### 1. Employee Creates Ticket

1. Login as `employee@test.com`
2. Navigate to `/dashboard/issue-logging/new`
3. Fill in:
   - Title: "Test ticket"
   - Description: "Testing priority calculation"
   - Impact: High
   - Urgency: Medium
4. Submit
5. Verify: Status is "Assigned" (auto-assigned to agent)
6. Verify: Priority is "P2" (High + Medium = P2)
7. Verify: SLA due dates are set

### 2. Agent Updates Ticket Status

1. Login as `agent@test.com`
2. Navigate to `/dashboard/issue-logging`
3. Click on ticket INC-0001
4. Change status to "InProgress"
5. Verify: Status updated, resolvedAt timestamp set
6. Add comment: "Working on this issue"
7. Verify: Comment appears in activity log

### 3. Team Lead Reassigns Ticket

1. Login as `lead@test.com`
2. Navigate to `/dashboard/issue-logging`
3. Click ticket, change assigned agent
4. Verify: Assignment updated

### 4. Role Permission Checks

1. Login as `employee@test.com`
2. Try accessing `/api/users` (should be forbidden)
3. Try reassigning another's ticket (should fail)

### 5. SLA Breach Detection

1. Create a ticket with low priority
2. Modify database to set `sla_first_response_due` to past
3. Verify: Ticket shows as breached in UI
```

**Step 2: Commit**

```bash
git add docs/testing-manual.md
git commit -m "docs: add manual testing guide"
```

---

## Task 11: Verify Build and Run Dev Server

**Files:**
- None (verification step)

**Step 1: Build the project**

```bash
cd .worktrees/foundation
npm run build
```

Expected: Build succeeds with no errors

**Step 2: Start dev server**

```bash
npm run dev
```

Expected: Server starts on http://localhost:3000

**Step 3: Test authentication**

1. Navigate to http://localhost:3000/login
2. Login with `employee@test.com` / `password123`
3. Verify: Redirected to dashboard

**Step 4: Test API endpoints**

```bash
# Test creating ticket (requires auth cookie)
curl -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","description":"Test ticket","impact":"Medium","urgency":"Medium"}'
```

**Step 5: Commit any fixes**

```bash
git add .
git commit -m "fix: resolve any build or runtime issues discovered"
```

---

## Task 12: Merge Foundation Branch

**Files:**
- None (git operation)

**Step 1: Ensure clean state**

```bash
git status
```

Expected: No uncommitted changes

**Step 2: Run final test suite**

```bash
npm test
npm run build
```

**Step 3: Switch to main and merge**

```bash
cd ../..
git checkout master
git merge feature/foundation --no-ff
```

**Step 4: Push to remote (if applicable)**

```bash
git push origin master
```

**Step 5: Delete worktree (optional)**

```bash
git worktree remove .worktrees/foundation
git branch -d feature/foundation
```

**Step 6: Create summary commit**

```bash
git commit --allow-empty -m "feat: complete foundation phase

- Implemented role-based access control (Employee, Agent, TeamLead, Admin)
- Added priority calculation matrix (Impact × Urgency)
- Implemented SLA tracking with breach detection
- Created RBAC middleware and permission checks
- Added comprehensive test suite
- Seeded database with test users and sample data

Next: Phase 2 - Category-based auto-assignment and dynamic forms"
```

---

## Summary

This plan implements the foundation phase of the IT Help Desk application:

- ✅ Role enum and hierarchy
- ✅ SLA policies table
- ✅ Priority calculation (Impact × Urgency matrix)
- ✅ SLA due date calculation
- ✅ Role-based access control utilities
- ✅ Permission checks for ticket operations
- ✅ Updated ticket creation with priority/SLA
- ✅ Status update endpoint
- ✅ Seed data for testing
- ✅ Manual testing guide

**Next phase:** Category-based auto-assignment, dynamic forms, and employee portal improvements.
