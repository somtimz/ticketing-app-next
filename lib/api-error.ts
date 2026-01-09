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
