import { describe, it, expect } from 'vitest';
import {
  APIError,
  handleAPIError,
  requireAuth,
  requireRole,
  requireAnyRole
} from './api-error';
import type { Session } from 'next-auth';
import type { UserRole } from './rbac';

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
