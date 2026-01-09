import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PATCH } from './route';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { tickets, ticketStatusHistory } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  auth: vi.fn()
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
    insert: vi.fn()
  }
}));

import { auth } from '@/lib/auth';

describe('PATCH /api/tickets/[id] - Status Update Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
  });

  const createMockRequest = (ticketId: string, body: any) => {
    return new NextRequest(`http://localhost:3000/api/tickets/${ticketId}`, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });
  };

  const createSession = (role: string, userId: string = '1') => ({
    user: { id: userId, email: 'test@test.com', role, name: 'Test' },
    expires: new Date(Date.now() + 3600000).toISOString()
  });

  describe('authentication and authorization', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);

      const mockRequest = createMockRequest('1', { status: 'In Progress' });
      const response = await PATCH(mockRequest as any, {
        params: Promise.resolve({ id: '1' })
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('unauthorized');
    });

    it('returns 403 when employee tries to update another users ticket', async () => {
      const employeeSession = createSession('Employee', '1');
      vi.mocked(auth).mockResolvedValueOnce(employeeSession as any);

      const mockDbSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([
              {
                id: 1,
                status: 'Open',
                callerId: 999, // Different user
                assignedAgentId: null
              }
            ])
          })
        })
      });
      vi.mocked(db.select).mockImplementation(mockDbSelect as any);

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce([])
        })
      });
      vi.mocked(db.update).mockReturnValue(mockUpdate() as any);

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValueOnce([])
      });
      vi.mocked(db.insert).mockReturnValue(mockInsert() as any);

      const mockRequest = createMockRequest('1', { status: 'In Progress' });
      const response = await PATCH(mockRequest as any, {
        params: Promise.resolve({ id: '1' })
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('forbidden');
    });

    it('allows employee to update their own ticket', async () => {
      const employeeSession = createSession('Employee', '1');
      vi.mocked(auth).mockResolvedValueOnce(employeeSession as any);

      const mockDbSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([
              {
                id: 1,
                status: 'Open',
                callerId: 1, // Same user
                assignedAgentId: null
              }
            ])
          })
        })
      });
      vi.mocked(db.select).mockImplementation(mockDbSelect as any);

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce([])
        })
      });
      vi.mocked(db.update).mockReturnValue(mockUpdate() as any);

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValueOnce([])
      });
      vi.mocked(db.insert).mockReturnValue(mockInsert() as any);

      const mockRequest = createMockRequest('1', { status: 'In Progress' });
      const response = await PATCH(mockRequest as any, {
        params: Promise.resolve({ id: '1' })
      });

      expect(response.status).not.toBe(403);
    });

    it('allows agent to update assigned ticket', async () => {
      const agentSession = createSession('Agent', '5');
      vi.mocked(auth).mockResolvedValueOnce(agentSession as any);

      const mockDbSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([
              {
                id: 1,
                status: 'In Progress',
                callerId: 999,
                assignedAgentId: 5 // Assigned to this agent
              }
            ])
          })
        })
      });
      vi.mocked(db.select).mockImplementation(mockDbSelect as any);

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce([])
        })
      });
      vi.mocked(db.update).mockReturnValue(mockUpdate() as any);

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValueOnce([])
      });
      vi.mocked(db.insert).mockReturnValue(mockInsert() as any);

      const mockRequest = createMockRequest('1', { status: 'Resolved' });
      const response = await PATCH(mockRequest as any, {
        params: Promise.resolve({ id: '1' })
      });

      expect(response.status).not.toBe(403);
    });

    it('denies agent updating unassigned ticket', async () => {
      const agentSession = createSession('Agent', '5');
      vi.mocked(auth).mockResolvedValueOnce(agentSession as any);

      const mockDbSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([
              {
                id: 1,
                status: 'Open',
                callerId: 999,
                assignedAgentId: 10 // Not assigned to this agent
              }
            ])
          })
        })
      });
      vi.mocked(db.select).mockImplementation(mockDbSelect as any);

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce([])
        })
      });
      vi.mocked(db.update).mockReturnValue(mockUpdate() as any);

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValueOnce([])
      });
      vi.mocked(db.insert).mockReturnValue(mockInsert() as any);

      const mockRequest = createMockRequest('1', { status: 'In Progress' });
      const response = await PATCH(mockRequest as any, {
        params: Promise.resolve({ id: '1' })
      });

      expect(response.status).toBe(403);
    });

    it('allows team lead to update any ticket', async () => {
      const teamLeadSession = createSession('TeamLead', '10');
      vi.mocked(auth).mockResolvedValueOnce(teamLeadSession as any);

      const mockDbSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([
              {
                id: 1,
                status: 'Open',
                callerId: 999,
                assignedAgentId: 5
              }
            ])
          })
        })
      });
      vi.mocked(db.select).mockImplementation(mockDbSelect as any);

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce([])
        })
      });
      vi.mocked(db.update).mockReturnValue(mockUpdate() as any);

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValueOnce([])
      });
      vi.mocked(db.insert).mockReturnValue(mockInsert() as any);

      const mockRequest = createMockRequest('1', { status: 'In Progress' });
      const response = await PATCH(mockRequest as any, {
        params: Promise.resolve({ id: '1' })
      });

      expect(response.status).not.toBe(403);
    });

    it('allows admin to update any ticket', async () => {
      const adminSession = createSession('Admin', '100');
      vi.mocked(auth).mockResolvedValueOnce(adminSession as any);

      const mockDbSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([
              {
                id: 1,
                status: 'Open',
                callerId: 999,
                assignedAgentId: 5
              }
            ])
          })
        })
      });
      vi.mocked(db.select).mockImplementation(mockDbSelect as any);

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce([])
        })
      });
      vi.mocked(db.update).mockReturnValue(mockUpdate() as any);

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValueOnce([])
      });
      vi.mocked(db.insert).mockReturnValue(mockInsert() as any);

      const mockRequest = createMockRequest('1', { status: 'In Progress' });
      const response = await PATCH(mockRequest as any, {
        params: Promise.resolve({ id: '1' })
      });

      expect(response.status).not.toBe(403);
    });
  });

  describe('status transition validation', () => {
    const setupAuthenticatedRequest = async (currentStatus: string, newStatus: string) => {
      const adminSession = createSession('Admin', '100');
      vi.mocked(auth).mockResolvedValueOnce(adminSession as any);

      const mockDbSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([
              {
                id: 1,
                status: currentStatus,
                callerId: 999,
                assignedAgentId: 5
              }
            ])
          })
        })
      });
      vi.mocked(db.select).mockImplementation(mockDbSelect as any);

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce([])
        })
      });
      vi.mocked(db.update).mockReturnValue(mockUpdate() as any);

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValueOnce([])
      });
      vi.mocked(db.insert).mockReturnValue(mockInsert() as any);

      const mockRequest = createMockRequest('1', { status: newStatus });
      return await PATCH(mockRequest as any, {
        params: Promise.resolve({ id: '1' })
      });
    };

    it('allows valid transition: Open -> In Progress', async () => {
      const response = await setupAuthenticatedRequest('Open', 'In Progress');
      expect(response.status).not.toBe(400);
    });

    it('allows valid transition: In Progress -> Resolved', async () => {
      const response = await setupAuthenticatedRequest('In Progress', 'Resolved');
      expect(response.status).not.toBe(400);
    });

    it('allows valid transition: Resolved -> Open (reopened)', async () => {
      const response = await setupAuthenticatedRequest('Resolved', 'Open');
      expect(response.status).not.toBe(400);
    });

    it('allows valid transition: Resolved -> Closed', async () => {
      const response = await setupAuthenticatedRequest('Resolved', 'Closed');
      expect(response.status).not.toBe(400);
    });

    it('allows valid transition: Closed -> Open (reopened)', async () => {
      const response = await setupAuthenticatedRequest('Closed', 'Open');
      expect(response.status).not.toBe(400);
    });

    it('rejects invalid transition: Open -> Resolved', async () => {
      const response = await setupAuthenticatedRequest('Open', 'Resolved');
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('invalid_status_transition');
    });

    it('rejects invalid transition: Open -> Closed', async () => {
      const response = await setupAuthenticatedRequest('Open', 'Closed');
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('invalid_status_transition');
    });

    it('rejects invalid transition: In Progress -> Open', async () => {
      const response = await setupAuthenticatedRequest('In Progress', 'Open');
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('invalid_status_transition');
    });

    it('rejects invalid transition: Resolved -> Pending', async () => {
      const adminSession = createSession('Admin', '100');
      vi.mocked(auth).mockResolvedValueOnce(adminSession as any);

      const mockDbSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([
              {
                id: 1,
                status: 'Resolved',
                callerId: 999,
                assignedAgentId: 5
              }
            ])
          })
        })
      });
      vi.mocked(db.select).mockImplementation(mockDbSelect as any);

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce([])
        })
      });
      vi.mocked(db.update).mockReturnValue(mockUpdate() as any);

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValueOnce([])
      });
      vi.mocked(db.insert).mockReturnValue(mockInsert() as any);

      const mockRequest = createMockRequest('1', { status: 'Pending' });
      const response = await PATCH(mockRequest as any, {
        params: Promise.resolve({ id: '1' })
      });

      // Should fail validation (Pending is not in schema enum)
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('validation_error');
    });
  });

  describe('timestamp handling', () => {
    it('sets resolvedAt when status changes to Resolved', async () => {
      const adminSession = createSession('Admin', '100');
      vi.mocked(auth).mockResolvedValueOnce(adminSession as any);

      const mockDbSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([
              {
                id: 1,
                status: 'In Progress',
                callerId: 999,
                assignedAgentId: 5
              }
            ])
          })
        })
      });
      vi.mocked(db.select).mockImplementation(mockDbSelect as any);

      let capturedUpdateData: any = null;
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockImplementation((data: any) => {
          capturedUpdateData = data;
          return {
            where: vi.fn().mockResolvedValueOnce([])
          };
        })
      });
      vi.mocked(db.update).mockReturnValue(mockUpdate() as any);

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValueOnce([])
      });
      vi.mocked(db.insert).mockReturnValue(mockInsert() as any);

      const mockRequest = createMockRequest('1', { status: 'Resolved' });
      const response = await PATCH(mockRequest as any, {
        params: Promise.resolve({ id: '1' })
      });

      expect(response.status).toBe(200);
      expect(capturedUpdateData.resolvedAt).toBeInstanceOf(Date);
    });

    it('sets closedAt when status changes to Closed', async () => {
      const adminSession = createSession('Admin', '100');
      vi.mocked(auth).mockResolvedValueOnce(adminSession as any);

      const mockDbSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([
              {
                id: 1,
                status: 'Resolved',
                callerId: 999,
                assignedAgentId: 5
              }
            ])
          })
        })
      });
      vi.mocked(db.select).mockImplementation(mockDbSelect as any);

      let capturedUpdateData: any = null;
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockImplementation((data: any) => {
          capturedUpdateData = data;
          return {
            where: vi.fn().mockResolvedValueOnce([])
          };
        })
      });
      vi.mocked(db.update).mockReturnValue(mockUpdate() as any);

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValueOnce([])
      });
      vi.mocked(db.insert).mockReturnValue(mockInsert() as any);

      const mockRequest = createMockRequest('1', { status: 'Closed' });
      const response = await PATCH(mockRequest as any, {
        params: Promise.resolve({ id: '1' })
      });

      expect(response.status).toBe(200);
      expect(capturedUpdateData.closedAt).toBeInstanceOf(Date);
    });

    it('clears resolvedAt when reopened from Resolved', async () => {
      const adminSession = createSession('Admin', '100');
      vi.mocked(auth).mockResolvedValueOnce(adminSession as any);

      const mockDbSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([
              {
                id: 1,
                status: 'Resolved',
                callerId: 999,
                assignedAgentId: 5
              }
            ])
          })
        })
      });
      vi.mocked(db.select).mockImplementation(mockDbSelect as any);

      let capturedUpdateData: any = null;
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockImplementation((data: any) => {
          capturedUpdateData = data;
          return {
            where: vi.fn().mockResolvedValueOnce([])
          };
        })
      });
      vi.mocked(db.update).mockReturnValue(mockUpdate() as any);

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValueOnce([])
      });
      vi.mocked(db.insert).mockReturnValue(mockInsert() as any);

      const mockRequest = createMockRequest('1', { status: 'Open' });
      const response = await PATCH(mockRequest as any, {
        params: Promise.resolve({ id: '1' })
      });

      expect(response.status).toBe(200);
      expect(capturedUpdateData.resolvedAt).toBeNull();
    });

    it('clears closedAt when reopened from Closed', async () => {
      const adminSession = createSession('Admin', '100');
      vi.mocked(auth).mockResolvedValueOnce(adminSession as any);

      const mockDbSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([
              {
                id: 1,
                status: 'Closed',
                callerId: 999,
                assignedAgentId: 5
              }
            ])
          })
        })
      });
      vi.mocked(db.select).mockImplementation(mockDbSelect as any);

      let capturedUpdateData: any = null;
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockImplementation((data: any) => {
          capturedUpdateData = data;
          return {
            where: vi.fn().mockResolvedValueOnce([])
          };
        })
      });
      vi.mocked(db.update).mockReturnValue(mockUpdate() as any);

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValueOnce([])
      });
      vi.mocked(db.insert).mockReturnValue(mockInsert() as any);

      const mockRequest = createMockRequest('1', { status: 'Open' });
      const response = await PATCH(mockRequest as any, {
        params: Promise.resolve({ id: '1' })
      });

      expect(response.status).toBe(200);
      expect(capturedUpdateData.closedAt).toBeNull();
    });
  });

  describe('validation', () => {
    it('returns 400 for invalid ticket ID', async () => {
      const adminSession = createSession('Admin', '100');
      vi.mocked(auth).mockResolvedValueOnce(adminSession as any);

      const mockRequest = createMockRequest('invalid', { status: 'In Progress' });
      const response = await PATCH(mockRequest as any, {
        params: Promise.resolve({ id: 'invalid' })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('invalid_ticket_id');
    });

    it('returns 404 for non-existent ticket', async () => {
      const adminSession = createSession('Admin', '100');
      vi.mocked(auth).mockResolvedValueOnce(adminSession as any);

      const mockDbSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([])
          })
        })
      });
      vi.mocked(db.select).mockImplementation(mockDbSelect as any);

      const mockRequest = createMockRequest('999', { status: 'In Progress' });
      const response = await PATCH(mockRequest as any, {
        params: Promise.resolve({ id: '999' })
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('ticket_not_found');
    });

    it('returns 400 for invalid status value', async () => {
      const adminSession = createSession('Admin', '100');
      vi.mocked(auth).mockResolvedValueOnce(adminSession as any);

      const mockRequest = createMockRequest('1', { status: 'InvalidStatus' });
      const response = await PATCH(mockRequest as any, {
        params: Promise.resolve({ id: '1' })
      });

      expect(response.status).toBe(400);
    });

    it('accepts valid status values', async () => {
      const adminSession = createSession('Admin', '100');
      vi.mocked(auth).mockResolvedValueOnce(adminSession as any);

      const mockDbSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([
              {
                id: 1,
                status: 'Open',
                callerId: 999,
                assignedAgentId: 5
              }
            ])
          })
        })
      });
      vi.mocked(db.select).mockImplementation(mockDbSelect as any);

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce([])
        })
      });
      vi.mocked(db.update).mockReturnValue(mockUpdate() as any);

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValueOnce([])
      });
      vi.mocked(db.insert).mockReturnValue(mockInsert() as any);

      const validStatuses = ['Open', 'In Progress', 'Resolved', 'Closed'];
      for (const status of validStatuses) {
        const mockRequest = createMockRequest('1', { status });
        const response = await PATCH(mockRequest as any, {
          params: Promise.resolve({ id: '1' })
        });

        // Should pass validation (may fail on transition, but that's OK)
        const data = await response.json();
        expect(response.status).not.toBe(400);
      }
    });

    it('accepts optional notes field', async () => {
      const adminSession = createSession('Admin', '100');
      vi.mocked(auth).mockResolvedValueOnce(adminSession as any);

      const mockDbSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([
              {
                id: 1,
                status: 'Open',
                callerId: 999,
                assignedAgentId: 5
              }
            ])
          })
        })
      });
      vi.mocked(db.select).mockImplementation(mockDbSelect as any);

      let capturedInsertData: any = null;
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce([])
        })
      });
      vi.mocked(db.update).mockReturnValue(mockUpdate() as any);

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockImplementation((data: any) => {
          capturedInsertData = data;
          return Promise.resolve([]);
        })
      });
      vi.mocked(db.insert).mockReturnValue(mockInsert() as any);

      const mockRequest = createMockRequest('1', {
        status: 'In Progress',
        notes: 'Working on this issue'
      });
      const response = await PATCH(mockRequest as any, {
        params: Promise.resolve({ id: '1' })
      });

      expect(response.status).toBe(200);
      expect(capturedInsertData.notes).toBe('Working on this issue');
    });
  });

  describe('status history logging', () => {
    it('logs status change in history', async () => {
      const adminSession = createSession('Admin', '100');
      vi.mocked(auth).mockResolvedValueOnce(adminSession as any);

      const mockDbSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([
              {
                id: 1,
                status: 'Open',
                callerId: 999,
                assignedAgentId: 5
              }
            ])
          })
        })
      });
      vi.mocked(db.select).mockImplementation(mockDbSelect as any);

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce([])
        })
      });
      vi.mocked(db.update).mockReturnValue(mockUpdate() as any);

      let capturedInsertData: any = null;
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockImplementation((data: any) => {
          capturedInsertData = data;
          return Promise.resolve([]);
        })
      });
      vi.mocked(db.insert).mockReturnValue(mockInsert() as any);

      const mockRequest = createMockRequest('1', {
        status: 'In Progress',
        notes: 'Started working on ticket'
      });
      const response = await PATCH(mockRequest as any, {
        params: Promise.resolve({ id: '1' })
      });

      expect(response.status).toBe(200);
      expect(capturedInsertData).toMatchObject({
        ticketId: 1,
        fromStatus: 'Open',
        toStatus: 'In Progress',
        changedBy: 100,
        notes: 'Started working on ticket'
      });
    });
  });

  describe('response format', () => {
    it('returns success response with correct format', async () => {
      const adminSession = createSession('Admin', '100');
      vi.mocked(auth).mockResolvedValueOnce(adminSession as any);

      const mockDbSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([
              {
                id: 1,
                status: 'Open',
                callerId: 999,
                assignedAgentId: 5
              }
            ])
          })
        })
      });
      vi.mocked(db.select).mockImplementation(mockDbSelect as any);

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce([])
        })
      });
      vi.mocked(db.update).mockReturnValue(mockUpdate() as any);

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValueOnce([])
      });
      vi.mocked(db.insert).mockReturnValue(mockInsert() as any);

      const mockRequest = createMockRequest('1', { status: 'In Progress' });
      const response = await PATCH(mockRequest as any, {
        params: Promise.resolve({ id: '1' })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toMatchObject({
        success: true,
        ticketId: 1,
        previousStatus: 'Open',
        newStatus: 'In Progress'
      });
    });
  });
});
