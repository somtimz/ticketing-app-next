import { describe, it, expect } from 'vitest';
import type { Session } from 'next-auth';
import {
  APIError,
  handleAPIError,
  requireAuth,
  requireRole,
  requireAnyRole
} from '@/lib/api-error';

function makeSession(role: string, id = '1'): Session {
  return {
    user: { id, role, name: 'Test User', email: 'test@example.com' },
    expires: '2099-01-01T00:00:00.000Z'
  } as unknown as Session;
}

function catchError(fn: () => void): unknown {
  try { fn(); } catch (e) { return e; }
}

describe('APIError', () => {
  it('stores status, code, and message', () => {
    const err = new APIError(404, 'not_found', 'Resource not found');
    expect(err.status).toBe(404);
    expect(err.code).toBe('not_found');
    expect(err.message).toBe('Resource not found');
  });

  it('has name "APIError"', () => {
    expect(new APIError(500, 'internal', 'oops').name).toBe('APIError');
  });

  it('is instanceof Error and APIError', () => {
    const err = new APIError(400, 'bad_request', 'bad');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(APIError);
  });
});

describe('handleAPIError', () => {
  it('returns APIError status and body', async () => {
    const response = handleAPIError(new APIError(404, 'not_found', 'Not found'));
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ error: 'not_found', message: 'Not found' });
  });

  it('returns 400 for ZodError', async () => {
    const zodErr = Object.assign(new Error('invalid'), { name: 'ZodError' });
    const response = handleAPIError(zodErr);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('validation_error');
  });

  it('returns 500 for generic Error', async () => {
    const response = handleAPIError(new Error('something broke'));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('internal_error');
  });

  it('returns 500 for non-Error throws (e.g. string)', async () => {
    const response = handleAPIError('something strange');
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('internal_error');
  });

  it('does not treat a regular Error named ZodError unless name matches', async () => {
    const response = handleAPIError(new Error('plain error'));
    expect(response.status).toBe(500);
  });
});

describe('requireAuth', () => {
  it('does not throw for authenticated session', () => {
    expect(() => requireAuth(makeSession('Employee'))).not.toThrow();
  });

  it('throws APIError 401 for null session', () => {
    const err = catchError(() => requireAuth(null)) as APIError;
    expect(err).toBeInstanceOf(APIError);
    expect(err.status).toBe(401);
    expect(err.code).toBe('unauthorized');
  });

  it('throws APIError 401 when session has no user', () => {
    const emptySession = { expires: '2099-01-01' } as unknown as Session;
    const err = catchError(() => requireAuth(emptySession)) as APIError;
    expect(err).toBeInstanceOf(APIError);
    expect(err.status).toBe(401);
  });
});

describe('requireRole', () => {
  it('does not throw when user has the required role', () => {
    expect(() => requireRole(makeSession('Agent'), 'Agent')).not.toThrow();
  });

  it('does not throw when user has a higher role (hierarchy)', () => {
    expect(() => requireRole(makeSession('Admin'), 'Employee')).not.toThrow();
    expect(() => requireRole(makeSession('TeamLead'), 'Agent')).not.toThrow();
  });

  it('throws 401 for unauthenticated session', () => {
    const err = catchError(() => requireRole(null, 'Employee')) as APIError;
    expect(err.status).toBe(401);
    expect(err.code).toBe('unauthorized');
  });

  it('throws 403 when role is insufficient', () => {
    const err = catchError(() => requireRole(makeSession('Employee'), 'Agent')) as APIError;
    expect(err).toBeInstanceOf(APIError);
    expect(err.status).toBe(403);
    expect(err.code).toBe('forbidden');
  });

  it('throws 403 not 401 when authenticated but wrong role', () => {
    const err = catchError(() => requireRole(makeSession('Agent'), 'Admin')) as APIError;
    expect(err.status).toBe(403);
  });
});

describe('requireAnyRole', () => {
  it('does not throw when user has one of the required roles', () => {
    expect(() => requireAnyRole(makeSession('Agent'), ['Agent', 'Admin'])).not.toThrow();
  });

  it('does not throw via role hierarchy (Admin satisfies Employee check)', () => {
    expect(() => requireAnyRole(makeSession('Admin'), ['Employee'])).not.toThrow();
  });

  it('throws 401 for unauthenticated session', () => {
    const err = catchError(() => requireAnyRole(null, ['Employee'])) as APIError;
    expect(err.status).toBe(401);
    expect(err.code).toBe('unauthorized');
  });

  it('throws 403 when user has none of the required roles', () => {
    const err = catchError(
      () => requireAnyRole(makeSession('Employee'), ['Agent', 'Admin'])
    ) as APIError;
    expect(err).toBeInstanceOf(APIError);
    expect(err.status).toBe(403);
    expect(err.code).toBe('forbidden');
  });

  it('throws 403 not 401 when authenticated but no matching role', () => {
    const err = catchError(
      () => requireAnyRole(makeSession('Agent'), ['Admin'])
    ) as APIError;
    expect(err.status).toBe(403);
  });
});
