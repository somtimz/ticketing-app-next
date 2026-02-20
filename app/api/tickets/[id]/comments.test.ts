import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, POST } from './comments/route';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    query: {
      tickets: { findFirst: vi.fn() },
      users: { findFirst: vi.fn() }
    }
  }
}));

vi.mock('@/lib/email', () => ({
  sendTicketCommentEmail: vi.fn().mockResolvedValue(true)
}));

import { auth } from '@/lib/auth';

function makeSession(role: string, id = '1') {
  return {
    user: { id, role, email: `user${id}@example.com`, name: role },
    expires: '2099-01-01'
  };
}

function makeRequest(method: string, ticketId: string, body?: any) {
  return new NextRequest(`http://localhost:3000/api/tickets/${ticketId}/comments`, {
    method,
    ...(body ? { body: JSON.stringify(body) } : {})
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

// Chain for comments select: .from().innerJoin().where().orderBy()
function makeCommentChain(result: any[] = []) {
  const chain: any = {};
  chain.from = vi.fn(() => chain);
  chain.innerJoin = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.orderBy = vi.fn().mockResolvedValue(result);
  return chain;
}

// Chain for caller lookup: .from().where().limit()
function makeCallerChain(result: any[] = []) {
  const chain: any = {};
  chain.from = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.limit = vi.fn().mockResolvedValue(result);
  return chain;
}

// Chain for update: .set().where()
function makeUpdateChain() {
  return {
    set: vi.fn(() => ({
      where: vi.fn().mockResolvedValue([])
    }))
  };
}

// Chain for insert: .values().returning()
function makeInsertChain(result: any[] = []) {
  return {
    values: vi.fn(() => ({
      returning: vi.fn().mockResolvedValue(result)
    }))
  };
}

const publicComment = { id: 1, body: 'Public comment', isInternal: false, createdAt: new Date(), author: { id: 1, fullName: 'Agent', role: 'Agent' } };
const internalComment = { id: 2, body: 'Internal note', isInternal: true, createdAt: new Date(), author: { id: 1, fullName: 'Agent', role: 'Agent' } };

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────
// GET /api/tickets/[id]/comments
// ─────────────────────────────────────────────────────────────

describe('GET /api/tickets/[id]/comments', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);
    const response = await GET(makeRequest('GET', '1') as any, makeParams('1'));
    expect(response.status).toBe(401);
  });

  it('returns 400 for non-numeric ticket ID', async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession('Agent') as any);
    const response = await GET(makeRequest('GET', 'abc') as any, makeParams('abc'));
    expect(response.status).toBe(400);
  });

  it('returns all comments including internal for agents', async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession('Agent') as any);
    vi.mocked(db.select).mockReturnValue(makeCommentChain([publicComment, internalComment]));

    const response = await GET(makeRequest('GET', '1') as any, makeParams('1'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.comments).toHaveLength(2);
  });

  it('filters out internal comments for employees', async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession('Employee') as any);
    vi.mocked(db.select).mockReturnValue(makeCommentChain([publicComment, internalComment]));

    const response = await GET(makeRequest('GET', '1') as any, makeParams('1'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.comments).toHaveLength(1);
    expect(body.comments[0].isInternal).toBe(false);
  });

  it('returns empty array when no comments exist', async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession('Agent') as any);
    vi.mocked(db.select).mockReturnValue(makeCommentChain([]));

    const response = await GET(makeRequest('GET', '1') as any, makeParams('1'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.comments).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────
// POST /api/tickets/[id]/comments
// ─────────────────────────────────────────────────────────────

describe('POST /api/tickets/[id]/comments', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);
    const response = await POST(
      makeRequest('POST', '1', { body: 'Hello' }) as any,
      makeParams('1')
    );
    expect(response.status).toBe(401);
  });

  it('returns 400 for non-numeric ticket ID', async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession('Agent') as any);
    const response = await POST(
      makeRequest('POST', 'abc', { body: 'Hello' }) as any,
      makeParams('abc')
    );
    expect(response.status).toBe(400);
  });

  it('returns 404 when ticket does not exist', async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession('Agent') as any);
    vi.mocked(db.query.tickets.findFirst).mockResolvedValueOnce(undefined);

    const response = await POST(
      makeRequest('POST', '1', { body: 'Hello' }) as any,
      makeParams('1')
    );
    expect(response.status).toBe(404);
  });

  it('returns 400 for empty comment body', async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession('Agent') as any);
    vi.mocked(db.query.tickets.findFirst).mockResolvedValueOnce({ id: 1 } as any);

    const response = await POST(
      makeRequest('POST', '1', { body: '' }) as any,
      makeParams('1')
    );
    expect(response.status).toBe(400);
  });

  it('returns 201 with created comment', async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession('Agent') as any);
    vi.mocked(db.query.tickets.findFirst)
      .mockResolvedValueOnce({ id: 1 } as any)  // ticket exists check
      .mockResolvedValueOnce(null);              // email lookup (no assigned agent)
    vi.mocked(db.insert).mockReturnValue(makeInsertChain([publicComment]) as any);
    vi.mocked(db.update).mockReturnValue(makeUpdateChain() as any);

    const response = await POST(
      makeRequest('POST', '1', { body: 'This is a comment' }) as any,
      makeParams('1')
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.comment).toBeDefined();
  });

  it('enforces isInternal=false for employees even if they request true', async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession('Employee') as any);
    vi.mocked(db.query.tickets.findFirst)
      .mockResolvedValueOnce({ id: 1 } as any)
      .mockResolvedValueOnce({ id: 1, assignedAgentId: null, ticketNumber: 'INC-001', title: 'Test' } as any);

    let capturedValues: any;
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn((v: any) => {
        capturedValues = v;
        return { returning: vi.fn().mockResolvedValue([{ ...publicComment, isInternal: false }]) };
      })
    } as any);
    vi.mocked(db.update).mockReturnValue(makeUpdateChain() as any);

    const response = await POST(
      makeRequest('POST', '1', { body: 'Trying internal', isInternal: true }) as any,
      makeParams('1')
    );
    expect(response.status).toBe(201);
    expect(capturedValues.isInternal).toBe(false);
  });

  it('allows agents to post internal notes', async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession('Agent', '5') as any);
    vi.mocked(db.query.tickets.findFirst)
      .mockResolvedValueOnce({ id: 1 } as any);

    let capturedValues: any;
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn((v: any) => {
        capturedValues = v;
        return { returning: vi.fn().mockResolvedValue([{ ...internalComment }]) };
      })
    } as any);
    vi.mocked(db.update).mockReturnValue(makeUpdateChain() as any);

    const response = await POST(
      makeRequest('POST', '1', { body: 'Agent internal note', isInternal: true }) as any,
      makeParams('1')
    );
    expect(response.status).toBe(201);
    expect(capturedValues.isInternal).toBe(true);
  });

  it('sends email to caller when a public comment is posted', async () => {
    const { sendTicketCommentEmail } = await import('@/lib/email');

    vi.mocked(auth).mockResolvedValueOnce(makeSession('Agent', '99') as any);
    vi.mocked(db.query.tickets.findFirst)
      .mockResolvedValueOnce({ id: 1 } as any) // ticket exists check
      .mockResolvedValueOnce({                  // full ticket with caller, no assigned agent
        id: 1,
        ticketNumber: 'INC-0001',
        title: 'Printer broken',
        assignedAgentId: null,
        callerId: 42
      } as any);
    vi.mocked(db.insert).mockReturnValue(makeInsertChain([publicComment]) as any);
    vi.mocked(db.update).mockReturnValue(makeUpdateChain() as any);
    vi.mocked(db.select).mockReturnValue(
      makeCallerChain([{ email: 'caller@example.com' }]) as any
    );

    const response = await POST(
      makeRequest('POST', '1', { body: 'We are looking into this.' }) as any,
      makeParams('1')
    );
    expect(response.status).toBe(201);
    await vi.runAllTimersAsync().catch(() => {}); // flush void promises
    expect(sendTicketCommentEmail).toHaveBeenCalledWith(
      'caller@example.com',
      'INC-0001',
      'Printer broken',
      'Agent',
      'We are looking into this.',
      1
    );
  });

  it('does not send caller email for internal notes', async () => {
    const { sendTicketCommentEmail } = await import('@/lib/email');

    vi.mocked(auth).mockResolvedValueOnce(makeSession('Agent', '5') as any);
    vi.mocked(db.query.tickets.findFirst)
      .mockResolvedValueOnce({ id: 1 } as any);
    vi.mocked(db.insert).mockReturnValue(makeInsertChain([internalComment]) as any);
    vi.mocked(db.update).mockReturnValue(makeUpdateChain() as any);

    await POST(
      makeRequest('POST', '1', { body: 'Internal note', isInternal: true }) as any,
      makeParams('1')
    );
    expect(sendTicketCommentEmail).not.toHaveBeenCalled();
  });
});
