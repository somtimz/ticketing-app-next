import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock before any imports that touch db
vi.mock('@/lib/db', () => ({
  db: {
    query: {
      categories: { findFirst: vi.fn() },
      users: { findMany: vi.fn(), findFirst: vi.fn() },
      tickets: { findFirst: vi.fn(), findMany: vi.fn() }
    },
    select: vi.fn(),
    update: vi.fn()
  }
}));

import { db } from '@/lib/db';
import {
  findBestAgentForCategory,
  assignTicket,
  assignTicketsBulk,
  getAgentWorkload,
  reassignTicket
} from '@/lib/assignment';

// Typed refs to mocked functions
const mockCategoriesFindFirst = vi.mocked(db.query.categories.findFirst);
const mockUsersFindMany = vi.mocked(db.query.users.findMany);
const mockUsersFindFirst = vi.mocked(db.query.users.findFirst);
const mockTicketsFindFirst = vi.mocked(db.query.tickets.findFirst);
const mockTicketsFindMany = vi.mocked(db.query.tickets.findMany);
const mockSelect = vi.mocked(db.select);
const mockUpdate = vi.mocked(db.update);

// Helpers

/** Set up the db.select().from().where() chain to return workload counts sequentially */
function setupCountQueries(counts: number[]) {
  let call = 0;
  mockSelect.mockImplementation(() => ({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ count: counts[call++] ?? 0 }])
    })
  }) as any);
}

/** Set up db.update().set().where() to resolve successfully */
function setupUpdateSuccess() {
  const mockWhere = vi.fn().mockResolvedValue(undefined);
  const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
  mockUpdate.mockReturnValue({ set: mockSet } as any);
}

// Fixtures
const agentA = { id: 1, role: 'Agent', isActive: true, fullName: 'Agent A' };
const agentB = { id: 2, role: 'Agent', isActive: true, fullName: 'Agent B' };
const categoryWithDefault = { id: 10, name: 'Hardware', defaultAgentId: 1 };
const categoryNoDefault = { id: 11, name: 'Software', defaultAgentId: null };
const baseTicket = { id: 100, status: 'Open', categoryId: 10, assignedAgentId: null };

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────
// findBestAgentForCategory
// ─────────────────────────────────────────────────────────────

describe('findBestAgentForCategory', () => {
  it('returns null when category does not exist', async () => {
    mockCategoriesFindFirst.mockResolvedValueOnce(undefined);
    expect(await findBestAgentForCategory(99)).toBeNull();
  });

  it('returns null when no active agents exist', async () => {
    mockCategoriesFindFirst.mockResolvedValueOnce(categoryNoDefault as any);
    mockUsersFindMany.mockResolvedValueOnce([]);
    expect(await findBestAgentForCategory(11)).toBeNull();
  });

  it('returns the only agent when there is one', async () => {
    mockCategoriesFindFirst.mockResolvedValueOnce(categoryNoDefault as any);
    mockUsersFindMany.mockResolvedValueOnce([agentA] as any);
    setupCountQueries([3]);
    expect(await findBestAgentForCategory(11)).toBe(1);
  });

  it('returns least busy agent when no default agent is set', async () => {
    // agentA has 5 open tickets, agentB has 2 — agentB is returned
    mockCategoriesFindFirst.mockResolvedValueOnce(categoryNoDefault as any);
    mockUsersFindMany.mockResolvedValueOnce([agentA, agentB] as any);
    setupCountQueries([5, 2]);
    expect(await findBestAgentForCategory(11)).toBe(2); // agentB
  });

  it('returns default agent when their workload is within 2 of the least busy', async () => {
    // agentA (default) has 3, agentB has 2 → 3 <= 2+2=4 → prefer default (agentA)
    mockCategoriesFindFirst.mockResolvedValueOnce(categoryWithDefault as any);
    mockUsersFindMany.mockResolvedValueOnce([agentA, agentB] as any);
    setupCountQueries([3, 2]); // agentA=3, agentB=2
    expect(await findBestAgentForCategory(10)).toBe(1); // agentA (default)
  });

  it('returns least busy agent when default agent is overloaded by more than 2', async () => {
    // agentA (default) has 6, agentB has 2 → 6 > 2+2=4 → pick agentB
    mockCategoriesFindFirst.mockResolvedValueOnce(categoryWithDefault as any);
    mockUsersFindMany.mockResolvedValueOnce([agentA, agentB] as any);
    setupCountQueries([6, 2]); // agentA=6, agentB=2
    expect(await findBestAgentForCategory(10)).toBe(2); // agentB
  });

  it('returns default agent at exactly the overload boundary (equal + 2)', async () => {
    // agentA (default) has 4, agentB has 2 → 4 <= 2+2=4 → still prefer default
    mockCategoriesFindFirst.mockResolvedValueOnce(categoryWithDefault as any);
    mockUsersFindMany.mockResolvedValueOnce([agentA, agentB] as any);
    setupCountQueries([4, 2]); // agentA=4, agentB=2
    expect(await findBestAgentForCategory(10)).toBe(1); // agentA (default)
  });
});

