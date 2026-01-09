import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(() => Promise.resolve({
    user: {
      id: '1',
      email: 'agent@example.com',
      name: 'Test Agent'
    }
  }))
}));

describe('POST /api/tickets - Validation Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('required fields validation', () => {
    it('returns 400 for missing impact field', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/tickets', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Ticket',
          description: 'Test description',
          urgency: 'High',
          callerName: 'John Doe',
          callerEmail: 'john@example.com'
        })
      });

      const response = await POST(mockRequest as any);
      expect(response.status).toBe(400);
    });

    it('returns 400 for missing urgency field', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/tickets', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Ticket',
          description: 'Test description',
          impact: 'High',
          callerName: 'John Doe',
          callerEmail: 'john@example.com'
        })
      });

      const response = await POST(mockRequest as any);
      expect(response.status).toBe(400);
    });

    it('returns 400 for missing title', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/tickets', {
        method: 'POST',
        body: JSON.stringify({
          description: 'Test description',
          impact: 'High',
          urgency: 'High',
          callerName: 'John Doe',
          callerEmail: 'john@example.com'
        })
      });

      const response = await POST(mockRequest as any);
      expect(response.status).toBe(400);
    });

    it('returns 400 for missing description', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/tickets', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Ticket',
          impact: 'High',
          urgency: 'High',
          callerName: 'John Doe',
          callerEmail: 'john@example.com'
        })
      });

      const response = await POST(mockRequest as any);
      expect(response.status).toBe(400);
    });

    it('returns 400 for missing caller name', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/tickets', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Ticket',
          description: 'Test description',
          impact: 'High',
          urgency: 'High',
          callerEmail: 'john@example.com'
        })
      });

      const response = await POST(mockRequest as any);
      expect(response.status).toBe(400);
    });
  });

  describe('impact field validation', () => {
    it('returns 400 for invalid impact value', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/tickets', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Ticket',
          description: 'Test description',
          impact: 'Critical',
          urgency: 'High',
          callerName: 'John Doe',
          callerEmail: 'john@example.com'
        })
      });

      const response = await POST(mockRequest as any);
      expect(response.status).toBe(400);
    });

    it('accepts valid Low impact value', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/tickets', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Ticket',
          description: 'Test description',
          impact: 'Low',
          urgency: 'Medium',
          callerName: 'John Doe',
          callerEmail: 'john@example.com'
        })
      });

      const response = await POST(mockRequest as any);
      // Should not be a validation error (will fail on DB, but that's expected)
      expect(response.status).not.toBe(400);
    });

    it('accepts valid Medium impact value', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/tickets', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Ticket',
          description: 'Test description',
          impact: 'Medium',
          urgency: 'Medium',
          callerName: 'John Doe',
          callerEmail: 'john@example.com'
        })
      });

      const response = await POST(mockRequest as any);
      expect(response.status).not.toBe(400);
    });

    it('accepts valid High impact value', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/tickets', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Ticket',
          description: 'Test description',
          impact: 'High',
          urgency: 'Medium',
          callerName: 'John Doe',
          callerEmail: 'john@example.com'
        })
      });

      const response = await POST(mockRequest as any);
      expect(response.status).not.toBe(400);
    });
  });

  describe('urgency field validation', () => {
    it('returns 400 for invalid urgency value', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/tickets', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Ticket',
          description: 'Test description',
          impact: 'High',
          urgency: 'Critical',
          callerName: 'John Doe',
          callerEmail: 'john@example.com'
        })
      });

      const response = await POST(mockRequest as any);
      expect(response.status).toBe(400);
    });

    it('accepts valid Low urgency value', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/tickets', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Ticket',
          description: 'Test description',
          impact: 'Medium',
          urgency: 'Low',
          callerName: 'John Doe',
          callerEmail: 'john@example.com'
        })
      });

      const response = await POST(mockRequest as any);
      expect(response.status).not.toBe(400);
    });

    it('accepts valid Medium urgency value', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/tickets', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Ticket',
          description: 'Test description',
          impact: 'Medium',
          urgency: 'Medium',
          callerName: 'John Doe',
          callerEmail: 'john@example.com'
        })
      });

      const response = await POST(mockRequest as any);
      expect(response.status).not.toBe(400);
    });

    it('accepts valid High urgency value', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/tickets', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Ticket',
          description: 'Test description',
          impact: 'Medium',
          urgency: 'High',
          callerName: 'John Doe',
          callerEmail: 'john@example.com'
        })
      });

      const response = await POST(mockRequest as any);
      expect(response.status).not.toBe(400);
    });
  });

  describe('caller information validation', () => {
    it('accepts valid email format', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/tickets', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Ticket',
          description: 'Test description',
          impact: 'Medium',
          urgency: 'Medium',
          callerName: 'John Doe',
          callerEmail: 'john@example.com'
        })
      });

      const response = await POST(mockRequest as any);
      expect(response.status).not.toBe(400);
    });

    it('returns 400 for invalid email format', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/tickets', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Ticket',
          description: 'Test description',
          impact: 'Medium',
          urgency: 'Medium',
          callerName: 'John Doe',
          callerEmail: 'not-an-email'
        })
      });

      const response = await POST(mockRequest as any);
      expect(response.status).toBe(400);
    });

    it('allows empty email string', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/tickets', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Ticket',
          description: 'Test description',
          impact: 'Medium',
          urgency: 'Medium',
          callerName: 'John Doe',
          callerEmail: ''
        })
      });

      const response = await POST(mockRequest as any);
      expect(response.status).not.toBe(400);
    });

    it('allows omitting email field', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/tickets', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Ticket',
          description: 'Test description',
          impact: 'Medium',
          urgency: 'Medium',
          callerName: 'John Doe'
        })
      });

      const response = await POST(mockRequest as any);
      expect(response.status).not.toBe(400);
    });
  });

  describe('optional fields', () => {
    it('accepts ticket with all optional fields', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/tickets', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Ticket',
          description: 'Test description',
          impact: 'High',
          urgency: 'High',
          category: 'Hardware',
          callerName: 'John Doe',
          callerEmail: 'john@example.com',
          callerPhone: '555-1234',
          callerEmployeeId: 'EMP001'
        })
      });

      const response = await POST(mockRequest as any);
      expect(response.status).not.toBe(400);
    });

    it('accepts ticket with only required fields', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/tickets', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Ticket',
          description: 'Test description',
          impact: 'Medium',
          urgency: 'Medium',
          callerName: 'John Doe'
        })
      });

      const response = await POST(mockRequest as any);
      expect(response.status).not.toBe(400);
    });
  });

  describe('title and description length validation', () => {
    it('returns 400 for empty title', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/tickets', {
        method: 'POST',
        body: JSON.stringify({
          title: '',
          description: 'Test description',
          impact: 'Medium',
          urgency: 'Medium',
          callerName: 'John Doe'
        })
      });

      const response = await POST(mockRequest as any);
      expect(response.status).toBe(400);
    });

    it('returns 400 for empty description', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/tickets', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Ticket',
          description: '',
          impact: 'Medium',
          urgency: 'Medium',
          callerName: 'John Doe'
        })
      });

      const response = await POST(mockRequest as any);
      expect(response.status).toBe(400);
    });
  });

  describe('category field', () => {
    it('accepts ticket with category', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/tickets', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Ticket',
          description: 'Test description',
          impact: 'Medium',
          urgency: 'Medium',
          category: 'Software',
          callerName: 'John Doe'
        })
      });

      const response = await POST(mockRequest as any);
      expect(response.status).not.toBe(400);
    });

    it('accepts ticket without category', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/tickets', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Ticket',
          description: 'Test description',
          impact: 'Medium',
          urgency: 'Medium',
          callerName: 'John Doe'
        })
      });

      const response = await POST(mockRequest as any);
      expect(response.status).not.toBe(400);
    });
  });
});
