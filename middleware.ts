import { authEdge } from '@/lib/auth-edge';
import { NextResponse } from 'next/server';

export default authEdge((req) => {
  const isLoggedIn = !!req.auth;
  const isOnAuthPage = req.nextUrl.pathname.startsWith('/login');
  const isOnDashboard = req.nextUrl.pathname.startsWith('/dashboard');

  // Redirect to login if not authenticated
  if (!isLoggedIn && isOnDashboard) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Redirect to dashboard if already logged in
  if (isLoggedIn && isOnAuthPage) {
    return NextResponse.redirect(new URL('/dashboard/issue-logging', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};
