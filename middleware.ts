import { authEdge } from '@/lib/auth-edge';
import { NextResponse } from 'next/server';

export default authEdge((req) => {
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role as string | undefined;
  const path = req.nextUrl.pathname;

  const isOnAuthPage = path.startsWith('/login');
  const isOnDashboard = path.startsWith('/dashboard');
  const isOnPortal = path.startsWith('/portal');
  const isAcceptInvite = path.startsWith('/portal/accept-invite');

  // Allow unauthenticated access to accept-invite page
  if (isAcceptInvite) return NextResponse.next();

  // Redirect to login if not authenticated and trying to access protected routes
  if (!isLoggedIn && (isOnDashboard || isOnPortal)) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Client role: always redirect to portal (from dashboard or login)
  if (isLoggedIn && role === 'Client' && (isOnDashboard || isOnAuthPage)) {
    return NextResponse.redirect(new URL('/portal', req.url));
  }

  // Internal roles: redirect from login to dashboard
  if (isLoggedIn && role !== 'Client' && isOnAuthPage) {
    return NextResponse.redirect(new URL('/dashboard/issue-logging', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};