// ─────────────────────────────────────────────────────────────
// assignTicket
// ─────────────────────────────────────────────────────────────

describe('assignTicket', () => {
  it('returns failure when ticket not found', async () => {
    mockTicketsFindFirst.mockResolvedValueOnce(undefined);
    const result = await assignTicket(999);
    expect(result).toEqual({ success: false, reason: 'Ticket not found' });
  });

  it('returns failure when ticket has no category and no explicit agentId', async () => {
    mockTicketsFindFirst.mockResolvedValueOnce({ ...baseTicket, categoryId: null } as any);
    const result = await assignTicket(100);
    expect(result).toEqual({ success: false, reason: 'No agent available for assignment' });
  });

  it('assigns explicit agentId directly without auto-assignment', async () => {
    mockTicketsFindFirst.mockResolvedValueOnce(baseTicket as any);
    mockUsersFindFirst.mockResolvedValueOnce(agentA as any);
    setupUpdateSuccess();

    const result = await assignTicket(100, 1);
    expect(result).toEqual({ success: true, agentId: 1 });
    expect(mockUpdate).toHaveBeenCalledOnce();
  });

  it('returns failure when specified agent not found', async () => {
    mockTicketsFindFirst.mockResolvedValueOnce(baseTicket as any);
    mockUsersFindFirst.mockResolvedValueOnce(undefined);

    const result = await assignTicket(100, 999);
    expect(result).toEqual({ success: false, reason: 'Agent not found or inactive' });
  });

  it('returns failure when specified user has Employee role', async () => {
    mockTicketsFindFirst.mockResolvedValueOnce(baseTicket as any);
    mockUsersFindFirst.mockResolvedValueOnce({ id: 5, role: 'Employee', isActive: true } as any);

    const result = await assignTicket(100, 5);
    expect(result).toEqual({ success: false, reason: 'Agent not found or inactive' });
  });

  it('allows assignment to TeamLead role', async () => {
    mockTicketsFindFirst.mockResolvedValueOnce(baseTicket as any);
    mockUsersFindFirst.mockResolvedValueOnce({ id: 3, role: 'TeamLead', isActive: true } as any);
    setupUpdateSuccess();

    const result = await assignTicket(100, 3);
    expect(result).toEqual({ success: true, agentId: 3 });
  });

  it('auto-assigns via category when no explicit agentId given', async () => {
    // assignTicket: fetch ticket
    mockTicketsFindFirst.mockResolvedValueOnce(baseTicket as any); // ticket has categoryId: 10
    // findBestAgentForCategory: fetch category, agents, counts
    mockCategoriesFindFirst.mockResolvedValueOnce(categoryNoDefault as any);
    mockUsersFindMany.mockResolvedValueOnce([agentB] as any);
    setupCountQueries([1]);
    // assignTicket: verify agent
    mockUsersFindFirst.mockResolvedValueOnce(agentB as any);
    setupUpdateSuccess();

    const result = await assignTicket(100);
    expect(result).toEqual({ success: true, agentId: 2 });
  });

  it('returns failure when auto-assignment finds no available agent', async () => {
    mockTicketsFindFirst.mockResolvedValueOnce(baseTicket as any);
    mockCategoriesFindFirst.mockResolvedValueOnce(categoryNoDefault as any);
    mockUsersFindMany.mockResolvedValueOnce([]); // no agents

    const result = await assignTicket(100);
    expect(result).toEqual({ success: false, reason: 'No agent available for assignment' });
  });
});

// ─────────────────────────────────────────────────────────────
// assignTicketsBulk
// ─────────────────────────────────────────────────────────────

describe('assignTicketsBulk', () => {
  it('counts successes and collects failed ticket ids', async () => {
    // Ticket 1: success
    mockTicketsFindFirst.mockResolvedValueOnce({ ...baseTicket, id: 1 } as any);
    mockUsersFindFirst.mockResolvedValueOnce(agentA as any);
    setupUpdateSuccess();

    // Ticket 2: not found → failure
    mockTicketsFindFirst.mockResolvedValueOnce(undefined);

    // Ticket 3: success
    mockTicketsFindFirst.mockResolvedValueOnce({ ...baseTicket, id: 3 } as any);
    mockUsersFindFirst.mockResolvedValueOnce(agentA as any);
    setupUpdateSuccess();

    const result = await assignTicketsBulk([1, 2, 3], 1);
    expect(result.success).toBe(2);
    expect(result.failed).toEqual([2]);
  });

  it('returns all failed when agent does not exist', async () => {
    mockTicketsFindFirst.mockResolvedValue({ ...baseTicket, id: 1 } as any);
    mockUsersFindFirst.mockResolvedValue(undefined);

    const result = await assignTicketsBulk([1, 2], 999);
    expect(result.success).toBe(0);
    expect(result.failed).toEqual([1, 2]);
  });
});

// ─────────────────────────────────────────────────────────────
// getAgentWorkload
// ─────────────────────────────────────────────────────────────

