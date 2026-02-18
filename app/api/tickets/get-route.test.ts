import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    query: {
      users: { findFirst: vi.fn() },
      tickets: { findFirst: vi.fn() }
    }
  }
}));

vi.mock('@/lib/email', () => ({
  sendTicketCreatedEmail: vi.fn(),
  sendTicketAssignedEmail: vi.fn()
}));

import { auth } from '@/lib/auth';

// A select chain that resolves at any terminal step
function makeChain(result: any[] = []) {
  const chain: any = {};
  const terminal = vi.fn().mockResolvedValue(result);
  chain.from = vi.fn(() => chain);
  chain.leftJoin = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.orderBy = vi.fn(() => chain);
  chain.limit = terminal;
  // Make chain awaitable directly (for queries without .limit)
  chain.then = (resolve: any, reject: any) =>
    Promise.resolve(result).then(resolve, reject);
  return chain;
}

function makeSession(role: string, id = '1') {
  return {
    user: { id, role, email: `${role.toLowerCase()}@example.com`, name: role },
    expires: '2099-01-01'
  };
}

const sampleTicket = {
  id: 1, ticketNumber: 'INC-2026-0001', title: 'Test', description: 'Desc',
  impact: 'High', urgency: 'High', priority: 'P1', status: 'New',
  slaFirstResponseDue: null, slaResolutionDue: null, lastActivityAt: null,
  createdAt: new Date(), updatedAt: new Date(), resolvedAt: null, closedAt: null,
  createdBy: 1,
  category: { id: 1, name: 'Hardware' },
  caller: { id: 1, fullName: 'John Doe', email: 'john@example.com', phone: null },
  assignedAgent: null
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/tickets', () => {
  describe('authentication', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);
      const req = new NextRequest('http://localhost:3000/api/tickets');
      const response = await GET(req);
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });
  });

  describe('role-based visibility', () => {
    it('Admin receives ticket list', async () => {
      vi.mocked(auth).mockResolvedValueOnce(makeSession('Admin') as any);
      vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({ departmentId: null } as any);
      vi.mocked(db.select).mockReturnValue(makeChain([sampleTicket]));

      const req = new NextRequest('http://localhost:3000/api/tickets');
      const response = await GET(req);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.tickets).toHaveLength(1);
      expect(body.tickets[0].ticketNumber).toBe('INC-2026-0001');
    });

    it('Agent receives ticket list', async () => {
      vi.mocked(auth).mockResolvedValueOnce(makeSession('Agent') as any);
      vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({ departmentId: null } as any);
      vi.mocked(db.select).mockReturnValue(makeChain([sampleTicket]));

      const req = new NextRequest('http://localhost:3000/api/tickets');
      const response = await GET(req);
      expect(response.status).toBe(200);
    });

    it('Employee receives ticket list', async () => {
      vi.mocked(auth).mockResolvedValueOnce(makeSession('Employee') as any);
      vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({ departmentId: null } as any);
      vi.mocked(db.select).mockReturnValue(makeChain([]));

      const req = new NextRequest('http://localhost:3000/api/tickets');
      const response = await GET(req);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(Array.isArray(body.tickets)).toBe(true);
    });
  });

  describe('response shape', () => {
    it('returns tickets array in response body', async () => {
      vi.mocked(auth).mockResolvedValueOnce(makeSession('Admin') as any);
      vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({ departmentId: null } as any);
      vi.mocked(db.select).mockReturnValue(makeChain([sampleTicket]));

      const req = new NextRequest('http://localhost:3000/api/tickets');
      const response = await GET(req);
      const body = await response.json();

      expect(body).toHaveProperty('tickets');
      expect(body.tickets[0]).toMatchObject({
        id: 1,
        ticketNumber: 'INC-2026-0001',
        status: 'New',
        priority: 'P1'
      });
    });

    it('maps null assignedAgent correctly', async () => {
      vi.mocked(auth).mockResolvedValueOnce(makeSession('Admin') as any);
      vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({ departmentId: null } as any);
      vi.mocked(db.select).mockReturnValue(makeChain([{ ...sampleTicket, assignedAgent: null }]));

      const req = new NextRequest('http://localhost:3000/api/tickets');
      const response = await GET(req);
      const body = await response.json();
      expect(body.tickets[0].assignedAgent).toBeNull();
    });

    it('provides fallback caller when caller is null', async () => {
      vi.mocked(auth).mockResolvedValueOnce(makeSession('Admin') as any);
      vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({ departmentId: null } as any);
      vi.mocked(db.select).mockReturnValue(makeChain([{ ...sampleTicket, caller: null }]));

      const req = new NextRequest('http://localhost:3000/api/tickets');
      const response = await GET(req);
      const body = await response.json();
      expect(body.tickets[0].caller.fullName).toBe('Unknown');
    });

    it('returns empty array when no tickets exist', async () => {
      vi.mocked(auth).mockResolvedValueOnce(makeSession('Admin') as any);
      vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({ departmentId: null } as any);
      vi.mocked(db.select).mockReturnValue(makeChain([]));

      const req = new NextRequest('http://localhost:3000/api/tickets');
      const response = await GET(req);
      const body = await response.json();
      expect(body.tickets).toEqual([]);
    });
  });

  describe('query parameters', () => {
    it('accepts status filter without error', async () => {
      vi.mocked(auth).mockResolvedValueOnce(makeSession('Admin') as any);
      vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({ departmentId: null } as any);
      vi.mocked(db.select).mockReturnValue(makeChain([]));

      const req = new NextRequest('http://localhost:3000/api/tickets?status=New');
      const response = await GET(req);
      expect(response.status).toBe(200);
    });

    it('accepts limit parameter without error', async () => {
      vi.mocked(auth).mockResolvedValueOnce(makeSession('Admin') as any);
      vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({ departmentId: null } as any);
      vi.mocked(db.select).mockReturnValue(makeChain([]));

      const req = new NextRequest('http://localhost:3000/api/tickets?limit=10');
      const response = await GET(req);
      expect(response.status).toBe(200);
    });
  });
});