describe('getAgentWorkload', () => {
  it('counts open, resolved, and closed tickets correctly', async () => {
    const agentTickets = [
      { status: 'Open', resolvedAt: null, slaResolutionDue: null },
      { status: 'Assigned', resolvedAt: null, slaResolutionDue: null },
      { status: 'Resolved', resolvedAt: new Date('2026-01-01T10:00:00Z'), slaResolutionDue: new Date('2026-01-01T12:00:00Z') },
      { status: 'Closed', resolvedAt: null, slaResolutionDue: null }
    ];
    mockTicketsFindMany.mockResolvedValueOnce(agentTickets as any);

    const result = await getAgentWorkload(1);
    expect(result.open).toBe(2);      // Open + Assigned
    expect(result.resolved).toBe(1);
    expect(result.closed).toBe(1);
    expect(result.total).toBe(4);
  });

  it('calculates 100% SLA compliance when resolved ticket was on time', async () => {
    const agentTickets = [
      {
        status: 'Resolved',
        resolvedAt: new Date('2026-01-01T10:00:00Z'),
        slaResolutionDue: new Date('2026-01-01T12:00:00Z') // resolved before due
      }
    ];
    mockTicketsFindMany.mockResolvedValueOnce(agentTickets as any);

    const result = await getAgentWorkload(1);
    expect(result.slaCompliance).toBe(100);
  });

  it('calculates 0% SLA compliance when resolved ticket was late', async () => {
    const agentTickets = [
      {
        status: 'Resolved',
        resolvedAt: new Date('2026-01-01T14:00:00Z'), // resolved after due
        slaResolutionDue: new Date('2026-01-01T12:00:00Z')
      }
    ];
    mockTicketsFindMany.mockResolvedValueOnce(agentTickets as any);

    const result = await getAgentWorkload(1);
    expect(result.slaCompliance).toBe(0);
  });

  it('returns 100% SLA compliance when no resolved tickets', async () => {
    mockTicketsFindMany.mockResolvedValueOnce([
      { status: 'Open', resolvedAt: null, slaResolutionDue: null }
    ] as any);

    const result = await getAgentWorkload(1);
    expect(result.slaCompliance).toBe(100);
  });

  it('calculates partial SLA compliance', async () => {
    const agentTickets = [
      {
        status: 'Resolved',
        resolvedAt: new Date('2026-01-01T10:00:00Z'),
        slaResolutionDue: new Date('2026-01-01T12:00:00Z') // on time
      },
      {
        status: 'Resolved',
        resolvedAt: new Date('2026-01-01T14:00:00Z'),
        slaResolutionDue: new Date('2026-01-01T12:00:00Z') // late
      }
    ];
    mockTicketsFindMany.mockResolvedValueOnce(agentTickets as any);

    const result = await getAgentWorkload(1);
    expect(result.slaCompliance).toBe(50);
  });
});

// ─────────────────────────────────────────────────────────────
// reassignTicket
// ─────────────────────────────────────────────────────────────

describe('reassignTicket', () => {
  it('returns failure when ticket not found', async () => {
    mockTicketsFindFirst.mockResolvedValueOnce(undefined);
    const result = await reassignTicket(999, 1, 2);
    expect(result).toEqual({ success: false, reason: 'Ticket not found' });
  });

  it('returns failure when ticket is not assigned to fromAgentId', async () => {
    mockTicketsFindFirst.mockResolvedValueOnce({ ...baseTicket, assignedAgentId: 3 } as any);
    const result = await reassignTicket(100, 1, 2); // fromAgentId=1 but ticket has 3
    expect(result).toEqual({ success: false, reason: 'Ticket not assigned to specified agent' });
  });

  it('returns failure when target agent not found', async () => {
    mockTicketsFindFirst.mockResolvedValueOnce({ ...baseTicket, assignedAgentId: 1 } as any);
    mockUsersFindFirst.mockResolvedValueOnce(undefined);
    const result = await reassignTicket(100, 1, 999);
    expect(result).toEqual({ success: false, reason: 'Target agent not found or inactive' });
  });

  it('returns failure when target agent has non-Agent role', async () => {
    mockTicketsFindFirst.mockResolvedValueOnce({ ...baseTicket, assignedAgentId: 1 } as any);
    mockUsersFindFirst.mockResolvedValueOnce({ id: 5, role: 'Employee', isActive: true } as any);
    const result = await reassignTicket(100, 1, 5);
    expect(result).toEqual({ success: false, reason: 'Target agent not found or inactive' });
  });

  it('successfully reassigns ticket to another agent', async () => {
    mockTicketsFindFirst.mockResolvedValueOnce({ ...baseTicket, assignedAgentId: 1 } as any);
    mockUsersFindFirst.mockResolvedValueOnce(agentB as any);
    setupUpdateSuccess();

    const result = await reassignTicket(100, 1, 2);
    expect(result).toEqual({ success: true, agentId: 2 });
    expect(mockUpdate).toHaveBeenCalledOnce();
  });
});
